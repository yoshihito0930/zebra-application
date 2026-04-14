#!/bin/bash

# Lambda関数ビルドスクリプト
# すべてのLambda関数をビルドしてzipファイルを作成します

set -e

# プロジェクトルートディレクトリ
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
BUILD_DIR="${PROJECT_ROOT}/build/lambda"

echo "================================"
echo "Lambda関数ビルドスクリプト"
echo "================================"
echo ""

# ビルドディレクトリを作成
echo "ビルドディレクトリを作成: ${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# Lambda関数のディレクトリ一覧
# 注: cmd/配下にmain.goが存在する関数のみビルド対象
LAMBDA_DIRS=(
  "auth-signup"
  "auth-login"
  "users-me-get"
  "calendar-get"
  "reservation-create"
  "reservation-get"
  "reservation-list"
  "reservation-list-me"
  "reservation-approve"
  "reservation-reject"
  "reservation-promote"
  "reservation-cancel"
  "reservation-update"
  "plans-list"
  "blocked-slots-create"
  "blocked-slots-delete"
  "blocked-slots-list"
  "batch-tentative-reminder"
  "batch-tentative-expiry"
  "batch-second-keep-promote"
)

# ビルド成功カウンター
SUCCESS_COUNT=0
TOTAL_COUNT=${#LAMBDA_DIRS[@]}

echo "全 ${TOTAL_COUNT} 個のLambda関数をビルドします"
echo ""

# 各Lambda関数をビルド
for LAMBDA_NAME in "${LAMBDA_DIRS[@]}"; do
  echo "-------------------------------"
  echo "ビルド中: ${LAMBDA_NAME}"
  echo "-------------------------------"

  # Lambda関数のソースディレクトリ
  LAMBDA_SRC="${BACKEND_DIR}/cmd/${LAMBDA_NAME}"

  if [ ! -d "${LAMBDA_SRC}" ]; then
    echo "⚠️  警告: ${LAMBDA_SRC} が存在しません。スキップします。"
    continue
  fi

  cd "${LAMBDA_SRC}"

  # Go バイナリをビルド（Linux用）
  echo "Go バイナリをビルド中..."
  GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go

  if [ $? -ne 0 ]; then
    echo "❌ エラー: ${LAMBDA_NAME} のビルドに失敗しました"
    exit 1
  fi

  # zipファイルを作成
  echo "zipファイルを作成中..."
  zip -q "${BUILD_DIR}/${LAMBDA_NAME}.zip" bootstrap

  if [ $? -ne 0 ]; then
    echo "❌ エラー: ${LAMBDA_NAME} のzip作成に失敗しました"
    exit 1
  fi

  # bootstrapファイルを削除
  rm bootstrap

  echo "✅ ${LAMBDA_NAME} のビルド完了"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  echo ""
done

echo "================================"
echo "ビルド完了"
echo "================================"
echo "成功: ${SUCCESS_COUNT} / ${TOTAL_COUNT}"
echo "出力先: ${BUILD_DIR}"
echo ""

# ビルドファイル一覧を表示
echo "ビルドされたファイル:"
ls -lh "${BUILD_DIR}"

echo ""
echo "✅ すべてのLambda関数のビルドが完了しました"
