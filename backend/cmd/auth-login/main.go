package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

// グローバル変数（コールドスタート対策）
var (
	userUsecase *usecase.UserUsecase
)

// init は Lambda 関数の初期化時に1度だけ実行される
func init() {
	// AWS SDK の設定をロード
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	// DynamoDB クライアントを作成
	dynamoClient := dynamodb.NewFromConfig(cfg)

	// リポジトリを初期化
	userRepo := repository.NewUserRepository(dynamoClient)

	// ユースケースを初期化
	userUsecase = usecase.NewUserUsecase(userRepo)
}

// LoginRequest はログインリクエストの構造体
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse はログインレスポンスの構造体
type LoginResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int      `json:"expires_in"`
	User         UserInfo `json:"user"`
}

// UserInfo はユーザー情報の構造体
type UserInfo struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
	Role   string `json:"role"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// リクエストボディをパース
	var req LoginRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	// 必須フィールドのチェック
	validator.ValidateRequired(req.Email, "email", validationResult)
	validator.ValidateRequired(req.Password, "password", validationResult)

	// メールアドレス形式のチェック
	validator.ValidateEmailFormat(req.Email, "email", validationResult)

	// バリデーションエラーがあればエラーレスポンスを返す
	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// メールアドレスからユーザーを取得
	user, err := userUsecase.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// ユーザーが見つからない場合もログイン失敗として扱う
		// （セキュリティ上、「ユーザーが存在しない」ことを明示しない）
		log.Printf("User not found or error: %v", err)
		return response.ErrorWithCORS(apierror.ErrAuthLoginFailed), nil
	}

	// パスワードを検証
	err = bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.Password))
	if err != nil {
		// パスワードが一致しない場合
		log.Printf("Password mismatch for user %s", user.UserID)
		return response.ErrorWithCORS(apierror.ErrAuthLoginFailed), nil
	}

	// モック認証用のJWTトークンを生成
	accessToken, err := middleware.GenerateMockToken(user.UserID, user.Email, user.Role, user.StudioID)
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// リフレッシュトークンの生成（MVP段階では未実装、Phase 2でCognito移行時に追加）
	refreshToken := ""

	// レスポンスを作成
	resp := LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600, // 1時間（秒単位）
		User: UserInfo{
			UserID: user.UserID,
			Name:   user.Name,
			Role:   user.Role,
		},
	}

	return response.OKWithCORS(resp), nil
}

func main() {
	lambda.Start(handler)
}
