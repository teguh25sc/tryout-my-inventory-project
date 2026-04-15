import json
import psycopg2
import boto3
import uuid
import os
from datetime import datetime

# Load configuration from Environment Variables
DB_HOST = os.environ.get('DATABASE_HOST')
DB_NAME = os.environ.get('DATABASE_NAME')
DB_USER = os.environ.get('DATABASE_USER')
DB_PASS = os.environ.get('DATABASE_PASS')
DYNAMO_TABLE = os.environ.get('DYNAMODB_TABLE')

# AWS clients
dynamodb = boto3.resource('dynamodb')
table_log = dynamodb.Table(DYNAMO_TABLE)

def handler(event, context):
    # 1. Koneksi ke PostgreSQL
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=5
        )
        cursor = conn.cursor()
    except Exception as e:
        return {
            "statusCode": 500, 
            "body": json.dumps({"error": f"Koneksi RDS Gagal: {str(e)}"})
        }

    # 2. Identify Request
    http_method = event.get('httpMethod')
    path_params = event.get('pathParameters') or {}
    item_id = path_params.get('id')

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        cursor.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization"
            },
            "body": ""
        }

    body = json.loads(event.get('body') or '{}')

    response_body = {}
    status_code = 200

    try:
        # --- READ ALL: GET /barang ---
        if http_method == 'GET' and not item_id:
            cursor.execute("SELECT id, nama, stok FROM barang ORDER BY id ASC")
            rows = cursor.fetchall()
            response_body = [{"id": r[0], "nama": r[1], "stok": r[2]} for r in rows]

        # --- READ HISTORY: GET /barang/<id>/history ---
        # (Asumsi di API Gateway kamu buat resource /barang/{id}/history)
        elif http_method == 'GET' and item_id and 'history' in event.get('path', ''):
            # Ambil history dari DynamoDB berdasarkan barang_id
            from boto3.dynamodb.conditions import Key
            response = table_log.query(
                IndexName='barang_id-index',
                KeyConditionExpression=Key('barang_id').eq(item_id)
            )
            response_body = response.get('Items', [])

        # --- CREATE: POST /barang ---
        elif http_method == 'POST':
            nama = body.get('nama', '').strip()
            if not nama:
                raise ValueError("Field 'nama' wajib diisi")
            stok_awal = int(body.get('stok', 0))
            cursor.execute(
                "INSERT INTO barang (nama, stok) VALUES (%s, %s) RETURNING id",
                (nama, stok_awal)
            )
            new_id = cursor.fetchone()[0]
            conn.commit()

            log_to_dynamo(str(new_id), 'INITIAL_STOCK', f"Stok awal: {stok_awal}")
            response_body = {"message": "Barang berhasil didaftarkan", "id": new_id}

        # --- UPDATE STOK (TAMBAH/KURANG): PUT /barang/<id> ---
        elif http_method == 'PUT' and item_id:
            aksi = body.get('action') # 'tambah' atau 'kurang'
            jumlah = int(body.get('jumlah', 0))

            # Ambil data stok saat ini
            cursor.execute("SELECT stok, nama FROM barang WHERE id = %s", (item_id,))
            barang = cursor.fetchone()
            
            if not barang:
                status_code = 404
                response_body = {"message": "Barang tidak ditemukan"}
            else:
                stok_sekarang = barang[0]
                nama_barang = barang[1]
                
                if aksi == 'tambah':
                    stok_baru = stok_sekarang + jumlah
                    label_aksi = "STOCK_IN"
                elif aksi == 'kurang':
                    if stok_sekarang < jumlah:
                        raise ValueError(f"Stok tidak mencukupi. Stok sekarang: {stok_sekarang}")
                    stok_baru = stok_sekarang - jumlah
                    label_aksi = "STOCK_OUT"
                else:
                    raise ValueError("Aksi tidak valid. Gunakan 'tambah' atau 'kurang'")

                # Update ke RDS
                cursor.execute("UPDATE barang SET stok = %s WHERE id = %s", (stok_baru, item_id))
                conn.commit()

                # Catat ke History DynamoDB
                log_to_dynamo(
                    item_id,
                    label_aksi,
                    f"{stok_sekarang} -> {stok_baru} (Jumlah: {jumlah})"
                )

                # NOTE: SNS notifications for out-of-stock items are handled
                # exclusively by the lambda_low_stock_checker Lambda,
                # which runs hourly via EventBridge Scheduler.

                response_body = {
                    "message": f"Berhasil {aksi} stok",
                    "id": item_id,
                    "nama": nama_barang,
                    "stok_lama": stok_sekarang,
                    "stok_baru": stok_baru
                }

        # --- DELETE: DELETE /barang/<id> ---
        elif http_method == 'DELETE' and item_id:
            cursor.execute("DELETE FROM barang WHERE id = %s", (item_id,))
            log_to_dynamo(item_id, 'DELETE', "Barang dihapus dari sistem")
            response_body = {"message": "Barang berhasil dihapus"}

    except Exception as e:
        status_code = 400
        response_body = {"error": str(e)}
    finally:
        cursor.close()
        conn.close()

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(response_body, default=str)
    }

def log_to_dynamo(barang_id, aksi, keterangan):
    """Mencatat setiap pergerakan stok ke DynamoDB"""
    table_log.put_item(Item={
        'log_id': str(uuid.uuid4()),
        'barang_id': str(barang_id),
        'aksi': aksi,
        'keterangan': keterangan,
        'timestamp': datetime.now().isoformat()
    })
