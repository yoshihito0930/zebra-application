# デプロイガイド

このドキュメントは、スタジオゼブラ予約管理アプリケーションのバックエンド（Lambda関数群）をAWSにデプロイする手順をまとめたものです。

**最終更新日**: 2026-04-13

---

## 前提条件

- AWS CLIがインストール済み（バージョン2.x以上）
- Go 1.21以上がインストール済み
- Terraformがインストール済み（バージョン1.5以上）
- AWSアカウントが作成済み
- IAMユーザーまたはIAMロールで適切な権限が付与されている

---

## ディレクトリ構造

```
zebra-application/
├── backend/
│   ├── cmd/                    # Lambda関数のエントリーポイント
│   │   ├── auth-signup/
│   │   ├── auth-login/
│   │   ├── calendar-get/
│   │   ├── plans-list/
│   │   ├── reservation-create/
│   │   ├── reservation-list-me/
│   │   ├── reservation-get/
│   │   ├── reservation-update/
│   │   ├── reservation-cancel/
│   │   ├── reservation-list/
│   │   ├── reservation-approve/
│   │   └── batch-tentative-expiry/
│   ├── internal/               # 内部パッケージ
│   ├── pkg/                    # 外部公開パッケージ
│   ├── go.mod
│   └── go.sum
├── terraform/                  # インフラコード（後で作成）
└── docs/
```

---

## ステップ1: 環境変数の設定

### 1.1 ローカル開発環境

ローカルでテストする場合、以下の環境変数を設定します:

```bash
# .env ファイルを作成（gitignoreに追加すること）
export AWS_REGION=ap-northeast-1
export AWS_PROFILE=your-profile-name

# モック認証用のJWT署名鍵（開発環境のみ）
export JWT_SECRET=your-dev-secret-key-change-this-in-production

# DynamoDBテーブル名（環境ごとに異なる）
export TABLE_PREFIX=zebra-dev

# 認証タイプ（mock または cognito）
export AUTH_TYPE=mock
```

### 1.2 Lambda環境変数

Lambda関数にデプロイする際、以下の環境変数を設定します:

| 環境変数名 | 説明 | 例 |
|-----------|------|-----|
| AWS_REGION | AWSリージョン | ap-northeast-1 |
| JWT_SECRET | JWT署名鍵（モック認証用） | your-secret-key |
| AUTH_TYPE | 認証タイプ（mock/cognito） | mock |
| TABLE_PREFIX | DynamoDBテーブルのプレフィックス | zebra-dev |
| LOG_LEVEL | ログレベル（DEBUG/INFO/WARN/ERROR） | INFO |

**重要**: 本番環境では、JWT_SECRETはAWS Secrets Managerに格納することを推奨します。

---

## ステップ2: Lambda関数のビルド

### 2.1 個別ビルド

各Lambda関数を個別にビルドする場合:

```bash
cd backend

# auth-signupをビルド
cd cmd/auth-signup
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip function.zip bootstrap
cd ../..

# auth-loginをビルド
cd cmd/auth-login
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip function.zip bootstrap
cd ../..

# 他の関数も同様にビルド...
```

### 2.2 一括ビルドスクリプト

すべてのLambda関数を一括でビルドするスクリプトを作成:

```bash
#!/bin/bash
# backend/build-all.sh

set -e

FUNCTIONS=(
  "auth-signup"
  "auth-login"
  "calendar-get"
  "plans-list"
  "reservation-create"
  "reservation-list-me"
  "reservation-get"
  "reservation-update"
  "reservation-cancel"
  "reservation-list"
  "reservation-approve"
  "batch-tentative-expiry"
)

echo "Building all Lambda functions..."

for func in "${FUNCTIONS[@]}"; do
  echo "Building $func..."
  cd cmd/$func
  GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
  zip function.zip bootstrap
  echo "✓ $func built successfully"
  cd ../..
done

echo "All functions built successfully!"
```

実行:

```bash
cd backend
chmod +x build-all.sh
./build-all.sh
```

---

## ステップ3: Terraformでインフラをデプロイ

### 3.1 Terraformディレクトリ構造（作成が必要）

```
terraform/
├── modules/
│   ├── lambda/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── dynamodb/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── api-gateway/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
└── backend.tf
```

### 3.2 Lambda関数のTerraform例

```hcl
# terraform/modules/lambda/main.tf

resource "aws_lambda_function" "function" {
  function_name = var.function_name
  role          = var.lambda_role_arn
  handler       = "bootstrap"
  runtime       = "provided.al2"

  filename         = var.zip_file
  source_code_hash = filebase64sha256(var.zip_file)

  environment {
    variables = var.environment_variables
  }

  timeout     = var.timeout
  memory_size = var.memory_size
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*/*"
}
```

### 3.3 Terraformのデプロイ

```bash
cd terraform/environments/dev

# 初期化
terraform init

# プランの確認
terraform plan

# デプロイ
terraform apply
```

---

## ステップ4: API Gatewayの設定

### 4.1 エンドポイント一覧

| メソッド | パス | Lambda関数 | 認証 |
|---------|------|-----------|------|
| POST | /auth/signup | auth-signup | 不要 |
| POST | /auth/login | auth-login | 不要 |
| GET | /studios/{id}/calendar | calendar-get | 不要 |
| GET | /studios/{id}/plans | plans-list | 不要 |
| POST | /reservations | reservation-create | 要 |
| GET | /reservations/me | reservation-list-me | 要 |
| GET | /reservations/{id} | reservation-get | 要 |
| PATCH | /reservations/{id} | reservation-update | 要 |
| PATCH | /reservations/{id}/cancel | reservation-cancel | 要 |
| GET | /reservations | reservation-list | 要 |
| PATCH | /reservations/{id}/approve | reservation-approve | 要 |

