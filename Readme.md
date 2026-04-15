# 📦 Smart Inventory — AWS Deployment Guide

A serverless inventory system: **Amplify → API Gateway → Lambda → RDS PostgreSQL + DynamoDB**, with out-of-stock SNS alerts via **EventBridge Scheduler**.

---

## Architecture Overview

```mermaid
flowchart TD
    User(["👤 User Browser"])
    Amplify["☁️ AWS Amplify\n(Frontend React)"]
    APIGW["🔀 API Gateway\nREST API — /barang"]
    LambdaMain["λ inventory-api\nlambda_inventory_management"]
    RDS[("🐘 RDS PostgreSQL\ninventory_db.barang")]
    DynamoDB[("⚡ DynamoDB\ninventory-activity-log")]
    EventBridge["⏰ EventBridge Scheduler\ncron — every 1 hour"]
    LambdaChecker["λ inventory-low-stock-checker\nlambda_low_stock_checker"]
    SNS["📣 SNS Topic\ninventory-low-stock-alert"]
    AdminEmail(["📧 Admin Email"])

    User -->|HTTPS| Amplify
    Amplify -->|REST API calls| APIGW
    APIGW -->|invoke| LambdaMain
    LambdaMain -->|"CRUD\n(stok, nama)"| RDS
    LambdaMain -->|"Log activity\n(STOCK_IN/OUT)"| DynamoDB

    EventBridge -->|"trigger every hour"| LambdaChecker
    LambdaChecker -->|"SELECT stok <= 0"| RDS
    LambdaChecker -->|"publish alert\n(if out-of-stock items found)"| SNS
    SNS -->|email notification| AdminEmail

    style Amplify fill:#232f3e,color:#ff9900,stroke:#ff9900
    style APIGW fill:#232f3e,color:#e7157b,stroke:#e7157b
    style LambdaMain fill:#232f3e,color:#ff9900,stroke:#ff9900
    style LambdaChecker fill:#232f3e,color:#ff9900,stroke:#ff9900
    style RDS fill:#232f3e,color:#3f8624,stroke:#3f8624
    style DynamoDB fill:#232f3e,color:#4d27aa,stroke:#4d27aa
    style EventBridge fill:#232f3e,color:#e7157b,stroke:#e7157b
    style SNS fill:#232f3e,color:#e7157b,stroke:#e7157b
```

---

## Prerequisites

- AWS Academy account
- Node.js 18+ and npm
- Git

---

## Step 0 — VPC & Networking

Create a **VPC** with the following configuration:
- **Name**: `inventory-vpc`
- **IPv4 CIDR**: `10.0.0.0/16`
- **NAT Gateway**: None
- Create **2 private subnets** in different Availability Zones:
  - `private-subnet-1`: `10.0.1.0/24`
  - `private-subnet-2`: `10.0.2.0/24`
- Attach an **Internet Gateway** to the VPC

> Lambda and RDS will be placed in the **private subnets**. Without a NAT gateway, Lambda can reach resources inside the VPC (like RDS), but **not** public internet services.

**Security Groups** — create both inside `inventory-vpc`:

`lambda-sg`
- Inbound: none
- Outbound: all traffic `0.0.0.0/0`

`rds-sg`
- Inbound: TCP port `5432`, source `lambda-sg`
- Outbound: none

---

## Step 1 — RDS PostgreSQL

Create an RDS instance:
- Engine: PostgreSQL 16, Template: Free tier
- Identifier: `inventory-db`, Username: `postgres`
- **VPC**: `inventory-vpc`, Subnets: `private-subnet-1` and `private-subnet-2`
- Public access: **No**
- Security group: `rds-sg`

Once `Available`, copy the **Endpoint**.

**Connect to RDS via CloudShell (VPC mode):**

Open CloudShell, then enable VPC mode: **Actions → Enable VPC networking** → select `inventory-vpc` and a private subnet. Then:

```bash
sudo dnf install -y postgresql15
psql -h <RDS_ENDPOINT> -U postgres
```

```sql
CREATE DATABASE inventory_db;
\l
\c inventory_db

CREATE TABLE barang (
    id         SERIAL PRIMARY KEY,
    nama       VARCHAR(100) NOT NULL,
    stok       INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\dt
\q
```

