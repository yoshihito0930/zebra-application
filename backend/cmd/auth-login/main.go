package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/service"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	userRepo       repository.UserRepository
	cognitoService *service.CognitoService
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
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)

	// Cognitoサービスを初期化
	cognitoService = service.NewCognitoService(cfg)
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

	// 1. Cognitoで認証を行う
	loginInput := service.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	}

	loginResult, err := cognitoService.Login(ctx, loginInput)
	if err != nil {
		log.Printf("Failed to login with Cognito: %v", err)
		return response.ErrorWithCORS(apierror.ErrAuthLoginFailed), nil
	}

	// 2. DynamoDBからユーザー情報を取得
	user, err := userRepo.FindByEmail(ctx, req.Email)
	if err != nil || user == nil {
		// Cognito認証は成功したがDynamoDBにユーザー情報がない場合
		// （データ不整合のケース）
		log.Printf("User authenticated by Cognito but not found in DynamoDB: %v", err)
		return response.ErrorWithCORS(apierror.ErrAuthLoginFailed), nil
	}

	// レスポンスを作成
	resp := LoginResponse{
		AccessToken:  loginResult.IDToken,      // CognitoのIDトークンを使用
		RefreshToken: loginResult.RefreshToken, // Cognitoのリフレッシュトークン
		ExpiresIn:    int(loginResult.ExpiresIn),
		User: UserInfo{
			UserID: user.UserID,
			Name:   user.Name,
			Role:   string(user.Role),
		},
	}

	return response.OKWithCORS(resp), nil
}

func main() {
	lambda.Start(handler)
}
