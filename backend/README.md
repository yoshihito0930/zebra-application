# バックエンドディレクトリ構成

このディレクトリは、Go言語で実装されたLambda関数群とそのサポートコードを含みます。

## なぜこの構成にしたか

このディレクトリ構成は、**Go標準プロジェクトレイアウト**（[golang-standards/project-layout](https://github.com/golang-standards/project-layout)）と**クリーンアーキテクチャ**の原則を組み合わせたものです。

### 主な設計原則

1. **関心の分離**: ビジネスロジック、データアクセス、API処理を明確に分離
2. **依存関係の方向**: 外側（cmd, pkg）→ 内側（internal）の一方向のみ
3. **テスタビリティ**: インターフェースを活用してモックを作成しやすくする
4. **再利用性**: 共通処理は `pkg` に、プロジェクト固有のコードは `internal` に配置

## ディレクトリ構造

```
backend/
├── cmd/                        # Lambda関数のエントリーポイント（main.go）
│   ├── auth/                   # 認証関連のLambda関数
│   ├── reservations/           # 予約関連のLambda関数
│   ├── calendar/               # カレンダー関連のLambda関数
│   ├── plans/                  # プラン関連のLambda関数
│   ├── options/                # オプション関連のLambda関数
│   ├── blocked-slots/          # ブロック枠関連のLambda関数
│   ├── inquiries/              # 問い合わせ関連のLambda関数
│   ├── users/                  # ユーザー関連のLambda関数
│   └── batch/                  # バッチ処理のLambda関数
├── internal/                   # プロジェクト内部パッケージ（外部から参照不可）
│   ├── domain/                 # ドメイン層（ビジネスロジックの中核）
│   │   ├── entity/             # エンティティ（IDを持つビジネスオブジェクト）
│   │   └── valueobject/        # 値オブジェクト（IDを持たない不変オブジェクト）
│   ├── usecase/                # ユースケース層（アプリケーションのビジネスロジック）
│   ├── repository/             # リポジトリ層（データアクセスのインターフェースと実装）
│   ├── middleware/             # ミドルウェア（認証、認可、ログなど）
│   ├── validator/              # バリデーション処理
│   └── observability/          # オブザーバビリティ（ログ、トレース、メトリクス）
├── pkg/                        # 外部に公開可能なパッケージ
│   ├── apierror/               # APIエラー定義
│   └── response/               # レスポンスフォーマット
├── go.mod                      # Go モジュール定義（依存関係管理）
└── go.sum                      # 依存関係のチェックサム
```

## 各ディレクトリの詳細説明

### `cmd/` - Lambda関数のエントリーポイント

**目的**: 各Lambda関数の `main.go` を配置するディレクトリ

**役割**:
- API GatewayやEventBridgeからのイベントを受け取る
- リクエストをパースして、適切なユースケースを呼び出す
- レスポンスを返す

**特徴**:
- 1つのサブディレクトリ = 1つのLambda関数
- `main.go` には最小限のコードのみ（依存性注入、ハンドラー登録）
- ビジネスロジックは書かない（`internal/usecase` に委譲）

**なぜこの構成か**:
- Lambdaは関数単位でデプロイされるため、各関数ごとにディレクトリを分ける
- `cmd/` はGo言語の慣習で「実行可能バイナリのエントリーポイント」を意味する
- コールドスタート対策として、初期化処理（DynamoDBクライアント生成など）は `main()` の外で実行

**例**:
```
cmd/
├── reservations/
│   └── main.go              # POST /reservations のLambdaハンドラー
├── reservations-get/
│   └── main.go              # GET /reservations/{id} のLambdaハンドラー
```

各 `main.go` のイメージ:
```go
package main

import (
    "context"
    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    // internal パッケージをインポート
)

// DynamoDBクライアントなどを初期化（コールドスタート対策）
var (
    db = initDynamoDB()
    reservationRepo = repository.NewReservationRepository(db)
    reservationUsecase = usecase.NewReservationUsecase(reservationRepo)
)

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // リクエストをパース
    // ユースケースを呼び出し
    // レスポンスを返す
}

func main() {
    lambda.Start(handler)
}
```

---

### `internal/` - プロジェクト内部パッケージ

**目的**: このプロジェクト内でのみ使用するコードを配置

**特徴**:
- Go言語の仕様で、`internal/` 以下のパッケージは外部からインポート不可
- プロジェクト固有のビジネスロジックはここに集約

**なぜこの構成か**:
- 他のプロジェクトに誤って依存されるのを防ぐ
- プロジェクト内部のAPIを自由に変更できる（外部への影響を気にしなくて良い）

---

### `internal/domain/` - ドメイン層

**目的**: ビジネスの中核となるルールやデータ構造を定義

**役割**:
- **エンティティ** (`entity/`): IDを持つビジネスオブジェクト（例: Reservation, User, Plan）
- **値オブジェクト** (`valueobject/`): IDを持たない不変オブジェクト（例: Email, PhoneNumber, TimeSlot）

**特徴**:
- データベースやAPIに依存しない純粋なGoの構造体
- ビジネスルールをメソッドとして実装（例: 予約の状態遷移ルール）
- 他の層（usecase, repository）から参照される

**なぜこの構成か**:
- ドメイン駆動設計（DDD）の考え方を取り入れている
- ビジネスロジックとインフラ（DBやAPI）を分離することで、テストしやすくなる
- ビジネスルールが変更されても、ドメイン層だけ修正すれば良い

**例**:
```go
// internal/domain/entity/reservation.go
package entity

type Reservation struct {
    ReservationID string
    StudioID      string
    UserID        string
    Status        ReservationStatus
    Date          time.Time
    // ...
}

// ビジネスルール: 予約をキャンセル可能かチェック
func (r *Reservation) CanCancel() bool {
    return r.Status == StatusPending || r.Status == StatusConfirmed
}

// ビジネスルール: 予約をキャンセルする
func (r *Reservation) Cancel(cancelledBy string) error {
    if !r.CanCancel() {
        return errors.New("cannot cancel reservation in current status")
    }
    r.Status = StatusCancelled
    r.CancelledBy = cancelledBy
    r.CancelledAt = time.Now()
    return nil
}
```

```go
// internal/domain/valueobject/time_slot.go
package valueobject

type TimeSlot struct {
    StartTime time.Time
    EndTime   time.Time
}

// 時間帯の重複チェック
func (t TimeSlot) Overlaps(other TimeSlot) bool {
    return t.StartTime.Before(other.EndTime) && other.StartTime.Before(t.EndTime)
}
```

---

### `internal/usecase/` - ユースケース層

**目的**: アプリケーションのビジネスロジック（ユーザーがシステムに対して行う操作）を実装

**役割**:
- APIエンドポイントに対応する処理を実装（例: 予約作成、予約承認、予約キャンセル）
- 複数のリポジトリを組み合わせてビジネスロジックを実行
- トランザクション制御
- エラーハンドリング

**特徴**:
- リポジトリインターフェースに依存（具体的な実装には依存しない）
- ドメインエンティティを操作
- API特有の処理（HTTPリクエスト/レスポンス）は含めない

**なぜこの構成か**:
- ビジネスロジックを1箇所に集約（重複を避ける）
- インターフェースに依存することで、テスト時にモックを使える
- 複数のAPIエンドポイントから同じユースケースを呼び出せる

**例**:
```go
// internal/usecase/reservation_usecase.go
package usecase

type ReservationUsecase struct {
    reservationRepo repository.ReservationRepository
    userRepo        repository.UserRepository
    planRepo        repository.PlanRepository
}

func NewReservationUsecase(
    reservationRepo repository.ReservationRepository,
    userRepo repository.UserRepository,
    planRepo repository.PlanRepository,
) *ReservationUsecase {
    return &ReservationUsecase{
        reservationRepo: reservationRepo,
        userRepo:        userRepo,
        planRepo:        planRepo,
    }
}

// 予約を作成する
func (u *ReservationUsecase) CreateReservation(ctx context.Context, input CreateReservationInput) (*entity.Reservation, error) {
    // 1. バリデーション
    // 2. プランの存在確認
    // 3. 予約重複チェック
    // 4. エンティティ作成
    // 5. リポジトリに保存
    // 6. 通知作成
    return reservation, nil
}
```

---

### `internal/repository/` - リポジトリ層

**目的**: データベースへのアクセスを抽象化

**役割**:
- DynamoDBへのCRUD操作を実装
- SQLクエリ（DynamoDBの場合はクエリパラメータ）を組み立てる
- データベースのレコードとドメインエンティティを相互変換

**特徴**:
- インターフェースと実装を分離
- ユースケースはインターフェースにのみ依存

**なぜこの構成か**:
- データベースの実装詳細をユースケースから隠蔽
- テスト時にモックリポジトリを使える
- 将来的にDynamoDBから別のDBに移行する場合も、リポジトリ層だけ修正すれば良い

**例**:
```go
// internal/repository/reservation_repository.go
package repository

// インターフェース定義
type ReservationRepository interface {
    Create(ctx context.Context, reservation *entity.Reservation) error
    FindByID(ctx context.Context, reservationID string) (*entity.Reservation, error)
    FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error)
    Update(ctx context.Context, reservation *entity.Reservation) error
    Delete(ctx context.Context, reservationID string) error
}

// DynamoDB実装
type DynamoDBReservationRepository struct {
    client *dynamodb.Client
}

func NewReservationRepository(client *dynamodb.Client) ReservationRepository {
    return &DynamoDBReservationRepository{client: client}
}

func (r *DynamoDBReservationRepository) Create(ctx context.Context, reservation *entity.Reservation) error {
    // DynamoDBにPutItemする処理
}
```

---

### `internal/middleware/` - ミドルウェア

**目的**: API Gatewayリクエストの前処理・後処理を実装

**役割**:
- 認証（Cognitoトークン検証）
- 認可（ロールチェック、スタジオスコープチェック）
- ログ出力
- エラーハンドリング
- CORSヘッダー追加

**なぜこの構成か**:
- 横断的関心事（認証、ログなど）を各ハンドラーで重複して書かなくて良い
- ミドルウェアをチェーン化して処理を組み立てられる

**例**:
```go
// internal/middleware/auth.go
package middleware

func AuthMiddleware(next Handler) Handler {
    return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
        // Authorizationヘッダーからトークンを取得
        // Cognitoで検証
        // ユーザー情報をコンテキストに追加
        return next(ctx, request)
    }
}
```

---

### `internal/validator/` - バリデーション

**目的**: リクエストのバリデーションロジックを実装

**役割**:
- 入力値の形式チェック（メールアドレス、電話番号、日付など）
- 業務ルールのバリデーション（営業時間内か、定休日でないか、など）

**なぜこの構成か**:
- バリデーションロジックを1箇所に集約
- ユースケースから分離することで、コードが読みやすくなる

**例**:
```go
// internal/validator/reservation_validator.go
package validator

func ValidateCreateReservationInput(input CreateReservationInput) error {
    // 日付が今日以降か
    // 開始時刻 < 終了時刻か
    // 営業時間内か
    // など
}
```

---

### `internal/observability/` - オブザーバビリティ

**目的**: ログ、トレース、メトリクスを実装

**役割**:
- 構造化ログ出力（JSON形式）
- AWS X-Rayトレーシング
- CloudWatch Metricsへのメトリクス送信

**なぜこの構成か**:
- 初期段階からログとトレーシングを組み込むことで、後からの追加が不要
- 本番環境でのトラブルシューティングが容易になる

**例**:
```go
// internal/observability/logger.go
package observability

func Info(ctx context.Context, message string, fields map[string]interface{}) {
    // JSON形式でログ出力
    // リクエストID、ユーザーID、スタジオIDなどを自動的に含める
}
```

---

### `pkg/` - 外部公開パッケージ

**目的**: このプロジェクト外からも利用可能な汎用的なコードを配置

**役割**:
- APIエラー定義 (`apierror/`)
- レスポンスフォーマット (`response/`)

**なぜこの構成か**:
- 将来的にフロントエンドやCLIツールなど、他のプロジェクトから参照される可能性がある
- `internal/` と違い、外部からインポート可能

**例**:
```go
// pkg/apierror/error.go
package apierror

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

var (
    ErrReservationConflict = &APIError{Code: "RESERVATION_CONFLICT", Message: "指定の日時は既に予約済みです"}
    ErrUnauthorized        = &APIError{Code: "AUTH_TOKEN_MISSING", Message: "認証トークンが必要です"}
)
```

```go
// pkg/response/response.go
package response

func Success(statusCode int, body interface{}) events.APIGatewayProxyResponse {
    // JSON形式でレスポンスを返す
}

func Error(statusCode int, err *apierror.APIError) events.APIGatewayProxyResponse {
    // エラーレスポンスを返す
}
```

---

## データフロー

リクエストがどのように処理されるか、フロー図で示します:

```
1. API Gateway
   ↓
2. Lambda Handler (cmd/reservations/main.go)
   ↓
3. Middleware (認証、ログ)
   ↓
4. Validator (入力値検証)
   ↓
5. Usecase (ビジネスロジック)
   ↓
6. Repository (DynamoDBアクセス)
   ↓
7. DynamoDB

レスポンス:
7. DynamoDB
   ↓
6. Repository (エンティティに変換)
   ↓
5. Usecase (ビジネスロジック実行)
   ↓
4. Response Package (レスポンス整形)
   ↓
3. Middleware (ログ出力)
   ↓
2. Lambda Handler
   ↓
1. API Gateway
```

## 依存関係の方向

クリーンアーキテクチャの原則に従い、依存関係は以下の方向のみ:

```
cmd → internal/usecase → internal/repository → internal/domain
 ↓           ↓                ↓
pkg     internal/validator  internal/observability
        internal/middleware
```

- `domain` は他のどの層にも依存しない（純粋なビジネスロジック）
- `usecase` は `domain` と `repository` インターフェースに依存
- `cmd` は `usecase` に依存

この構成により、ビジネスロジックが技術的な詳細（DBやHTTP）から独立し、テストしやすくなります。

## Go言語初心者向けの補足

### `internal/` と `pkg/` の違い

| 項目 | `internal/` | `pkg/` |
|------|------------|--------|
| 外部からのインポート | **不可**（Go言語の仕様で禁止） | **可能** |
| 用途 | プロジェクト固有のコード | 汎用的で再利用可能なコード |
| 例 | ビジネスロジック、リポジトリ実装 | エラー定義、レスポンスフォーマット |

### インターフェースを使う理由

Go言語では、インターフェースを使って「契約」を定義します。

```go
// インターフェース定義（契約）
type ReservationRepository interface {
    Create(ctx context.Context, reservation *entity.Reservation) error
}

// DynamoDB実装
type DynamoDBReservationRepository struct { /* ... */ }
func (r *DynamoDBReservationRepository) Create(...) error { /* ... */ }

// テスト用モック実装
type MockReservationRepository struct { /* ... */ }
func (r *MockReservationRepository) Create(...) error { /* ... */ }
```

ユースケースはインターフェースに依存するため、本番ではDynamoDB実装を、テストではモック実装を注入できます。

### パッケージの命名規則

- **小文字のみ**: `repository`, `usecase`, `apierror`（アンダースコアやキャメルケースは使わない）
- **短く明確に**: `repo` より `repository` の方が明確
- **複数形は避ける**: `entities` ではなく `entity`

## 次のステップ

1. `go.mod` を初期化: `go mod init github.com/your-org/zebra-application`
2. 必要なライブラリをインストール（AWS SDK, Lambda SDK など）
3. `internal/domain/entity/` にエンティティを定義
4. `internal/repository/` にリポジトリインターフェースを定義
5. `internal/usecase/` にユースケースを実装
6. `cmd/` にLambdaハンドラーを実装

---

**最終更新日**: 2026-03-27
