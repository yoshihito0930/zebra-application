# 認証方式移行計画: モック認証 → AWS Cognito

このドキュメントは、MVP（Phase 1）で実装したモック認証から、本番環境で使用するAWS Cognito認証への移行手順をまとめたものです。

**最終更新日**: 2026-04-13

---

## 背景

### Phase 1（MVP）での実装方針

MVP段階では、以下の理由でモック認証を採用しました:

1. **運用コスト削減**: AWS Cognitoは50,000 MAU（月間アクティブユーザー）まで無料ですが、それ以降は従量課金。MVP検証期間中はコストを0円に抑える。
2. **実装速度**: モック認証はシンプルで、開発速度を優先。
3. **切り替え容易性**: ミドルウェア層に認証ロジックを隔離しているため、後からCognitoに切り替えやすい設計。

### 移行タイミング

以下のいずれかの条件を満たしたタイミングで、Cognitoへの移行を検討してください:

1. **ユーザー数の増加**: 月間アクティブユーザー数が40,000人を超えたとき（無料枠50,000人に余裕を持って移行）
2. **セキュリティ要件の強化**: MFA（多要素認証）、パスワードポリシー強化が必要になったとき
3. **本番環境への移行**: MVP検証が成功し、正式に本番リリースするとき

---

## モック認証の仕組み（Phase 1実装）

### 実装場所
- [backend/internal/middleware/auth.go](../backend/internal/middleware/auth.go)

### 仕組みの概要

1. **ログイン時**:
   - ユーザーがメールアドレス・パスワードを送信
   - パスワードをbcryptでハッシュ化してusersテーブルと照合
   - 一致すれば、**JWT（JSON Web Token）**を発行して返却

2. **API呼び出し時**:
   - リクエストヘッダの `Authorization: Bearer <token>` からトークンを取得
   - JWTを検証（署名検証、有効期限チェック）
   - トークンからユーザー情報（user_id、role、studio_id）を抽出
   - コンテキストに格納し、後続のハンドラーで使用

### JWTの内容（ペイロード）

```json
{
  "user_id": "usr_001",
  "email": "yamada@example.com",
  "role": "customer",
  "studio_id": "studio_001",
  "exp": 1678901234
}
```

### セキュリティ上の制限

- **JWTの署名鍵**: 環境変数 `JWT_SECRET` で設定（開発環境のみ）
- **有効期限**: 1時間（リフレッシュトークンは未実装）
- **パスワードハッシュ**: bcryptを使用（コスト10）

### モック認証のリスク

- JWT署名鍵が漏洩すると、誰でもトークンを偽造可能
- リフレッシュトークンがないため、1時間ごとに再ログインが必要
- パスワードリセット機能がない（ユーザーが自分でパスワードを変更できない）

---

## AWS Cognitoの仕組み

### Cognitoの主要機能

1. **ユーザープール**: ユーザー情報（メールアドレス、パスワード、属性）を管理
2. **認証フロー**: ログイン、サインアップ、パスワードリセット、MFA
3. **トークン発行**: アクセストークン、IDトークン、リフレッシュトークンを発行
4. **トークン検証**: AWSが署名したJWTトークンを検証（公開鍵で検証可能）

### Cognitoのトークン

Cognitoは3種類のトークンを発行します:

| トークン | 用途 | 有効期限 |
|---------|------|---------|
| **アクセストークン** | API Gateway/Lambdaの認証に使用 | 1時間（カスタマイズ可能） |
| **IDトークン** | ユーザー情報（属性）を含む | 1時間 |
| **リフレッシュトークン** | アクセストークンの再発行に使用 | 30日（カスタマイズ可能） |

### Cognitoのメリット

- **セキュリティ**: AWSが管理するため、トークン偽造のリスクが低い
- **リフレッシュトークン**: 1時間ごとに再ログイン不要
- **パスワードリセット**: メールでリセットリンクを送信
- **MFA対応**: SMS、TOTPアプリ（Google Authenticatorなど）でMFA可能
- **パスワードポリシー**: 最小文字数、記号必須など、細かく設定可能

