package middleware

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/golang-jwt/jwt/v5"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// MockAuthMiddleware はモック認証を行うミドルウェア
// MVP（開発・テスト）環境でのみ使用。本番環境ではCognito認証に切り替える。
//
// 動作:
//  1. Authorizationヘッダーから "Bearer <token>" を取得
//  2. JWTトークンを検証（署名、有効期限）
//  3. トークンからユーザー情報（user_id, email, role, studio_id）を抽出
//  4. コンテキストに格納し、後続のハンドラーで使用可能にする
//
// セキュリティ上の注意:
//   - JWT署名鍵は環境変数 JWT_SECRET で設定（開発環境のみ）
//   - 本番環境では絶対に使用しないこと（トークン偽造のリスク）
//   - 本番環境への移行手順は docs/migration-plan.md を参照
func MockAuthMiddleware(next Handler) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// Authorizationヘッダーを取得
		authHeader := request.Headers["Authorization"]
		if authHeader == "" {
			// 大文字・小文字の違いに対応（API Gatewayは小文字に正規化することがある）
			authHeader = request.Headers["authorization"]
		}

		if authHeader == "" {
			return response.ErrorWithCORS(apierror.ErrAuthTokenMissing), nil
		}

		// "Bearer <token>" の形式をチェック
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}
		tokenString := parts[1]

		// JWTトークンを検証
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// 署名アルゴリズムの確認（HMAC以外は拒否）
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			// 環境変数から署名鍵を取得
			secret := os.Getenv("JWT_SECRET")
			if secret == "" {
				// デフォルト値（開発環境のみ）
				// 本番環境では必ず環境変数を設定すること
				secret = "default-dev-secret-key-do-not-use-in-production"
			}

			return []byte(secret), nil
		})

		if err != nil {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// トークンの有効性をチェック
		if !token.Valid {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// クレーム（ペイロード）を取得
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// 有効期限をチェック
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				return response.ErrorWithCORS(apierror.ErrAuthTokenExpired), nil
			}
		} else {
			// 有効期限がない場合はエラー
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// ユーザー情報を抽出
		userID, _ := claims["user_id"].(string)
		email, _ := claims["email"].(string)
		role, _ := claims["role"].(string)
		studioID, _ := claims["studio_id"].(string)

		// 必須フィールドのチェック
		if userID == "" || email == "" || role == "" {
			return response.ErrorWithCORS(apierror.ErrAuthTokenInvalid), nil
		}

		// コンテキストに格納
		ctx = context.WithValue(ctx, UserIDKey, userID)
		ctx = context.WithValue(ctx, EmailKey, email)
		ctx = context.WithValue(ctx, RoleKey, role)
		ctx = context.WithValue(ctx, StudioIDKey, studioID)

		// 次のハンドラーに処理を委譲
		return next(ctx, request)
	}
}

// GenerateMockToken はモック認証用のJWTトークンを生成する
// サインアップ・ログイン時に使用
func GenerateMockToken(userID, email, role, studioID string) (string, error) {
	// 環境変数から署名鍵を取得
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default-dev-secret-key-do-not-use-in-production"
	}

	// クレーム（ペイロード）を作成
	claims := jwt.MapClaims{
		"user_id":   userID,
		"email":     email,
		"role":      role,
		"studio_id": studioID,
		"exp":       time.Now().Add(1 * time.Hour).Unix(), // 1時間後に期限切れ
		"iat":       time.Now().Unix(),                    // 発行時刻
	}

	// トークンを生成
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 署名して文字列化
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
