# フロントエンドデプロイ手順書

## 目次
- [概要](#概要)
- [初回セットアップ](#初回セットアップ)
- [デプロイ方法](#デプロイ方法)
- [GitHub Actionsの設定](#github-actionsの設定)
- [カスタムドメイン設定](#カスタムドメイン設定)
- [トラブルシューティング](#トラブルシューティング)

---

## 概要

フロントエンド（React + Vite）をAWS上にデプロイするための手順書です。

**デプロイ先**:
- S3バケット（静的ファイルホスティング）
- CloudFront（CDN配信）

**デプロイ方法**:
1. **手動デプロイ**: ローカルから `scripts/deploy-frontend.sh` を実行
2. **自動デプロイ**: GitHub Actionsで `main` ブランチへのpush時に自動実行

---

## 初回セットアップ

### 1. Terraformでインフラ構築

まず、Terraformで必要なAWSリソースを構築します。

```bash
cd terraform/environments/dev

# 初回のみ: Terraform初期化
terraform init

# インフラ構築
terraform apply
```

**作成されるリソース**:
- S3バケット（フロントエンド用）
- CloudFront Distribution
- GitHub Actions用IAMロール（OIDC認証）

### 2. GitHub Secretsの設定

GitHub ActionsからAWSにアクセスするため、以下のSecretを設定します。

**必要なSecret**:
| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `AWS_ROLE_ARN` | GitHub Actions用IAMロールARN | `terraform output -raw github_actions_role_arn` |

**設定手順**:

1. GitHubリポジトリの `Settings` → `Secrets and variables` → `Actions` を開く
2. `New repository secret` をクリック
3. 以下を設定:
   - Name: `AWS_ROLE_ARN`
   - Secret: Terraform outputで取得したIAMロールARN

```bash
# IAMロールARNの取得
cd terraform/environments/dev
terraform output -raw github_actions_role_arn
```

### 3. GitHubリポジトリ名の設定

`terraform/environments/dev/variables.tf` で `github_repository` 変数を実際のリポジトリ名に変更してください。

```hcl
variable "github_repository" {
  description = "GitHubリポジトリ名（例: owner/repo-name）"
  type        = string
  default     = "your-org/zebra-application"  # ← ここを変更
}
```

変更後、再度 `terraform apply` を実行してください。

---

## デプロイ方法

### 方法1: 手動デプロイ（ローカルから）

ローカル環境からデプロイスクリプトを実行します。

**前提条件**:
- AWS CLI がインストール済み
- AWS認証情報が設定済み（`aws configure` または環境変数）
- Node.js 20以上がインストール済み

**実行手順**:

```bash
# プロジェクトルートで実行
bash scripts/deploy-frontend.sh dev
```

**デプロイフロー**:
1. 環境変数ファイル生成（Terraform outputから）
2. 依存関係インストール（`npm ci`）
3. フロントエンドビルド（`npm run build`）
4. S3へアップロード
5. CloudFrontキャッシュ無効化

**完了後の確認**:

```bash
# CloudFront URLを確認
cd terraform/environments/dev
terraform output -raw frontend_cloudfront_url

# ブラウザでアクセス
open $(terraform output -raw frontend_cloudfront_url)
```

### 方法2: GitHub Actions（自動デプロイ）

`main` ブランチへのpush時に自動デプロイされます。

**トリガー条件**:
- `main` ブランチへのpush
- `frontend/**` 配下のファイルが変更された場合

**手動トリガー**:

GitHubの `Actions` タブから手動で実行することもできます。

1. GitHubリポジトリの `Actions` タブを開く
2. `Deploy Frontend to AWS (Dev)` ワークフローを選択
3. `Run workflow` をクリック

---

## GitHub Actionsの設定

### ワークフローファイル

`.github/workflows/deploy-frontend-dev.yml`

### 主要なステップ

1. **リポジトリチェックアウト**
2. **Node.jsセットアップ**（v20）
3. **AWS認証**（OIDC）
4. **Terraformセットアップ**（output取得用）
5. **依存関係インストール**
6. **Lintチェック**（エラー時はデプロイ中止）
7. **環境変数ファイル生成**
8. **フロントエンドビルド**
9. **S3アップロード**
10. **CloudFrontキャッシュ無効化**

### ワークフローのカスタマイズ

**Lintエラーでもデプロイを続行する場合**:

```yaml
- name: Run linter
  working-directory: frontend
  run: npm run lint
  continue-on-error: true  # false → true に変更
```

**Node.jsバージョンを変更する場合**:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # ← ここを変更（例: '18', '22'）
```

---

## カスタムドメイン設定

将来的にカスタムドメイン（例: `app.studio-zebra.com`）を使用する場合の手順です。

### 前提条件

1. ドメイン取得済み（例: `studio-zebra.com`）
2. Route53でホストゾーンを作成済み

### ステップ1: ACM証明書の発行

**重要**: CloudFrontで使用するACM証明書は **us-east-1 リージョン** で発行する必要があります。

```bash
# us-east-1 リージョンで証明書を発行
aws acm request-certificate \
  --domain-name "app.studio-zebra.com" \
  --validation-method DNS \
  --region us-east-1
```

**DNS検証レコードの追加**:

ACM証明書の発行時に表示されるDNS検証レコードをRoute53に追加してください。

### ステップ2: Terraform設定の変更

**`terraform/modules/frontend/variables.tf` に変数を追加**:

```hcl
variable "custom_domain" {
  description = "カスタムドメイン名（例: app.studio-zebra.com）"
  type        = string
  default     = null  # カスタムドメインを使用しない場合は null
}

variable "acm_certificate_arn" {
  description = "ACM証明書ARN（us-east-1リージョン）"
  type        = string
  default     = null
}

variable "route53_zone_name" {
  description = "Route53ホストゾーン名（例: studio-zebra.com）"
  type        = string
  default     = null
}
```

**`terraform/modules/frontend/main.tf` のコメントを解除**:

1. `viewer_certificate` ブロックのカスタムドメイン設定をコメント解除
2. デフォルトの `cloudfront_default_certificate = true` をコメントアウト
3. `aliases = [var.custom_domain]` をコメント解除
4. Route53レコード設定をコメント解除

**`terraform/environments/dev/main.tf` でモジュール呼び出し時に変数を追加**:

```hcl
module "frontend" {
  source = "../../modules/frontend"

  environment            = var.environment
  cloudfront_price_class = var.cloudfront_price_class

  # カスタムドメイン設定
  custom_domain        = "app.studio-zebra.com"
  acm_certificate_arn  = "arn:aws:acm:us-east-1:123456789012:certificate/xxx"
  route53_zone_name    = "studio-zebra.com"
}
```

### ステップ3: Terraformを適用

```bash
cd terraform/environments/dev
terraform apply
```

### ステップ4: DNSレコードの確認

Route53でAレコードが正しく設定されているか確認してください。

```bash
dig app.studio-zebra.com
```

### ステップ5: フロントエンドの環境変数を更新

カスタムドメインを使用する場合、CORS設定を更新する必要があります。

**バックエンドのCORS設定を更新**:

`backend/pkg/response/response.go` の `ALLOWED_ORIGIN` 環境変数を設定してください。

```hcl
# terraform/modules/lambda/main.tf
resource "aws_lambda_function" "example" {
  environment {
    variables = {
      ALLOWED_ORIGIN = "https://app.studio-zebra.com"  # カスタムドメイン
    }
  }
}
```

---

## トラブルシューティング

### 1. `terraform output` でエラーが発生する

**エラー**: `Error: An argument named "xxx" is not expected here.`

**原因**: `terraform apply` がまだ実行されていない、または失敗している。

**解決策**:

```bash
cd terraform/environments/dev
terraform init
terraform apply
```

### 2. GitHub Actionsで `Access Denied` エラーが発生する

**エラー**: `An error occurred (AccessDenied) when calling the PutObject operation`

**原因**: IAMロールの権限が不足している、またはOIDC認証が失敗している。

**解決策**:

1. GitHub Secretsで `AWS_ROLE_ARN` が正しく設定されているか確認
2. `terraform/environments/dev/variables.tf` の `github_repository` が正しいか確認
3. IAMロールのTrust Policyを確認

```bash
cd terraform/environments/dev
terraform apply  # IAMロール設定を再適用
```

### 3. CloudFrontで古いコンテンツが表示される

**原因**: CloudFrontのキャッシュが残っている。

**解決策**:

手動でキャッシュを無効化します。

```bash
# CloudFront Distribution IDを取得
cd terraform/environments/dev
DISTRIBUTION_ID=$(terraform output -raw frontend_cloudfront_distribution_id)

# キャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### 4. ビルドエラーが発生する

**エラー**: `npm run build` でエラーが発生する

**原因**: 環境変数が正しく設定されていない、または依存関係が不足している。

**解決策**:

```bash
cd frontend

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# 環境変数ファイルを確認
cat .env.production

# ビルドを再実行
npm run build
```

### 5. Lintエラーでデプロイが失敗する

**原因**: コードがLintルールに違反している。

**解決策**:

```bash
cd frontend

# Lintエラーを確認
npm run lint

# 自動修正
npm run lint -- --fix
```

---

## デプロイ後の確認事項

### 1. アクセスURLの確認

```bash
cd terraform/environments/dev
terraform output -raw frontend_cloudfront_url
```

### 2. ビルド成果物の確認

```bash
# S3バケット名を取得
S3_BUCKET=$(terraform output -raw frontend_s3_bucket)

# S3バケットの内容を確認
aws s3 ls s3://$S3_BUCKET --recursive
```

### 3. CloudFrontの状態確認

```bash
# Distribution IDを取得
DISTRIBUTION_ID=$(terraform output -raw frontend_cloudfront_distribution_id)

# Distribution情報を確認
aws cloudfront get-distribution --id $DISTRIBUTION_ID
```

### 4. キャッシュ無効化の進捗確認

```bash
# 最新の無効化リクエストを確認
aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID
```

---

## 運用時の注意事項

### キャッシュ戦略

**静的ファイル（JS、CSS、画像など）**:
- キャッシュ期間: 1年（`max-age=31536000`）
- ファイル名にハッシュが含まれるため、長期キャッシュが可能

**HTMLファイル**:
- キャッシュ期間: 5分（`max-age=300`）
- 短期キャッシュで最新のファイルをすぐに反映

### デプロイ頻度

**推奨デプロイタイミング**:
- バグ修正: 即座にデプロイ
- 機能追加: ステージング環境で検証後、本番デプロイ
- 定期メンテナンス: 週次または月次

### コスト管理

**主要なコスト要素**:
1. **CloudFront**: データ転送量に応じて課金
2. **S3**: ストレージ容量とリクエスト数に応じて課金
3. **CloudFrontキャッシュ無効化**: 1,000回まで無料、以降は有料

**コスト削減のヒント**:
- 不要なファイルは削除（`aws s3 sync` の `--delete` オプション使用済み）
- CloudFrontキャッシュ無効化は必要最小限に

---

## 関連ドキュメント

- [アーキテクチャ設計](architecture.md)
- [運用設計書](operations.md)
- [デザイン設計](design.md)

---

**最終更新日**: 2026-04-28
