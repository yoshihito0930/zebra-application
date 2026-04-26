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
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	inquiryUsecase *usecase.InquiryUsecase
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
	inquiryRepo := dynamodbRepo.NewInquiryRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	// ユースケースを初期化
	inquiryUsecase = usecase.NewInquiryUsecase(
		inquiryRepo,
		userRepo,
		studioRepo,
	)
}

// CreateInquiryRequest は問い合わせ作成リクエストの構造体
type CreateInquiryRequest struct {
	StudioID      string `json:"studio_id"`
	InquiryTitle  string `json:"inquiry_title"`
	InquiryDetail string `json:"inquiry_detail"`
}

// CreateInquiryResponse は問い合わせ作成レスポンスの構造体
type CreateInquiryResponse struct {
	InquiryID     string `json:"inquiry_id"`
	StudioID      string `json:"studio_id"`
	InquiryTitle  string `json:"inquiry_title"`
	InquiryStatus string `json:"inquiry_status"`
	CreatedAt     string `json:"created_at"`
}

func createInquiryHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// リクエストボディをパース
	var req CreateInquiryRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	// 必須フィールドのチェック
	validator.ValidateRequired(req.StudioID, "studio_id", validationResult)
	validator.ValidateRequired(req.InquiryTitle, "inquiry_title", validationResult)
	validator.ValidateRequired(req.InquiryDetail, "inquiry_detail", validationResult)

	// 文字列長のチェック
	if req.InquiryTitle != "" {
		validator.ValidateStringLength(req.InquiryTitle, "inquiry_title", 1, 100, validationResult)
	}
	if req.InquiryDetail != "" {
		validator.ValidateStringLength(req.InquiryDetail, "inquiry_detail", 1, 2000, validationResult)
	}

	// バリデーションエラーがあればエラーレスポンスを返す
	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// コンテキストからユーザーIDを取得
	userID := middleware.GetUserIDFromContext(ctx)

	// ユースケースの入力データを作成
	input := usecase.CreateInquiryInput{
		StudioID:      req.StudioID,
		UserID:        userID,
		InquiryTitle:  req.InquiryTitle,
		InquiryDetail: req.InquiryDetail,
	}

	// 問い合わせを作成
	inquiry, err := inquiryUsecase.CreateInquiry(ctx, input)
	if err != nil {
		// 業務エラーのハンドリング
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		case apierror.ErrUserNotFound:
			return response.ErrorWithCORS(apierror.ErrUserNotFound), nil
		default:
			log.Printf("Failed to create inquiry: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// レスポンスを作成
	resp := CreateInquiryResponse{
		InquiryID:     inquiry.InquiryID,
		StudioID:      inquiry.StudioID,
		InquiryTitle:  inquiry.InquiryTitle,
		InquiryStatus: string(inquiry.InquiryStatus),
		CreatedAt:     inquiry.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.CreatedWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(createInquiryHandler)

	// 認可ミドルウェアを適用（customer のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
