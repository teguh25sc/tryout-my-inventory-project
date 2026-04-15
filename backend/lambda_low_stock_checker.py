import json
import psycopg2
import boto3
import os
from datetime import datetime

# Load config from Environment Variables
DB_HOST = os.environ.get('DATABASE_HOST')
DB_NAME = os.environ.get('DATABASE_NAME')
DB_USER = os.environ.get('DATABASE_USER')
DB_PASS = os.environ.get('DATABASE_PASS')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

sns_client = boto3.client('sns', region_name='us-west-2')

def handler(event, context):
    """
    Lambda triggered by EventBridge Scheduler (cron every hour).
    Checks all items in RDS with stock = 0 and sends a single
    SNS notification to the admin listing all out-of-stock items.
    """
    print(f"[{datetime.now().isoformat()}] Low-stock checker triggered by EventBridge.")

    # 1. Connect to RDS PostgreSQL
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=5
        )
        cursor = conn.cursor()
        print("RDS connection successful.")
    except Exception as e:
        print(f"ERROR: RDS connection failed: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"RDS connection failed: {str(e)}"})
        }

    # 2. Query items with stock = 0
    try:
        cursor.execute(
            "SELECT id, nama, stok FROM barang WHERE stok <= 0 ORDER BY id ASC"
        )
        out_of_stock_items = cursor.fetchall()
        print(f"Found {len(out_of_stock_items)} out-of-stock item(s).")
    except Exception as e:
        print(f"ERROR: Query failed: {str(e)}")
        cursor.close()
        conn.close()
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Query failed: {str(e)}"})
        }
    finally:
        cursor.close()
        conn.close()

    # 3. If there are out-of-stock items, publish a single SNS notification
    if out_of_stock_items:
        item_list_str = "\n".join(
            [f"  - [{item[0]}] {item[1]} (stok: {item[2]})" for item in out_of_stock_items]
        )

        message = (
            f"⚠️  PERINGATAN STOK HABIS — TINDAKAN DIPERLUKAN\n"
            f"{'='*50}\n"
            f"Tanggal/Waktu : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC\n\n"
            f"Barang berikut memiliki stok KOSONG (≤ 0) dan perlu segera diisi ulang:\n\n"
            f"{item_list_str}\n\n"
            f"{'='*50}\n"
            f"Segera lakukan restocking untuk menghindari gangguan operasional.\n"
            f"[Pesan otomatis dari Sistem Inventaris — jangan balas email ini]"
        )

        subject = f"[INVENTORY ALERT] {len(out_of_stock_items)} Barang Stok Kosong — Perlu Restocking"

        try:
            response = sns_client.publish(
                TopicArn=SNS_TOPIC_ARN,
                Message=message,
                Subject=subject
            )
            message_id = response.get('MessageId', 'unknown')
            print(f"SNS notification sent successfully. MessageId: {message_id}")

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "status": "notification_sent",
                    "out_of_stock_count": len(out_of_stock_items),
                    "sns_message_id": message_id,
                    "items": [
                        {"id": item[0], "nama": item[1], "stok": item[2]}
                        for item in out_of_stock_items
                    ]
                })
            }
        except Exception as e:
            print(f"ERROR: Failed to publish SNS: {str(e)}")
            return {
                "statusCode": 500,
                "body": json.dumps({"error": f"SNS publish failed: {str(e)}"})
            }
    else:
        # No out-of-stock items — nothing to do
        print("All items have sufficient stock. No SNS notification sent.")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "all_ok",
                "out_of_stock_count": 0,
                "message": "All items have sufficient stock."
            })
        }
