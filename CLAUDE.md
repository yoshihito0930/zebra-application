# CLAUDE.md

このファイルは、Claude Codeや他のAI開発アシスタントがプロジェクトを理解し、効率的に開発支援を行うためのコンテキスト情報をまとめたものです。

## プロジェクト概要

**プロジェクト名**: スタジオゼブラ 予約管理アプリケーション

**目的**: 撮影スタジオの利用予約を管理するWebアプリケーション。将来的に他スタジオ向けSaaSへの展開を見据える。

**ユーザー**:
- **スタジオ利用者 (customer)**: スタジオを予約・利用する顧客
- **スタジオ管理者 (admin)**: 予約の承認・管理を行うスタジオ運営者
- **スタジオスタッフ (staff)**: 予約の閲覧のみ可能なスタッフ

**主要機能**:
- 予約カレンダー表示・予約作成（本予約/仮予約/ロケハン/第2キープ）
- 予約承認フロー（pending → confirmed/tentative/waitlisted/scheduled）
- 仮予約の有効期限管理と自動期限切れ処理
- 第2キープの繰り上げ処理（第1候補キャンセル時）
- ブロック枠設定（休業日、プライベート利用）
- 料金プラン・オプション管理
- 問い合わせ管理
- 通知機能（リマインド、期限通知、承認通知）

## 開発状況

**完了したフェーズ**:
1. 要件定義・データモデル設計
2. アーキテクチャ設計（AWS構成、DynamoDB設計）
3. データベース設計（アクセスパターン駆動設計）
4. バックエンド基盤開発（Go + Lambda、DynamoDB、一部APIエンドポイント）
5. フロントエンド基盤セットアップ（React + Vite + TypeScript、Chakra UI、型定義）

**現在のフェーズ**: フロントエンド開発（進行中）
- ゲストユーザー機能フェーズ1実装中（閲覧のみ、認証不要）

**次のフェーズ**: バックエンド完全実装、ゲストユーザーフェーズ2・3、E2Eテスト、オブザーバビリティ実装、デプロイ

## 技術スタック

### バックエンド
- **言語**: Go
- **実行環境**: AWS Lambda
- **データベース**: DynamoDB（マルチテーブル設計、オンデマンドキャパシティモード）
- **認証**: AWS Cognito（トークンベース認証）
- **メール送信**: Amazon SES
- **バッチ処理**: EventBridge + Lambda

### フロントエンド
- **フレームワーク**: React 19 + Vite 5
- **言語**: TypeScript 6
- **UIライブラリ**: Chakra UI 2（カスタムテーマ）
- **状態管理**:
  - グローバル: Zustand
  - サーバー状態: TanStack Query (React Query)
- **ルーティング**: React Router DOM 7
- **フォームバリデーション**: React Hook Form + Zod
- **日付操作**: date-fns
- **カレンダー**: React Big Calendar（または独自実装）
- **アイコン**: Lucide React
- **アニメーション**: Framer Motion
- **認証**: amazon-cognito-identity-js

### インフラ
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **配信**: CloudFront + S3
- **API**: API Gateway（REST API）
- **監視**: CloudWatch Logs, CloudWatch Alarms, SNS

### 環境
- **dev**: 開発・検証環境
- **prod**: 本番環境

## アーキテクチャ

### システム構成
```
[CloudFront] → [S3 (React)] / [API Gateway]
    ↓
[Cognito] → [Lambda (Go)] → [DynamoDB]
                ↓
            [SES (メール送信)]

[EventBridge (スケジュール)] → [Lambda (Go)] → [DynamoDB / SES]
```

### データベース設計戦略

**マルチテーブル設計**を採用（シングルテーブルではなく）:
- シングルテーブル設計は設計難易度が高く、デバッグや変更が困難
- 複数エンティティを1クエリでまとめて取る必然性が薄い（フロントエンドから並列API呼び出しで対応可能）
- SaaS化を見据えるとエンティティごとにテーブルが分かれている方がスキーマ変更やマイグレーションがしやすい

**アクセスパターン駆動設計**:
- DynamoDBのクエリ性能を最大化するため、アクセスパターンから逆算してGSIを設計
- 詳細は [docs/database-design.md](docs/database-design.md) と [docs/data-model.md](docs/data-model.md) を参照

### 主要なテーブル