---

## Step 2 — DynamoDB

Create table `inventory-activity-log`:
- Partition key: `log_id` (String)
- Billing: On-demand

Add a **Global Secondary Index (GSI)**:
- Partition key: `barang_id` (String)
- Index name: `barang_id-index`

---

## Step 3 — SNS

Create a Standard topic `inventory-low-stock-alert`. Subscribe with **Email** protocol and confirm the subscription from your inbox. Note the **Topic ARN**.

---

## Step 4 — Lambda Layer (psycopg2)

In **CloudShell**:

```bash
sudo dnf install -y python3.12 python3.12-pip
mkdir -p python
python3.12 -m pip install psycopg2-binary -t python/ --quiet
zip -r layer.zip python/
```

Download `layer.zip` (right-click → Download). Upload to **Lambda → Layers**:
- Name: `psycopg2-layer`, Compatible runtime: `Python 3.12`

Copy the **Layer ARN** after creation.

---

## Step 5 — Lambda Functions

### `inventory-api`

| Setting | Value |
|---------|-------|
| Runtime | Python 3.12 |
| Execution role | `LabRole` |
| Handler | `lambda_inventory_management.handler` |
| Timeout | 30 seconds |
| Layer | `psycopg2-layer` |
| VPC | `inventory-vpc` |
| Subnets | `private-subnet-1`, `private-subnet-2` |
| Security group | `lambda-sg` |

Upload `lambda_inventory_management.py` as a zip. Environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_HOST` | RDS endpoint |
| `DATABASE_NAME` | `inventory_db` |
| `DATABASE_USER` | `postgres` |
| `DATABASE_PASS` | RDS password |
| `DYNAMO_TABLE` | `inventory-activity-log` |

### `inventory-low-stock-checker`

| Setting | Value |
|---------|-------|
| Runtime | Python 3.12 |
| Execution role | `LabRole` |
| Handler | `lambda_low_stock_checker.handler` |
| Timeout | 30 seconds |
| Layer | `psycopg2-layer` |
| VPC | `inventory-vpc` |
| Subnets | `private-subnet-1`, `private-subnet-2` |
| Security group | `lambda-sg` |

Upload `lambda_low_stock_checker.py` as a zip. Environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_HOST` | RDS endpoint |
| `DATABASE_NAME` | `inventory_db` |
| `DATABASE_USER` | `postgres` |
| `DATABASE_PASS` | RDS password |
| `SNS_TOPIC_ARN` | SNS Topic ARN |

---

## Step 6 — EventBridge Schedule

Create schedule `inventory-hourly-check`:
- Pattern: `cron(0 * * * ? *)`
- Target: `inventory-low-stock-checker` Lambda

---

## Step 7 — API Gateway

Create REST API `inventory-api` (Regional). Create the following methods, all pointing to the `inventory-api` Lambda:

| Method | Resource |
|--------|----------|
| GET | `/barang` |
| POST | `/barang` |
| PUT | `/barang/{id}` |
| DELETE | `/barang/{id}` |
| GET | `/barang/{id}/history` |

Enable CORS on all resources. Deploy to stage `prod`. Copy the **Invoke URL**.

---

## Step 8 — Frontend Environment Variable

**Local:**
```bash
cd frontend
cp .env.example .env
# Set REACT_APP_API_URL=<Invoke URL>/barang
```

**Production (Amplify):** Add `REACT_APP_API_URL` in Amplify Console → App settings → Environment variables.

---

## Step 9 — Deploy to Amplify

Push code to GitHub and connect the repository to **AWS Amplify**. Build configuration:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend && npm install
    build:
      commands:
        - cd frontend && npm run build
  artifacts:
    baseDirectory: frontend/build
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

---

## Verification

After deploying, test each feature end-to-end:
- Items load from RDS via API Gateway
- Add, update, and delete items work correctly
- Activity log shows history from DynamoDB
- Items with `stok = 0` display a red **Habis** badge
- Manually invoke `inventory-low-stock-checker` and verify SNS email is received

Check **CloudWatch Logs** for each Lambda to debug errors.

---