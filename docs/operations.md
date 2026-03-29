# 運用設計書

## 目次
- [環境変数](#環境変数)
- [ログ運用](#ログ運用)
- [監視・アラート](#監視アラート)
- [デプロイ運用](#デプロイ運用)
- [障害対応](#障害対応)
- [バックアップ・リストア](#バックアップリストア)
- [セキュリティ運用](#セキュリティ運用)

---

## 環境変数

### LOG_LEVEL

**説明**: アプリケーションのログ出力レベルを制御します。

**設定値**:

| 値 | 説明 | 用途 | 出力されるログ |
|----|------|------|--------------|
| `DEBUG` | 詳細なデバッグ情報を含む全てのログを出力 | 開発環境、問題調査時 | DEBUG, INFO, WARN, ERROR |
| `INFO` | 通常の動作ログ以上を出力 | **本番環境（推奨）** | INFO, WARN, ERROR |
| `WARN` | 警告以上のログのみ出力 | ログ量を削減したい場合 | WARN, ERROR |
| `ERROR` | エラーログのみ出力 | 重大な問題のみ記録したい場合 | ERROR |

**デフォルト値**: `INFO`（環境変数が設定されていない場合）

**設定方法**:

#### Lambda関数の環境変数（Terraform）

```hcl
resource "aws_lambda_function" "reservation_create" {
  function_name = "zebra-reservation-create"
  handler       = "main"
  runtime       = "provided.al2"

  environment {
    variables = {
      LOG_LEVEL = "INFO"  # 本番環境
    }
  }
}
```

#### 開発環境（ローカル）

```bash
# 開発時は詳細なログを確認
export LOG_LEVEL=DEBUG

# Lambda関数をローカルでテスト
sam local invoke --env-vars env.json
```

`env.json`:
```json
{
  "Parameters": {
    "LOG_LEVEL": "DEBUG"
  }
}
```

**本番環境での推奨設定**:
- 通常運用: `LOG_LEVEL=INFO`
- 問題調査時: 一時的に `LOG_LEVEL=DEBUG` に変更（調査後は必ず戻す）

**注意事項**:
- `DEBUG`レベルはログ量が多く、CloudWatch Logsのコストが増加します
- 本番環境で`DEBUG`を常時有効にすることは推奨しません
- ログには個人情報（メールアドレス、電話番号、住所など）を含めないよう実装済み

---

## ログ運用

### ログ形式

すべてのログはJSON形式で出力され、CloudWatch Logsに記録されます。

**ログエントリの構造**:

```json
{
  "timestamp": "2026-03-29T12:34:56Z",
  "level": "INFO",
  "message": "予約を作成しました",
  "request_id": "1-5f8a1234-abcd1234efgh5678",
  "user_id": "usr_12345",
  "studio_id": "studio_001",
  "fields": {
    "reservation_id": "rsv_001",
    "status": "pending"
  }
}
```

**フィールド説明**:

| フィールド | 説明 | 必須 |
|----------|------|------|
| `timestamp` | ログ出力時刻（UTC、ISO 8601形式） | ✓ |
| `level` | ログレベル（DEBUG/INFO/WARN/ERROR） | ✓ |
| `message` | ログメッセージ | ✓ |
| `request_id` | リクエストID（X-Ray Trace ID） | - |
| `user_id` | ユーザーID（認証後に自動設定） | - |
| `studio_id` | スタジオID（認証後に自動設定） | - |
| `error` | エラーメッセージ（エラー時のみ） | - |
| `fields` | カスタムフィールド（任意の追加情報） | - |

### CloudWatch Logsの運用

#### ロググループ構成

```
/aws/lambda/zebra-reservation-create
/aws/lambda/zebra-reservation-get
/aws/lambda/zebra-calendar-get
...
```

各Lambda関数ごとにロググループが作成されます。

#### ログ保持期間

| 環境 | 保持期間 | 理由 |
|------|---------|------|
| 本番環境 | 90日 | コスト削減とコンプライアンスのバランス |
| 開発環境 | 7日 | 開発用途のみのため短期間 |

**Terraform設定例**:

```hcl
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/zebra-reservation-create"
  retention_in_days = 90  # 本番環境
}
```

#### ログの検索

**CloudWatch Logs Insights クエリ例**:

1. **特定ユーザーの操作ログを検索**:
```
fields @timestamp, level, message, user_id, fields.reservation_id
| filter user_id = "usr_12345"
| sort @timestamp desc
| limit 100
```

2. **エラーログのみ抽出**:
```
fields @timestamp, message, error, fields
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

3. **特定の予約に関するログを検索**:
```
fields @timestamp, level, message, user_id
| filter fields.reservation_id = "rsv_001"
| sort @timestamp asc
```

4. **リクエストIDでトレース**:
```
fields @timestamp, level, message, fields
| filter request_id = "1-5f8a1234-abcd1234efgh5678"
| sort @timestamp asc
```

### ログレベルの使い分け

**開発時の使い分け**:

| レベル | 使用場面 | 例 |
|-------|---------|-----|
| DEBUG | 関数の入出力、クエリ内容など詳細情報 | `logger.Debug(ctx, "DynamoDBクエリを実行", map[string]interface{}{"query": query})` |
| INFO | 重要な処理の開始・完了 | `logger.Info(ctx, "予約を作成しました", map[string]interface{}{"reservation_id": id})` |
| WARN | 警告すべき事象（処理は継続） | `logger.Warn(ctx, "仮予約の期限が近づいています", map[string]interface{}{"expiry_date": date})` |
| ERROR | エラー発生時（処理が失敗） | `logger.Error(ctx, "DynamoDB書き込み失敗", err, map[string]interface{}{"table": "reservations"})` |

**本番環境での実践例**:

```go
func CreateReservation(ctx context.Context, input CreateReservationInput) (*Reservation, error) {
    logger := observability.NewLogger()

    // INFO: 処理開始
    logger.Info(ctx, "予約作成処理を開始", map[string]interface{}{
        "studio_id": input.StudioID,
        "date": input.Date,
    })

    // DEBUG: 詳細なクエリ情報（本番では出力されない）
    logger.Debug(ctx, "予約重複チェックを実行", map[string]interface{}{
        "query_params": queryParams,
    })

    // WARN: 注意すべき状況
    if conflictFound {
        logger.Warn(ctx, "予約重複が検出されました", map[string]interface{}{
            "existing_reservation_id": existingID,
        })
        return nil, apierror.ErrReservationConflict
    }

    // ERROR: エラー発生
    if err := repo.Create(ctx, reservation); err != nil {
        logger.Error(ctx, "予約の保存に失敗しました", err, map[string]interface{}{
            "reservation_id": reservation.ID,
        })
        return nil, apierror.ErrInternalServer
    }

    // INFO: 処理完了
    logger.Info(ctx, "予約を作成しました", map[string]interface{}{
        "reservation_id": reservation.ID,
        "status": reservation.Status,
    })

    return reservation, nil
}
```

---

## 監視・アラート

### CloudWatch Alarms

**設定すべきアラート**:

#### 1. Lambda関数のエラー率

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "zebra-lambda-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "5"  # 1分間に5回以上エラーが発生
  alarm_description   = "Lambda関数でエラーが多発しています"

  dimensions = {
    FunctionName = "zebra-reservation-create"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

#### 2. API Gatewayの5xxエラー

```hcl
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "zebra-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "APIで5xxエラーが多発しています"

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

#### 3. DynamoDBのスロットリング

```hcl
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  alarm_name          = "zebra-dynamodb-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "DynamoDBでスロットリングが発生しています"

  dimensions = {
    TableName = "reservations"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

### SNS通知設定

```hcl
resource "aws_sns_topic" "alerts" {
  name = "zebra-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "admin@studio-zebra.jp"
}
```

### X-Ray トレーシング

**有効化方法（Lambda関数）**:

```hcl
resource "aws_lambda_function" "reservation_create" {
  tracing_config {
    mode = "Active"  # X-Rayトレーシングを有効化
  }
}
```

**X-Rayで確認できる情報**:
- リクエストの全体フロー（API Gateway → Lambda → DynamoDB）
- 各処理の所要時間
- エラーが発生した箇所
- 外部サービス呼び出しのパフォーマンス

---

## デプロイ運用

### デプロイフロー

```
1. ローカル開発
   ↓
2. テスト実行（go test ./...）
   ↓
3. GitHubにpush（feature ブランチ）
   ↓
4. Pull Request作成
   ↓
5. GitHub Actions（CI）実行
   - テスト
   - ビルド
   - 静的解析
   ↓
6. レビュー・承認
   ↓
7. mainブランチにマージ
   ↓
8. GitHub Actions（CD）実行
   - dev環境へ自動デプロイ
   ↓
9. dev環境で動作確認
   ↓
10. 本番デプロイ（手動トリガー）
    - prod環境へデプロイ
```

### デプロイ前のチェックリスト

- [ ] すべてのテストがパスしている（`go test ./...`）
- [ ] ログレベルが適切に設定されている（本番は`INFO`）
- [ ] 環境変数が正しく設定されている
- [ ] データベースマイグレーションが必要か確認
- [ ] API設計書との整合性を確認
- [ ] セキュリティ上の問題がないか確認（認証・認可）

### ロールバック手順

Lambda関数は複数バージョンを保持しているため、問題が発生した場合は以下の手順でロールバックできます。

**AWS CLI でロールバック**:

```bash
# 現在のバージョン確認
aws lambda get-function --function-name zebra-reservation-create

# 前バージョンにロールバック
aws lambda update-alias \
  --function-name zebra-reservation-create \
  --name prod \
  --function-version 3  # 前バージョンの番号
```

**Terraform でロールバック**:

```bash
# 前回のTerraform stateに戻す
git revert <commit-hash>
terraform apply
```

---

## 障害対応

### 障害対応フロー

```
1. アラート受信（CloudWatch Alarms → SNS → メール）
   ↓
2. 状況確認
   - CloudWatch Logsでエラーログを確認
   - X-Rayでトレースを確認
   - CloudWatch Metricsでメトリクスを確認
   ↓
3. 影響範囲の特定
   - 特定のユーザーのみ？全ユーザー？
   - 特定のAPIのみ？全API？
   ↓
4. 一次対応
   - ログレベルをDEBUGに変更して詳細調査
   - 必要に応じてロールバック
   ↓
5. 根本原因の特定
   - ログ・トレースから原因を特定
   ↓
6. 修正・再デプロイ
   ↓
7. 動作確認
   ↓
8. 事後報告書作成
```

### 主要なエラーパターンと対処法

| エラー | 原因 | 対処法 |
|-------|------|--------|
| Lambda Timeout | 処理時間が制限を超過 | タイムアウト設定を延長、処理の最適化 |
| DynamoDB Throttling | リクエスト数がキャパシティを超過 | オンデマンドモードの確認、GSIの見直し |
| 5xx Error | アプリケーション内部エラー | CloudWatch Logsでスタックトレースを確認 |
| 認証エラー多発 | Cognitoトークンの問題 | トークン有効期限、署名検証ロジックを確認 |

### CloudWatch Logsでの調査手順

1. **エラーログを時系列で確認**:
```
fields @timestamp, level, message, error
| filter level = "ERROR"
| sort @timestamp desc
| limit 20
```

2. **特定エラーの頻度を確認**:
```
fields @timestamp, error
| filter level = "ERROR"
| stats count() by error
```

3. **リクエストIDで関連ログを追跡**:
```
fields @timestamp, level, message
| filter request_id = "<アラートのリクエストID>"
| sort @timestamp asc
```

---

## バックアップ・リストア

### DynamoDBバックアップ

**ポイントインタイムリカバリ（PITR）**:

```hcl
resource "aws_dynamodb_table" "reservations" {
  name = "reservations"

  point_in_time_recovery {
    enabled = true  # PITR有効化
  }
}
```

- 過去35日以内の任意の時点に復元可能
- 秒単位でリカバリポイントを指定可能

**オンデマンドバックアップ**:

```bash
# 手動バックアップ作成（重要な変更前に実行）
aws dynamodb create-backup \
  --table-name reservations \
  --backup-name reservations-backup-20260329
```

### リストア手順

**PITRでリストア**:

```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name reservations \
  --target-table-name reservations-restored \
  --restore-date-time 2026-03-29T12:00:00Z
```

**バックアップからリストア**:

```bash
aws dynamodb restore-table-from-backup \
  --target-table-name reservations-restored \
  --backup-arn arn:aws:dynamodb:ap-northeast-1:123456789012:table/reservations/backup/12345
```

---

## セキュリティ運用

### 認証トークンの管理

**トークン有効期限**:
- アクセストークン: 1時間
- リフレッシュトークン: 30日

**トークン更新フロー**:
```
1. アクセストークン期限切れ（401エラー）
   ↓
2. クライアントがリフレッシュトークンを使用して再認証
   ↓
3. 新しいアクセストークンを取得
```

### CORS設定

**本番環境では必ず特定のドメインのみを許可してください。**

現在、`backend/pkg/response/response.go`の`addCORSHeaders`関数では、`Access-Control-Allow-Origin: *`がハードコードされています。これは開発段階では問題ありませんが、**本番環境ではセキュリティリスクがあります**。

**環境変数 `ALLOWED_ORIGIN` を設定**:

| 環境 | 設定値 | 説明 |
|------|--------|------|
| 開発環境 | `*` | すべてのドメインからのアクセスを許可（開発用） |
| 本番環境 | `https://studio-zebra.com` | 特定のドメインのみ許可（推奨） |

**修正が必要な理由**:
- `*`を指定すると、悪意のあるサイトからもAPIにアクセス可能になる
- 認証トークンを盗まれた場合、攻撃者のサイトからAPIを操作される危険性がある
- 本番環境では必ずフロントエンドのドメインのみを許可すべき

**デプロイ前に実装すべき修正**:

```go
func addCORSHeaders(resp *events.APIGatewayProxyResponse) {
    allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
    if allowedOrigin == "" {
        allowedOrigin = "*"  // デフォルト（開発環境用）
    }
    resp.Headers["Access-Control-Allow-Origin"] = allowedOrigin
    resp.Headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    resp.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
}
```

**Terraform設定例**:

```hcl
resource "aws_lambda_function" "reservation_create" {
  function_name = "zebra-reservation-create"

  environment {
    variables = {
      ALLOWED_ORIGIN = "https://studio-zebra.com"  # 本番環境
      # ALLOWED_ORIGIN = "*"  # 開発環境
    }
  }
}
```

### セキュリティベストプラクティス

1. **IAMロール最小権限の原則**:
   - Lambda関数には必要最小限の権限のみ付与
   - DynamoDBは特定テーブルのみアクセス可能に

2. **環境変数の暗号化**:
   - 機密情報（APIキーなど）はAWS Secrets Managerを使用
   - Lambda関数の環境変数は暗号化

3. **API Gatewayのセキュリティ**:
   - WAFを有効化（SQLインジェクション、XSS対策）
   - レート制限を設定（DDoS対策）

4. **ログに個人情報を含めない**:
   - メールアドレス、電話番号、住所は記録しない
   - ユーザーIDのみ記録（個人の特定は別途DB参照が必要）

### 脆弱性対応

**Go言語の依存ライブラリ更新**:

```bash
# 脆弱性スキャン
go list -json -m all | nancy sleuth

# 依存ライブラリ更新
go get -u ./...
go mod tidy
```

**定期的な更新スケジュール**:
- 月次: 依存ライブラリの脆弱性チェック
- 四半期: 依存ライブラリのメジャーアップデート検討

---

## 運用チェックリスト

### 日次

- [ ] CloudWatch Alarmsの確認（アラートが発生していないか）
- [ ] エラーログの確認（ERROR レベルのログをチェック）

### 週次

- [ ] Lambda関数のメトリクス確認（実行回数、エラー率、レイテンシ）
- [ ] DynamoDBのメトリクス確認（読み書き容量、スロットリング）
- [ ] CloudWatch Logsの容量確認（コスト増加の兆候）

### 月次

- [ ] 依存ライブラリの脆弱性スキャン
- [ ] バックアップの動作確認（テスト環境でリストア）
- [ ] コストレビュー（CloudWatch Logs、DynamoDB、Lambda）

### 四半期

- [ ] ログ保持期間の見直し
- [ ] アラート設定の見直し
- [ ] セキュリティ設定の見直し
- [ ] 障害対応手順書の更新

---

**最終更新日**: 2026-03-29