| テーブル名 | 主な用途 | PK | SK | GSI |
|-----------|---------|----|----|-----|
| reservations | 予約データ | studio_id | date#reservation_id | GSI1(status別), GSI2(user別), GSI3(ID検索), GSI4(第2キープ) |
| users | ユーザー情報 | user_id | - | GSI1(email検索) |
| plans | 料金プラン | studio_id | plan_id | なし |
| options | オプション | studio_id | option_id | なし |
| blocked_slots | ブロック枠 | studio_id | date#blocked_slot_id | なし |
| inquiries | 問い合わせ | studio_id | inquiry_id | GSI1(status別), GSI2(user別) |
| notifications | 通知 | studio_id | scheduled_at#notification_id | なし |

## ディレクトリ構造（推奨）

現在は `/docs` のみ存在。バックエンド開発に向けて、以下の構造を推奨:

```
zebra-application/
├── docs/                      # 設計ドキュメント
│   ├── requirements.md        # 要件定義
│   ├── architecture.md        # アーキテクチャ設計
│   ├── database-design.md     # DynamoDB設計
│   ├── data-model.md          # データモデル定義
│   └── api-design.md          # API設計
├── backend/                   # バックエンド（Go + Lambda）
│   ├── cmd/                   # エントリーポイント（Lambda handlers）
│   │   ├── auth/              # 認証関連Lambda
│   │   ├── reservations/      # 予約関連Lambda
│   │   ├── calendar/          # カレンダー関連Lambda
│   │   ├── plans/             # プラン関連Lambda
│   │   ├── inquiries/         # 問い合わせ関連Lambda
│   │   └── batch/             # バッチ処理Lambda
│   ├── internal/              # 内部パッケージ
│   │   ├── domain/            # ドメインモデル（エンティティ、値オブジェクト）
│   │   ├── usecase/           # ビジネスロジック
│   │   ├── repository/        # データアクセス層（DynamoDB）
│   │   ├── middleware/        # 認証・認可ミドルウェア
│   │   ├── validator/         # バリデーション
│   │   └── observability/     # ログ、トレーシング、メトリクス
│   ├── pkg/                   # 外部に公開可能な共通パッケージ
│   │   ├── apierror/          # APIエラー定義
│   │   └── response/          # レスポンスフォーマット
│   ├── go.mod
│   └── go.sum
├── frontend/                  # フロントエンド（後のフェーズで開発）
├── terraform/                 # インフラコード
│   ├── modules/               # 再利用可能なモジュール
│   ├── environments/          # 環境別設定
│   │   ├── dev/
│   │   └── prod/
│   └── backend.tf
├── .github/                   # GitHub Actions
│   └── workflows/
└── README.md
```

## 重要なビジネスロジック

### 予約種別と状態遷移

**予約種別**:
- `regular`: 本予約（利用日確定）
- `tentative`: 仮予約（利用日の7日前まで有効）
- `location_scout`: ロケハン（スタジオ下見）
- `second_keep`: 第2キープ（本予約/仮予約が既に存在する時間帯の仮押さえ）

**ステータス遷移**:
```
pending → tentative → confirmed → completed
       → confirmed → completed
       → waitlisted → tentative (第1候補キャンセル時)
       → scheduled → completed (ロケハン)

pending/tentative/confirmed/waitlisted/scheduled → cancelled
tentative → expired (期限切れ)
```

### 予約作成時の業務ルール

1. **予約重複チェック**: 同一時間帯に `confirmed/tentative/scheduled` の予約が存在しないこと
2. **ブロック枠チェック**: 指定日時にブロック枠が存在しないこと
3. **第2キープの前提**: `second_keep` の場合、同一時間帯に `confirmed/tentative` の予約が存在すること
4. **定休日チェック**: 指定日がスタジオの定休日でないこと
5. **料金スナップショット**: 予約作成時のプラン料金・オプション料金をスナップショットとして保存（後からマスターデータが変更されても過去の予約に影響しない）

### バッチ処理（EventBridge + Lambda）

| バッチ名 | 実行タイミング | 処理内容 |
|---------|--------------|---------|
| 仮予約期限通知 | 日次 | 期限3日前の仮予約を取得し、通知を作成 |
| 第2キープ繰り上げ | イベント駆動 | 第1候補キャンセル時、第2キープを `tentative` に繰り上げ |
| リマインド通知 | 日次 | 翌日の確定予約を取得し、リマインド通知を作成 |
| 予約完了処理 | 日次 | 利用日経過の予約を `completed` に更新 |
| 仮予約期限切れ処理 | 日次 | 期限切れの仮予約を `expired` に更新 |

## API設計

### 認証・認可

**認証方式**: Cognitoトークンベース認証
```
Authorization: Bearer <access_token>
```

**ロール**:
- `customer`: 自分の予約・問い合わせのみ操作可能
- `admin`: 所属スタジオの全データを操作可能
- `staff`: 所属スタジオの予約データを閲覧のみ可能

