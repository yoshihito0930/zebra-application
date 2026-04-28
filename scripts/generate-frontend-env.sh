#!/bin/bash

# フロントエンド環境変数ファイル生成スクリプト
# Terraform outputから値を取得して .env.production を生成

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 引数チェック
ENVIRONMENT=${1:-dev}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    log_error "環境名は 'dev' または 'prod' を指定してください"
    echo "使用方法: $0 [dev|prod]"
    exit 1
fi

log_info "環境: $ENVIRONMENT"

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

# Terraformディレクトリに移動
cd "$TERRAFORM_DIR"

# Terraform outputから値を取得
log_info "Terraform outputから値を取得中..."

# エラーハンドリング付きで値を取得
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

API_BASE_URL=$(get_output "api_gateway_invoke_url")
COGNITO_USER_POOL_ID=$(get_output "cognito_user_pool_id")
COGNITO_CLIENT_ID=$(get_output "cognito_user_pool_client_id")
COGNITO_REGION="ap-northeast-1" # 固定値

log_info "API Gateway URL: $API_BASE_URL"
log_info "Cognito User Pool ID: $COGNITO_USER_POOL_ID"
log_info "Cognito Client ID: $COGNITO_CLIENT_ID"

# .env.production ファイルを生成
ENV_FILE="$FRONTEND_DIR/.env.production"
log_info ".env.production を生成中: $ENV_FILE"

cat > "$ENV_FILE" <<EOF
# 自動生成された環境変数ファイル
# 生成日時: $(date '+%Y-%m-%d %H:%M:%S')
# 環境: $ENVIRONMENT
# 注意: このファイルは scripts/generate-frontend-env.sh によって自動生成されます
#       手動で編集しないでください

# API設定
VITE_API_BASE_URL=$API_BASE_URL
VITE_API_TIMEOUT=30000

# AWS Cognito設定
VITE_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
VITE_COGNITO_REGION=$COGNITO_REGION

# スタジオID（開発用）
VITE_DEFAULT_STUDIO_ID=studio_001

# 環境
VITE_ENV=$ENVIRONMENT
EOF

log_info "✅ .env.production の生成が完了しました"
log_info "ファイルパス: $ENV_FILE"

# 生成された内容を表示（認証情報をマスク）
echo ""
log_info "生成された環境変数:"
echo "----------------------------------------"
cat "$ENV_FILE" | sed 's/\(VITE_COGNITO_CLIENT_ID=\).*/\1***MASKED***/'
echo "----------------------------------------"
echo ""

log_info "🎉 環境変数ファイルの生成が完了しました"
