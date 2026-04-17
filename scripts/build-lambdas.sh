#!/bin/bash

# Lambda関数をビルドしてZipファイルを作成するスクリプト
# Usage: ./scripts/build-lambdas.sh

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトルート
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
ARTIFACTS_DIR="${PROJECT_ROOT}/lambda-artifacts"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Lambda関数ビルド開始${NC}"
echo -e "${GREEN}========================================${NC}"

# artifactsディレクトリを作成（存在しない場合）
mkdir -p "${ARTIFACTS_DIR}"

# 既存のzipファイルを削除
echo -e "${YELLOW}既存のartifactsをクリーンアップ中...${NC}"
rm -f "${ARTIFACTS_DIR}"/*.zip

# ビルド成功・失敗カウンター
SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_FUNCTIONS=()

# backend/cmd以下の全ディレクトリを取得
cd "${BACKEND_DIR}"

echo -e "${YELLOW}Lambda関数を検出中...${NC}"
LAMBDA_FUNCTIONS=$(find cmd -maxdepth 1 -mindepth 1 -type d | sed 's|cmd/||' | sort)
TOTAL_COUNT=$(echo "${LAMBDA_FUNCTIONS}" | wc -l)

echo -e "${GREEN}検出されたLambda関数: ${TOTAL_COUNT}個${NC}"
echo ""

# 各Lambda関数をビルド
CURRENT=0
for func_name in ${LAMBDA_FUNCTIONS}; do
  CURRENT=$((CURRENT + 1))
  echo -e "${YELLOW}[${CURRENT}/${TOTAL_COUNT}] ビルド中: ${func_name}${NC}"

  # Goバイナリをビルド
  if GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o "${ARTIFACTS_DIR}/bootstrap" "./cmd/${func_name}"; then
    # Zipファイルを作成
    cd "${ARTIFACTS_DIR}"
    zip -q "${func_name}.zip" bootstrap
    rm bootstrap
    cd "${BACKEND_DIR}"

    echo -e "${GREEN}  ✓ 成功: ${func_name}.zip${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}  ✗ 失敗: ${func_name}${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_FUNCTIONS+=("${func_name}")
  fi

  echo ""
done

# ビルド結果サマリー
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}ビルド完了${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "成功: ${GREEN}${SUCCESS_COUNT}${NC}個"
echo -e "失敗: ${RED}${FAIL_COUNT}${NC}個"

if [ ${FAIL_COUNT} -gt 0 ]; then
  echo ""
  echo -e "${RED}失敗した関数:${NC}"
  for func in "${FAILED_FUNCTIONS[@]}"; do
    echo -e "  - ${func}"
  done
  exit 1
fi

echo ""
echo -e "${GREEN}全Lambda関数のビルドが完了しました！${NC}"
echo -e "Artifacts: ${ARTIFACTS_DIR}"