**スタジオスコープ制御**: admin/staffは所属スタジオのデータのみアクセス可能（トークンの `studio_id` とリクエスト対象の `studio_id` を検証）

### 主要なエンドポイント

詳細は [docs/api-design.md](docs/api-design.md) を参照。

| メソッド | パス | 説明 | 認証 | ロール |
|---------|------|------|------|--------|
| POST | /auth/signup | ユーザー登録 | 不要 | - |
| POST | /auth/login | ログイン | 不要 | - |
| GET | /studios/{id}/calendar | 予約カレンダー取得 | 不要 | - |
| POST | /reservations | 予約作成 | 要 | customer, admin |
| GET | /reservations/{id} | 予約詳細取得 | 要 | customer, admin, staff |
| PATCH | /reservations/{id}/approve | 予約承認 | 要 | admin |
| PATCH | /reservations/{id}/cancel | 予約キャンセル | 要 | customer, admin |
| GET | /studios/{id}/plans | プラン一覧取得 | 不要 | - |
| POST | /plans | プラン作成 | 要 | admin |
| POST | /inquiries | 問い合わせ作成 | 要 | customer |
| PATCH | /inquiries/{id}/reply | 問い合わせ回答 | 要 | admin |

### エラーハンドリング

**HTTPステータスコード**:
- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 未認証
- `403 Forbidden`: 認可エラー
- `404 Not Found`: リソース不在
- `409 Conflict`: 業務ロジック上の競合（予約重複など）
- `500 Internal Server Error`: サーバー内部エラー

**エラーレスポンス形式**:
```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "指定の日時は既に予約済みです"
  }
}
```

詳細なエラーコード定義は [docs/api-design.md](docs/api-design.md) の「エラー定義」セクションを参照。

## 開発ガイドライン

### オブザーバビリティ

**初期段階から組み込むべき機能**:
- **構造化ログ**: JSON形式でログ出力（Lambda関数名、リクエストID、ユーザーID、スタジオID、エラー情報など）
- **トレーシング**: AWS X-Rayを使用してリクエストの流れを可視化
- **メトリクス**: CloudWatch Metricsで予約作成数、エラー率、レイテンシなどを記録

**ロギング方針**:
- ログレベル: DEBUG, INFO, WARN, ERROR
- 本番環境ではINFO以上のみ出力
- 個人情報（メールアドレス、電話番号、住所など）はログに含めない（ユーザーIDのみ）
- 500エラーでは内部詳細をレスポンスに含めず、CloudWatch Logsに記録

### コーディング規約

**Go言語**:
- 標準的なGo Projectレイアウト（https://github.com/golang-standards/project-layout）に従う
- `gofmt`, `golint`, `go vet` を使用してコード品質を保つ
- エラーハンドリングは明示的に行う（`if err != nil` を省略しない）
- テストカバレッジ80%以上を目標とする

**Lambda関数**:
- 1つのLambda関数は1つのAPIエンドポイントに対応
- コールドスタート対策として、初期化処理はハンドラー外で実行
- DynamoDBクライアントは再利用（グローバル変数で保持）

### テスト戦略

- **ユニットテスト**: `internal/` 以下のパッケージに対して作成
- **統合テスト**: DynamoDB Localを使用してリポジトリ層をテスト
- **E2Eテスト**: API Gateway + Lambdaの結合テスト（dev環境で実施）

### API設計書ベースの並行開発

- API設計書（[docs/api-design.md](docs/api-design.md)）を先に固める
- OpenAPI仕様書を生成（オプション）
- フロントエンドはモックサーバーを使用して開発可能
- バックエンドはAPI設計書に従って実装

### マルチテナント対応

将来のSaaS化を見据えて、以下の点に注意:
- すべてのデータに `studio_id` を含める
- admin/staffは所属 `studio_id` のデータのみアクセス可能
- データ分離を徹底（誤って他スタジオのデータを取得・更新しない）

## 参照ドキュメント

