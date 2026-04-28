package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/service"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	userUsecase    *usecase.UserUsecase
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
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	// Cognitoサービスを初期化
	cognitoService = service.NewCognitoService(cfg)

	// ユースケースを初期化
	userUsecase = usecase.NewUserUsecase(userRepo, studioRepo)
}

// SignUpRequest はサインアップリクエストの構造体
type SignUpRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phone_number"`
	CompanyName string `json:"company_name"`
	Address     string `json:"address"`
}

// SignUpResponse はサインアップレスポンスの構造体
type SignUpResponse struct {
	UserID    string `json:"user_id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// リクエストボディをパース
	var req SignUpRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	// 必須フィールドのチェック
	validator.ValidateRequired(req.Name, "name", validationResult)
	validator.ValidateRequired(req.Email, "email", validationResult)
	validator.ValidateRequired(req.Password, "password", validationResult)
	validator.ValidateRequired(req.PhoneNumber, "phone_number", validationResult)
	validator.ValidateRequired(req.Address, "address", validationResult)

	// 文字列長のチェック
	if req.Name != "" {
		validator.ValidateStringLength(req.Name, "name", 1, 50, validationResult)
	}
	if req.CompanyName != "" {
		validator.ValidateStringLength(req.CompanyName, "company_name", 0, 100, validationResult)
	}
	if req.Address != "" {
		validator.ValidateStringLength(req.Address, "address", 1, 200, validationResult)
	}

	// メールアドレス形式のチェック
	validator.ValidateEmailFormat(req.Email, "email", validationResult)

	// 電話番号形式のチェック
	validator.ValidatePhoneFormat(req.PhoneNumber, "phone_number", validationResult)

	// パスワード強度のチェック
	validator.ValidatePassword(req.Password, "password", validationResult)

	// バリデーションエラーがあればエラーレスポンスを返す
	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// 1. Cognitoにユーザーを登録
	// 電話番号をE.164形式に変換 (Cognito要件)
	// 例: 090-1234-5678 → +819012345678
	phoneE164 := convertToE164(req.PhoneNumber)

	cognitoInput := service.SignUpInput{
		Email:       req.Email,
		Password:    req.Password,
		Name:        req.Name,
		PhoneNumber: phoneE164,
		Address:     req.Address,
		CompanyName: req.CompanyName,
	}

	cognitoResult, err := cognitoService.SignUp(ctx, cognitoInput)
	if err != nil {
		log.Printf("Failed to sign up to Cognito: %v", err)
		// Cognitoのエラーをチェック（メールアドレス重複など）
		return response.ErrorWithCORS(apierror.ErrEmailAlreadyExists), nil
	}

	// 開発環境では自動でユーザーを確認状態にする
	if err := cognitoService.AdminConfirmSignUp(ctx, req.Email); err != nil {
		log.Printf("Warning: Failed to auto-confirm user: %v", err)
		// 確認失敗は警告のみでエラーにしない（本番では手動確認が必要）
	}

	// 2. DynamoDBにユーザー情報を保存
	var companyName *string
	if req.CompanyName != "" {
		companyName = &req.CompanyName
	}

	input := usecase.SignupInput{
		Name:        req.Name,
		Email:       req.Email,
		Password:    req.Password,
		PhoneNumber: req.PhoneNumber,
		CompanyName: companyName,
		Address:     req.Address,
	}

	user, err := userUsecase.Signup(ctx, input)
	if err != nil {
		// DynamoDBへの保存失敗時はCognitoユーザーも削除すべきだが、
		// MVP段階では省略（Phase 2で実装）
		log.Printf("Failed to create user in DynamoDB: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	log.Printf("User created successfully: cognito_sub=%s, user_id=%s", cognitoResult.UserSub, user.UserID)

	// レスポンスを作成
	resp := SignUpResponse{
		UserID:    user.UserID,
		Name:      user.Name,
		Email:     user.Email,
		Role:      string(user.Role),
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.CreatedWithCORS(resp), nil
}

// convertToE164 converts Japanese phone number format to E.164 format for Cognito
// Example: 090-1234-5678 → +819012345678
func convertToE164(phone string) string {
	// Remove hyphens and spaces
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, " ", "")

	// Replace leading 0 with +81 for Japanese numbers
	if len(phone) > 0 && phone[0] == '0' {
		return "+81" + phone[1:]
	}
	return phone
}

func main() {
	lambda.Start(handler)
}
