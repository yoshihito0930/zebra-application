#!/bin/bash

# フロントエンドデプロイスクリプト
# ビルド → S3アップロード → CloudFrontキャッシュ無効化

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 引数チェック
ENVIRONMENT=${1:-dev}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    log_error "環境名は 'dev' または 'prod' を指定してください"
    echo "使用方法: $0 [dev|prod]"
    exit 1
fi

log_info "デプロイ環境: $ENVIRONMENT"

# ディレクトリ確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform/environments/$ENVIRONMENT"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [[ ! -d "$TERRAFORM_DIR" ]]; then
    log_error "Terraformディレクトリが見つかりません: $TERRAFORM_DIR"
    exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
    log_error "フロントエンドディレクトリが見つかりません: $FRONTEND_DIR"
    exit 1
fi

# AWS CLI がインストールされているか確認
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI がインストールされていません"
    log_info "インストール方法: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Node.js がインストールされているか確認
if ! command -v node &> /dev/null; then
    log_error "Node.js がインストールされていません"
    exit 1
fi

# npm がインストールされているか確認
if ! command -v npm &> /dev/null; then
    log_error "npm がインストールされていません"
    exit 1
fi

# ==================== ステップ1: 環境変数ファイル生成 ====================
log_step "ステップ1: 環境変数ファイル生成"

log_info "環境変数生成スクリプトを実行..."
bash "$SCRIPT_DIR/generate-frontend-env.sh" "$ENVIRONMENT"

if [[ $? -ne 0 ]]; then
    log_error "環境変数ファイルの生成に失敗しました"
    exit 1
fi

# ==================== ステップ2: Terraform outputから値を取得 ====================
log_step "ステップ2: デプロイ先の情報取得"

cd "$TERRAFORM_DIR"

get_output() {
    local output_name=$1
    local value=$(terraform output -raw "$output_name" 2>/dev/null)
    if [[ $? -ne 0 || -z "$value" ]]; then
        log_error "Terraform output '$output_name' の取得に失敗しました"
        log_warn "terraform apply が実行されているか確認してください"
        exit 1
    fi
    echo "$value"
}

S3_BUCKET=$(get_output "frontend_s3_bucket")
CLOUDFRONT_DISTRIBUTION_ID=$(get_output "frontend_cloudfront_distribution_id")
CLOUDFRONT_URL=$(get_output "frontend_cloudfront_url")

log_info "S3バケット: $S3_BUCKET"
log_info "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
log_info "CloudFront URL: $CLOUDFRONT_URL"

# ==================== ステップ3: 依存関係のインストール ====================
log_step "ステップ3: 依存関係のインストール"

cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]]; then
    log_info "node_modules が存在しないため、依存関係をインストールします..."
    npm ci
else
    log_info "node_modules が存在します（スキップ）"
fi

# ==================== ステップ4: ビルド実行 ====================
log_step "ステップ4: フロントエンドビルド"

log_info "npm run build を実行中..."
npm run build

if [[ $? -ne 0 ]]; then
    log_error "ビルドに失敗しました"
    exit 1
fi

BUILD_DIR="$FRONTEND_DIR/dist"

if [[ ! -d "$BUILD_DIR" ]]; then
    log_error "ビルドディレクトリが見つかりません: $BUILD_DIR"
    exit 1
fi

log_info "✅ ビルドが完了しました: $BUILD_DIR"

# ビルドファイルの確認
log_info "ビルドファイル一覧:"
ls -lh "$BUILD_DIR" | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'

# ==================== ステップ5: S3へアップロード ====================
log_step "ステップ5: S3へアップロード"

log_info "S3バケット '$S3_BUCKET' にアップロード中..."

# S3 sync実行（削除フラグ付き）
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --exclude "*.html"

if [[ $? -ne 0 ]]; then
    log_error "S3へのアップロードに失敗しました（静的ファイル）"
    exit 1
fi

log_info "✅ 静的ファイルのアップロードが完了しました"

# HTMLファイルは短いキャッシュ時間で上書き
log_info "HTMLファイルをアップロード中（短いキャッシュ時間）..."
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --exclude "*" \
    --include "*.html" \
    --cache-control "public,max-age=300,must-revalidate"

if [[ $? -ne 0 ]]; then
    log_error "S3へのアップロードに失敗しました（HTMLファイル）"
    exit 1
fi

log_info "✅ すべてのファイルがS3にアップロードされました"

# ==================== ステップ6: CloudFrontキャッシュ無効化 ====================
log_step "ステップ6: CloudFrontキャッシュ無効化"

log_info "CloudFront Distribution '$CLOUDFRONT_DISTRIBUTION_ID' のキャッシュを無効化中..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

if [[ $? -ne 0 ]]; then
    log_error "CloudFrontキャッシュ無効化に失敗しました"
    exit 1
fi

log_info "無効化リクエストID: $INVALIDATION_ID"
log_warn "キャッシュ無効化には数分かかる場合があります"

# ==================== 完了 ====================
log_step "🎉 デプロイ完了"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  環境: $ENVIRONMENT"
echo "  アクセスURL: $CLOUDFRONT_URL"
echo "  デプロイ日時: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

log_info "以下のURLでアクセスできます:"
log_info "  → $CLOUDFRONT_URL"
echo ""
log_warn "CloudFrontキャッシュ無効化の完了を確認してください:"
log_info "  aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID"
echo ""