| ドキュメント名 | パス | 内容 |
|--------------|------|------|
| 要件定義 | [docs/requirements.md](docs/requirements.md) | ユースケース、予約種別、状態遷移 |
| アーキテクチャ設計 | [docs/architecture.md](docs/architecture.md) | AWS構成、技術スタック |
| データベース設計 | [docs/database-design.md](docs/database-design.md) | DynamoDBテーブル設計、GSI、アクセスパターン |
| データモデル定義 | [docs/data-model.md](docs/data-model.md) | エンティティ定義、アクセスパターン一覧 |
| API設計 | [docs/api-design.md](docs/api-design.md) | エンドポイント、リクエスト/レスポンス、バリデーション、エラー定義 |
| **運用設計** | **[docs/operations.md](docs/operations.md)** | **環境変数、ログ運用、監視、デプロイ、障害対応** |
| **デザイン設計** | **[docs/design.md](docs/design.md)** | **カラーシステム、タイポグラフィ、UIコンポーネント仕様、ワイヤーフレーム** |
| **ゲストユーザー実装計画** | **[docs/guest-user-implementation.md](docs/guest-user-implementation.md)** | **ゲスト機能の段階的実装計画、バックエンド変更範囲** |

## Claude Code利用時の注意点

### コード生成時に参照すべきドキュメント

- **新しいAPIエンドポイントを作成する場合**: [docs/api-design.md](docs/api-design.md) でリクエスト/レスポンス形式、バリデーションルール、エラー定義を確認
- **DynamoDBアクセスを実装する場合**: [docs/database-design.md](docs/database-design.md) と [docs/data-model.md](docs/data-model.md) でテーブル構造、GSI、アクセスパターンを確認
- **ビジネスロジックを実装する場合**: [docs/requirements.md](docs/requirements.md) でユースケース、状態遷移、予約ルールを確認
- **環境変数やログ運用について**: [docs/operations.md](docs/operations.md) でLOG_LEVELの設定方法、ログの使い分け、監視方法を確認
- **フロントエンドUIを実装する場合**: [docs/design.md](docs/design.md) でカラーパレット、コンポーネント仕様、レイアウトを確認

### プロジェクト固有の用語

- **予約種別**: regular, tentative, location_scout, second_keep
- **ステータス**: pending, tentative, confirmed, waitlisted, scheduled, cancelled, expired, completed
- **ロール**: customer, admin, staff
- **第2キープ**: 既に予約がある時間帯を仮押さえする予約。第1候補がキャンセルされると繰り上げ
- **仮予約**: 利用日の7日前まで有効な予約。期限を過ぎると `expired` になる
- **ブロック枠**: 予約不可な時間帯（休業日、プライベート利用など）
- **ゲストユーザー**: 会員登録なしで閲覧・予約が可能なユーザー（段階的実装中）

### 質問があった場合

設計内容について不明な点があれば、上記の参照ドキュメントを確認してください。それでも不明な場合は、ユーザーに確認を取ってください。

---

## フロントエンド開発ガイドライン

### ディレクトリ構造

```
frontend/
├── src/
│   ├── components/         # 共通コンポーネント
│   │   ├── common/         # ボタン、カード、モーダルなど
│   │   ├── layouts/        # レイアウトコンポーネント
│   │   ├── auth/           # 認証関連コンポーネント
│   │   ├── calendar/       # カレンダー関連
│   │   ├── reservation/    # 予約関連
│   │   └── admin/          # 管理者向けコンポーネント
│   ├── pages/              # 画面コンポーネント
│   │   ├── auth/           # 認証画面
│   │   ├── customer/       # 顧客向け画面
│   │   └── admin/          # 管理者向け画面
│   ├── hooks/              # カスタムフック
│   ├── services/           # API通信
│   ├── stores/             # Zustand状態管理
│   ├── theme/              # Chakra UIテーマ
│   ├── types/              # TypeScript型定義
│   └── utils/              # ユーティリティ関数
```

### コンポーネント設計原則

1. **単一責任**: 1コンポーネント1責任
2. **再利用性**: 汎用的なコンポーネントは`components/common/`に配置
3. **Props型定義**: すべてのPropsにTypeScript型を定義
4. **アクセシビリティ**: ARIA属性を適切に設定（Chakra UIが自動対応）
5. **エラーハンドリング**: ErrorBoundaryでラップ

### 状態管理方針

- **グローバル状態（Zustand）**: 認証情報、ユーザー情報、スタジオ情報
- **ローカル状態（useState）**: フォーム入力、UI状態（モーダル開閉など）
- **サーバー状態（React Query）**: API取得データ、キャッシュ管理

### デザインシステム

- すべてのカラー、スペーシング、フォントは[docs/design.md](docs/design.md)に従う
- 予約ステータス別配色を厳守（confirmed=緑、tentative=オレンジ等）
- レスポンシブブレイクポイント: sm(640px), md(768px), lg(1024px), xl(1280px)

### モックデータ開発

バックエンドAPI完成前は、`src/services/`内でモックデータを使用して開発を進める。
API完成後、モックからAPI呼び出しに切り替え。

---

**最終更新日**: 2026-04-14