---

## 移行手順

### ステップ1: AWS Cognitoユーザープールの作成

#### 1.1 Terraformでの定義

[terraform/modules/cognito/main.tf](../terraform/modules/cognito/main.tf) に以下を追加:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "zebra-studio-${var.environment}"

  # パスワードポリシー
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # 自動検証（メールアドレス確認）
  auto_verified_attributes = ["email"]

  # ユーザー属性（カスタム属性）
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = false # 作成後は変更不可
    required            = true
  }

  schema {
    name                = "studio_id"
    attribute_data_type = "String"
    mutable             = false
    required            = false # customerは不要
  }

  # アカウントリカバリー
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# アプリクライアント（フロントエンドからのアクセス用）
resource "aws_cognito_user_pool_client" "app_client" {
  name         = "zebra-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # トークンの有効期限
  access_token_validity  = 1  # 1時間
  id_token_validity      = 1  # 1時間
  refresh_token_validity = 30 # 30日

  # 認証フロー
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # OAuth設定（将来的にSNSログインを追加する場合）
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["https://yourdomain.com/callback"]
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}
```

#### 1.2 Terraformのデプロイ

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

#### 1.3 環境変数の設定

Lambda関数の環境変数に以下を追加:

```bash
COGNITO_USER_POOL_ID=<terraform output から取得>
COGNITO_CLIENT_ID=<terraform output から取得>
AWS_REGION=ap-northeast-1
```

---

### ステップ2: 既存ユーザーデータの移行

#### 2.1 ユーザーインポートCSVの作成

DynamoDBの `users` テーブルからユーザー情報をエクスポートし、Cognito用のCSVファイルを作成:

```csv
name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,cognito:mfa_enabled,cognito:username,custom:role,custom:studio_id
山田太郎,,,,,,,,,yamada@example.com,true,,,,,,,,0,false,yamada@example.com,customer,
鈴木花子,,,,,,,,,suzuki@example.com,true,,,,,,,,0,false,suzuki@example.com,staff,studio_001
```

**重要な列**:
- `email`: ユーザーのメールアドレス
- `email_verified`: `true` に設定（メール確認済みとして扱う）
- `cognito:username`: ログイン時に使用するユーザー名（メールアドレスと同じでOK）
- `custom:role`: カスタム属性（customer / admin / staff）
- `custom:studio_id`: スタッフ・管理者の所属スタジオID

#### 2.2 Cognitoへのインポート

AWS CLIでユーザーをインポート:

```bash
aws cognito-idp create-user-import-job \
  --user-pool-id <USER_POOL_ID> \
  --job-name "InitialUserImport" \
  --cloud-watch-logs-role-arn <CLOUDWATCH_ROLE_ARN>

# S3にCSVをアップロード
aws s3 cp users.csv s3://<BUCKET_NAME>/users.csv

# インポートジョブを開始
aws cognito-idp start-user-import-job \
  --user-pool-id <USER_POOL_ID> \
  --job-id <JOB_ID>