### 4.2 CORSの設定

すべてのエンドポイントでCORSを有効化:

```hcl
# terraform/modules/api-gateway/main.tf

resource "aws_api_gateway_rest_api" "api" {
  name        = "zebra-api-${var.environment}"
  description = "Studio Zebra Reservation API"
}

# CORSヘッダーの設定
resource "aws_api_gateway_gateway_response" "cors" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}
```

---

## ステップ5: DynamoDBテーブルの作成

### 5.1 テーブル一覧

| テーブル名 | PK | SK | GSI |
|-----------|----|----|-----|
| reservations | studio_id | date#reservation_id | GSI1(status), GSI2(user_id), GSI3(reservation_id) |
| users | user_id | - | GSI1(email) |
| plans | studio_id | plan_id | なし |
| options | studio_id | option_id | なし |
| blocked_slots | studio_id | date#blocked_slot_id | なし |
| inquiries | studio_id | inquiry_id | GSI1(status), GSI2(user_id) |
| notifications | studio_id | scheduled_at#notification_id | なし |

### 5.2 reservationsテーブルのTerraform例

```hcl
# terraform/modules/dynamodb/main.tf

resource "aws_dynamodb_table" "reservations" {
  name         = "${var.table_prefix}-reservations"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "studio_id"
  range_key = "date_reservation_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "date_reservation_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "reservation_id"
    type = "S"
  }

  # GSI1: ステータス別検索
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "studio_id"
    range_key       = "status"
    projection_type = "ALL"
  }

  # GSI2: ユーザー別検索
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "user_id"
    range_key       = "date_reservation_id"
    projection_type = "ALL"
  }

  # GSI3: 予約ID検索
  global_secondary_index {
    name            = "GSI3"
    hash_key        = "reservation_id"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
  }
}
```

---

## ステップ6: EventBridgeでバッチ処理を設定

### 6.1 仮予約期限切れバッチの設定

```hcl
# terraform/modules/eventbridge/main.tf

resource "aws_cloudwatch_event_rule" "tentative_expiry" {
  name                = "zebra-tentative-expiry-${var.environment}"
  description         = "Trigger tentative reservation expiry batch daily"
  schedule_expression = "cron(0 17 * * ? *)" # 毎日午前2時（JST）= UTC 17時
}

resource "aws_cloudwatch_event_target" "tentative_expiry" {
  rule      = aws_cloudwatch_event_rule.tentative_expiry.name
  target_id = "TentativeExpiryLambda"
  arn       = aws_lambda_function.batch_tentative_expiry.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.batch_tentative_expiry.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.tentative_expiry.arn
}
```

---

## ステップ7: IAMロールの設定

### 7.1 Lambda実行ロール

```hcl
# terraform/modules/iam/main.tf

resource "aws_iam_role" "lambda_execution" {
  name = "zebra-lambda-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "lambda-dynamodb-access"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.table_prefix}-*"
      }
    ]
  })
}
```

---

## ステップ8: テストとデプロイ確認

### 8.1 ローカルテスト（AWS SAM）

AWS SAMを使用してローカルでテスト:

```bash
# SAMテンプレートを作成（template.yaml）
sam local start-api

# APIをテスト
curl http://localhost:3000/auth/signup -X POST -d '{"name":"Test","email":"test@example.com","password":"password123","phone_number":"090-1234-5678","address":"Tokyo"}'
```

### 8.2 デプロイ後の動作確認

```bash
# API Gatewayのエンドポイントを取得
terraform output api_gateway_url

# サインアップAPIをテスト
curl https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"山田太郎","email":"yamada@example.com","password":"password123","phone_number":"090-1234-5678","address":"東京都"}'

# ログインAPIをテスト
curl https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"yamada@example.com","password":"password123"}'
```

### 8.3 CloudWatch Logsで確認

```bash
# ログを確認
aws logs tail /aws/lambda/zebra-auth-signup-dev --follow
```

---

## ステップ9: CI/CDの設定（GitHub Actions）

### 9.1 GitHub Actionsワークフロー例

```yaml
# .github/workflows/deploy.yml

name: Deploy Backend

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Build Lambda functions
        run: |
          cd backend
          chmod +x build-all.sh
          ./build-all.sh

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Init
        run: |
          cd terraform/environments/dev
          terraform init

      - name: Terraform Plan
        run: |
          cd terraform/environments/dev
          terraform plan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: |
          cd terraform/environments/dev
          terraform apply -auto-approve
```

---

## トラブルシューティング

### Q1: Lambda関数がDynamoDBにアクセスできない

**原因**: IAMロールにDynamoDBへのアクセス権限がない

**解決策**:
- Lambda実行ロールに `dynamodb:GetItem`, `dynamodb:PutItem` などの権限を付与
- Terraformの `aws_iam_role_policy` を確認

### Q2: API Gatewayで500エラーが発生する

**原因**: Lambda関数内でエラーが発生している

**解決策**:
- CloudWatch Logsでエラーログを確認: `aws logs tail /aws/lambda/function-name --follow`
- Lambda関数のコードでエラーハンドリングを確認

### Q3: CORSエラーが発生する

**原因**: API GatewayのCORS設定が不足している

**解決策**:
- すべてのエンドポイントにOPTIONSメソッドを追加
- レスポンスヘッダーに `Access-Control-Allow-Origin: *` を追加

---

## 参照ドキュメント

- [AWS Lambda Go SDK](https://github.com/aws/aws-lambda-go)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS API Gateway](https://docs.aws.amazon.com/apigateway/)
- [AWS DynamoDB](https://docs.aws.amazon.com/dynamodb/)

---

**最終更新日**: 2026-04-13
