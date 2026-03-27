# アーキテクチャ設計

## システム構成図

```mermaid
flowchart TB
    subgraph "ユーザアクセス"
        CF[CloudFront] --> S3["S3 / React + Vite"]
        CF --> APIGW[API Gateway]
        APIGW --> Cognito["Cognito / 認証・認可"]
        APIGW --> Lambda1["Lambda / Go"]
        Lambda1 --> DynamoDB[(DynamoDB)]
        Lambda1 --> SES["SES / メール送信"]
    end

    subgraph "バッチ処理"
        EB["EventBridge / スケジュール"] --> Lambda2["Lambda / Go"]
        Lambda2 --> DynamoDB
        Lambda2 --> SES
    end

    subgraph "監視・ログ"
        Lambda1 --> CWLogs[CloudWatch Logs]
        Lambda2 --> CWLogs
        APIGW --> CWLogs
        CWLogs --> CWAlarm[CloudWatch Alarms]
        CWAlarm --> SNS["SNS / 通知"]
    end
```

## 技術スタック
| レイヤー | 技術 |
|---------|------|
| Webサイト(今回は開発対象外) | Astro |
| 予約管理アプリ | React + Vite |
| 共有コンポーネント | React（monorepo内パッケージ） |
| バックエンド | Go + Lambda |
| データベース | DynamoDB |
| 認証 | Cognito |
| メール送信 | SES |
| バッチ処理 | EventBridge + Lambda |
| 監視 | CloudWatch |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## 環境構成
| 環境 | 用途 | AWSアカウント |
|------|------|-------------|
| dev | 開発・検証 | xxx |
| prod | 本番 | xxx |