```

#### 2.3 パスワードの扱い

**重要**: Cognitoはbcryptハッシュをそのままインポートできません。以下の2つの選択肢があります:

##### 選択肢A: パスワードリセットを促す（推奨）
1. Cognitoにユーザーをインポート（パスワードなし、`FORCE_CHANGE_PASSWORD` ステータス）
2. ユーザーに「パスワードリセットメール」を送信
3. ユーザーが新しいパスワードを設定

##### 選択肢B: 一時パスワードを発行
1. ランダムな一時パスワードを生成してCSVに含める
2. Cognitoにインポート
3. ユーザーに一時パスワードをメールで送信
4. 初回ログイン時にパスワード変更を強制

**推奨**: 選択肢Aの方がセキュアです。

---

### ステップ3: ミドルウェアの実装変更

#### 3.1 Cognito用の認証ミドルウェアを作成

[backend/internal/middleware/cognito_auth.go](../backend/internal/middleware/cognito_auth.go) を新規作成:

```go
package middleware

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// CognitoAuthMiddleware はCognitoトークンを検証するミドルウェア
func CognitoAuthMiddleware(next Handler) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// Authorizationヘッダーを取得
		authHeader := request.Headers["Authorization"]
		if authHeader == "" {
			return response.ErrorWithCORS(apierror.ErrAuthTokenMissing), nil
		}

		// "Bearer <token>" の形式をチェック
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}
		token := parts[1]

		// Cognitoの公開鍵を取得（JWKSエンドポイント）
		region := os.Getenv("AWS_REGION")
		userPoolID := os.Getenv("COGNITO_USER_POOL_ID")
		jwksURL := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", region, userPoolID)

		// JWKSを取得してキャッシュ（パフォーマンス向上）
		keySet, err := jwk.Fetch(ctx, jwksURL)
		if err != nil {
			return response.ErrorWithCORS(apierror.ErrInternalServer), err
		}

		// トークンを検証
		parsedToken, err := jwt.Parse([]byte(token), jwt.WithKeySet(keySet))
		if err != nil {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// トークンの有効期限をチェック
		if err := jwt.Validate(parsedToken); err != nil {
			return response.ErrorWithCORS(apierror.ErrAuthTokenExpired), nil
		}

		// カスタムクレームを取得
		userID := parsedToken.Subject() // Cognitoのユーザーサブジェクト（UUID）
		email, _ := parsedToken.Get("email")
		role, _ := parsedToken.Get("custom:role")
		studioID, _ := parsedToken.Get("custom:studio_id")

		// コンテキストに格納
		ctx = context.WithValue(ctx, "user_id", userID)
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "role", role)
		ctx = context.WithValue(ctx, "studio_id", studioID)

		return next(ctx, request)
	}
}
```

#### 3.2 認証ミドルウェアの切り替え

[backend/internal/middleware/auth.go](../backend/internal/middleware/auth.go) に環境変数で切り替えるロジックを追加:

```go
package middleware

import (
	"context"
	"os"

	"github.com/aws/aws-lambda-go/events"
)

// AuthMiddleware は環境変数で認証方式を切り替える
func AuthMiddleware(next Handler) Handler {
	authType := os.Getenv("AUTH_TYPE") // "mock" or "cognito"

	if authType == "cognito" {
		return CognitoAuthMiddleware(next)
	}

	// デフォルトはモック認証（開発環境）
	return MockAuthMiddleware(next)
}
```

#### 3.3 環境変数の設定

Lambda関数の環境変数に以下を追加:

```bash
# 本番環境
AUTH_TYPE=cognito

# 開発環境
AUTH_TYPE=mock
```

---

### ステップ4: サインアップ・ログインAPIの変更

#### 4.1 POST /auth/signup の変更

Cognito SDKを使用してユーザーを作成:

```go
package main

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func signUp(ctx context.Context, email, password, name, role string) error {
	cfg, _ := config.LoadDefaultConfig(ctx)
	client := cognitoidentityprovider.NewFromConfig(cfg)

	clientID := os.Getenv("COGNITO_CLIENT_ID")

	_, err := client.SignUp(ctx, &cognitoidentityprovider.SignUpInput{
		ClientId: &clientID,
		Username: &email,
		Password: &password,
		UserAttributes: []types.AttributeType{
			{Name: aws.String("email"), Value: &email},
			{Name: aws.String("name"), Value: &name},
			{Name: aws.String("custom:role"), Value: &role},
		},
	})

	return err
}
```

#### 4.2 POST /auth/login の変更

Cognito SDKを使用してログイン:

```go
func login(ctx context.Context, email, password string) (*LoginResponse, error) {
	cfg, _ := config.LoadDefaultConfig(ctx)
	client := cognitoidentityprovider.NewFromConfig(cfg)

	clientID := os.Getenv("COGNITO_CLIENT_ID")

	result, err := client.InitiateAuth(ctx, &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeUserPasswordAuth,
		ClientId: &clientID,
		AuthParameters: map[string]string{
			"USERNAME": email,
			"PASSWORD": password,
		},
	})

	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  *result.AuthenticationResult.AccessToken,
		RefreshToken: *result.AuthenticationResult.RefreshToken,
		ExpiresIn:    int(*result.AuthenticationResult.ExpiresIn),
	}, nil
}
```

---

### ステップ5: フロントエンドの変更

#### 5.1 ログイン処理の変更

フロントエンド（React）でCognitoトークンを使用:

```typescript
// src/api/auth.ts

