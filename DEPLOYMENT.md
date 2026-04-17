# デプロイ手順書

## 前提条件

### 必要なツール

1. **Go 1.21以上**
   ```bash
   # Goのインストール確認
   go version

   # インストールされていない場合
   # https://go.dev/dl/ からダウンロード
   ```

2. **Terraform 1.5.0以上**
   ```bash
   # Terraformのインストール確認
   terraform version

   # インストールされていない場合
   # https://developer.hashicorp.com/terraform/downloads
   ```

3. **AWS CLI v2**
   ```bash
   # AWS CLIのインストール確認
   aws --version

   # AWSプロファイル設定
   aws configure
   ```

4. **Node.js 18以上** (フロントエンドビルド用)
   ```bash
   node --version
   npm --version
   ```

### AWS設定

- AWSアカウント
- 適切なIAM権限 (Lambda, API Gateway, DynamoDB, Cognito, SES, S3, CloudFront)
- AWS CLIでプロファイル設定済み

---

## デプロイ手順

### 1. Lambda関数のビルド

```bash
# プロジェクトルートで実行
./scripts/build-lambdas.sh
```

ビルド成功時の出力:
```
========================================
ビルド完了
========================================
成功: 41個
失敗: 0個

全Lambda関数のビルドが完了しました！
Artifacts: /project/zebra-application/lambda-artifacts
```

生成されるファイル:
- `lambda-artifacts/*.zip` (41個のLambda関数)

### 2. SESメールアドレスの検証

デプロイ前にSESで送信元メールアドレスを検証する必要があります。

```bash
# AWS CLIでメールアドレス検証リクエストを送信
aws ses verify-email-identity \
  --email-address noreply@studio-zebra.com \
  --region ap-northeast-1
```

**重要**: 検証メールが `noreply@studio-zebra.com` に送信されます。メール内のリンクをクリックして検証を完了してください。

検証状態の確認:
```bash
aws ses get-identity-verification-attributes \
  --identities noreply@studio-zebra.com \
  --region ap-northeast-1
```

出力で `VerificationStatus: "Success"` となっていればOKです。

### 3. Terraform変数の設定

`terraform/environments/dev/terraform.tfvars` を作成:

```hcl
# 環境設定
environment = "dev"
aws_region  = "ap-northeast-1"

# Lambda artifacts
lambda_artifacts_dir = "../../../lambda-artifacts"

# アラーム通知先メールアドレス
alarm_email = "your-email@example.com"

# SES設定
ses_sender_email       = "noreply@studio-zebra.com"
ses_notification_email = "your-email@example.com"  # バウンス通知先

# ゲスト予約URL (CloudFrontデプロイ後に更新)
guest_reservation_url = "https://XXXXXXXX.cloudfront.net/reservations/guest"

# CloudFront価格クラス
cloudfront_price_class = "PriceClass_200"
```

### 4. Terraformの初期化

```bash
cd terraform/environments/dev

# 初回のみ実行
terraform init
```

### 5. Terraform planの実行

```bash
terraform plan
```

作成されるリソースを確認:
- DynamoDBテーブル (7個)
- Cognito User Pool
- Lambda関数 (41個)
- API Gateway
- EventBridge (バッチ処理)
- SES設定
- S3バケット (フロントエンド用)
- CloudFront Distribution

### 6. Terraformのapply

```bash
terraform apply
```

`yes` を入力して実行。

デプロイ完了後、以下の情報が出力されます:

```
Outputs:

api_gateway_invoke_url = "https://XXXXXXXXXX.execute-api.ap-northeast-1.amazonaws.com/dev"
cognito_user_pool_id = "ap-northeast-1_XXXXXXXXX"
cognito_user_pool_client_id = "XXXXXXXXXXXXXXXXXXXXXXXXXX"
frontend_cloudfront_url = "https://XXXXXXXXXXXXXX.cloudfront.net"
frontend_s3_bucket = "dev-zebra-frontend"
ses_email_identity = "noreply@studio-zebra.com"
...
```

### 7. 環境変数の更新（CloudFront URL）

terraform apply完了後、`guest_reservation_url` を更新:

1. `terraform.tfvars` を編集:
   ```hcl
   guest_reservation_url = "https://XXXXXXXXXXXXXX.cloudfront.net/reservations/guest"
   ```

2. 再度apply:
   ```bash
   terraform apply
   ```

### 8. フロントエンドのビルド・デプロイ

```bash
cd ../../../frontend

# 依存関係インストール
npm install

# 環境変数設定
cat > .env.production <<EOF
VITE_API_BASE_URL=https://XXXXXXXXXX.execute-api.ap-northeast-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_STUDIO_ID=studio_001
EOF

# ビルド
npm run build

# S3にアップロード
aws s3 sync dist/ s3://dev-zebra-frontend/ \
  --delete \
  --cache-control "public, max-age=3600"

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id XXXXXXXXXXXXXX \
  --paths "/*"
```