export async function login(email: string, password: string) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // アクセストークンをlocalStorageに保存
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);

  return data;
}
```

#### 5.2 API呼び出し時のトークン送信

```typescript
// src/api/client.ts

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // トークン期限切れの場合、リフレッシュトークンで再取得
  if (response.status === 401) {
    await refreshAccessToken();
    // 再試行
    return apiRequest(url, options);
  }

  return response;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
}
```

---

### ステップ6: テストと検証

#### 6.1 ローカル環境でのテスト

1. Cognitoユーザープールを作成（dev環境）
2. Lambda関数の環境変数を `AUTH_TYPE=cognito` に設定
3. Postmanやcurlでログイン・API呼び出しをテスト

#### 6.2 移行期間中のハイブリッド認証

移行期間中は、モック認証とCognito認証の両方をサポートすることも可能:

```go
func AuthMiddleware(next Handler) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// まずCognito認証を試す
		resp, err := CognitoAuthMiddleware(next)(ctx, request)
		if err == nil && resp.StatusCode != 401 {
			return resp, err
		}

		// Cognito認証が失敗したら、モック認証を試す
		return MockAuthMiddleware(next)(ctx, request)
	}
}
```

---

## 移行チェックリスト

### 事前準備
- [ ] Terraformでユーザープールを作成
- [ ] 環境変数（COGNITO_USER_POOL_ID、COGNITO_CLIENT_ID）を設定
- [ ] 既存ユーザーをCSVでエクスポート

### 実装変更
- [ ] Cognito認証ミドルウェアを実装
- [ ] サインアップAPIをCognito SDKに変更
- [ ] ログインAPIをCognito SDKに変更
- [ ] リフレッシュトークンAPIを追加
- [ ] フロントエンドのログイン処理を変更

### ユーザー移行
- [ ] Cognitoにユーザーをインポート
- [ ] ユーザーにパスワードリセットメールを送信
- [ ] ユーザーが新しいパスワードを設定

### テスト
- [ ] dev環境でログイン・API呼び出しをテスト
- [ ] トークン有効期限切れのテスト
- [ ] リフレッシュトークンのテスト
- [ ] ロール別の認可テスト（customer / admin / staff）

### 本番デプロイ
- [ ] prod環境にCognitoユーザープールを作成
- [ ] Lambda関数の環境変数を `AUTH_TYPE=cognito` に変更
- [ ] フロントエンドをデプロイ
- [ ] 本番環境でログイン・API呼び出しをテスト
- [ ] 既存ユーザーへの移行案内メールを送信

---

## トラブルシューティング

### Q1: トークン検証で `invalid signature` エラーが出る

**原因**: JWKSのキャッシュが古い、またはリージョン設定が間違っている

**解決策**:
- 環境変数 `AWS_REGION` が正しいか確認
- JWKS URLが正しいか確認: `https://cognito-idp.ap-northeast-1.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json`

### Q2: カスタム属性（custom:role）が取得できない

**原因**: アプリクライアントの設定で、カスタム属性の読み取り権限がない

**解決策**:
- Cognitoコンソールで「アプリクライアント設定」→「読み取り可能な属性」にカスタム属性を追加

### Q3: ユーザーインポート後、ログインできない

**原因**: パスワードがインポートされていない

**解決策**:
- ユーザーに「パスワードリセット」メールを送信
- または、一時パスワードを設定してユーザーに通知

---

## 参照リソース

- [AWS Cognito公式ドキュメント](https://docs.aws.amazon.com/cognito/)
- [Cognito料金](https://aws.amazon.com/jp/cognito/pricing/)
- [JWTトークンの検証（Go）](https://github.com/lestrrat-go/jwx)

---

**最終更新日**: 2026-04-13