### 9. 初期データの投入

DynamoDBにスタジオ情報、料金プラン、オプションの初期データを投入します。

```bash
cd ../scripts

# dev環境にデータ投入
./seed-initial-data.sh dev
```

このスクリプトは以下のデータを投入します:

**スタジオ情報** (`seed-data/studio.json`):
- studio_001（スタジオゼブラ）
- 営業時間: 09:00-22:00
- 定休日: 月曜日
- 仮予約有効期限: 7日

**料金プラン** (`seed-data/plans.json`):
- スチール撮影プラン（3時間, 15,000円）
- 動画撮影プラン（4時間, 25,000円）
- ロケハンプラン（1時間, 無料）
- ワークショッププラン（5時間, 30,000円）

**オプション** (`seed-data/options.json`):
- 6人以上のワークショップ（5,000円）
- 機材レンタル（3,000円）
- 延長料金（5,000円/時間）

#### データ投入の確認

```bash
# スタジオ情報の確認
aws dynamodb scan --table-name dev-zebra-studios --region ap-northeast-1

# プラン一覧の確認
aws dynamodb scan --table-name dev-zebra-plans --region ap-northeast-1

# オプション一覧の確認
aws dynamodb scan --table-name dev-zebra-options --region ap-northeast-1
```

#### 初期データのカスタマイズ

投入するデータを変更したい場合は、以下のファイルを編集してください:

- `scripts/seed-data/studio.json` - スタジオ情報
- `scripts/seed-data/plans.json` - 料金プラン
- `scripts/seed-data/options.json` - オプション

編集後、再度スクリプトを実行すると上書きされます（DynamoDBの`put-item`と`batch-write-item`を使用）。

### 10. 動作確認

#### フロントエンド
```bash
# ブラウザでアクセス
https://XXXXXXXXXXXXXX.cloudfront.net
```

#### API
```bash
# ヘルスチェック
curl https://XXXXXXXXXX.execute-api.ap-northeast-1.amazonaws.com/dev/health

# プラン一覧取得
curl https://XXXXXXXXXX.execute-api.ap-northeast-1.amazonaws.com/dev/studios/studio_001/plans
```

---

## トラブルシューティング

### Lambda関数のビルドエラー

```bash
# Go依存関係の更新
cd backend
go mod tidy
go mod download
```

### SESメール送信エラー

```bash
# SES検証状態を確認
aws ses get-identity-verification-attributes \
  --identities noreply@studio-zebra.com

# サンドボックスモードの確認（prodでは本番申請が必要）
aws ses get-account-sending-enabled
```

### CloudFront反映が遅い

CloudFrontの変更反映には最大15分かかります。

キャッシュ無効化:
```bash
aws cloudfront create-invalidation \
  --distribution-id XXXXXXXXXXXXXX \
  --paths "/*"
```

### DynamoDBテーブルアクセスエラー

Lambda実行ロールの権限を確認:
```bash
# Lambda関数のロールを確認
aws lambda get-function --function-name dev-reservation-create

# ロールにDynamoDB権限があるか確認
aws iam get-role-policy \
  --role-name dev-zebra-lambda-execution-role \
  --policy-name dev-lambda-dynamodb-policy
```

---

## デプロイ後の設定

### 1. 管理者ユーザーの作成

Cognitoで管理者ユーザーを作成:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ap-northeast-1_XXXXXXXXX \
  --username admin@studio-zebra.com \
  --user-attributes Name=email,Value=admin@studio-zebra.com Name=custom:role,Value=admin Name=custom:studio_id,Value=studio_001 \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

### 2. SES本番環境への移行（prod環境のみ）

開発環境ではSESはサンドボックスモードです。本番環境では以下の手順が必要:

1. AWSコンソール > SES > アカウント設定
2. 「本番環境アクセスをリクエスト」をクリック
3. 申請理由を記入して送信
4. 承認後（通常24時間以内）、任意のメールアドレスに送信可能

---

## 更新・再デプロイ

### Lambda関数の更新

```bash
# ビルド
./scripts/build-lambdas.sh

# Terraform apply
cd terraform/environments/dev
terraform apply
```

### フロントエンドの更新

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://dev-zebra-frontend/ --delete
aws cloudfront create-invalidation --distribution-id XXXXXXXXXXXXXX --paths "/*"
```

---

## クリーンアップ（削除）

```bash
cd terraform/environments/dev

# S3バケットを空にする
aws s3 rm s3://dev-zebra-frontend/ --recursive

# Terraformで削除
terraform destroy
```

**警告**: この操作は全てのリソースを削除します。DynamoDBのデータも全て失われます。

---

## 参考リンク

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda Go Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-golang.html)
- [Amazon SES Documentation](https://docs.aws.amazon.com/ses/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
