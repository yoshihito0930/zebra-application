package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
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

// InquirySummary は問い合わせサマリーの構造体
type InquirySummary struct {
	InquiryID     string `json:"inquiry_id"`
	UserID        string `json:"user_id"`
	InquiryTitle  string `json:"inquiry_title"`
	InquiryStatus string `json:"inquiry_status"`
	CreatedAt     string `json:"created_at"`
}

// InquiryListResponse は問い合わせ一覧レスポンスの構造体
type InquiryListResponse struct {
	Inquiries []InquirySummary `json:"inquiries"`
}

func listInquiriesHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// クエリパラメータを取得
	studioID := request.QueryStringParameters["studio_id"]
	statusFilter := request.QueryStringParameters["status"]

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	validator.ValidateRequired(studioID, "studio_id", validationResult)

	// ステータスフィルタがある場合はバリデーション
	if statusFilter != "" {
		validator.ValidateEnum(statusFilter, "status", []string{"open", "replied", "closed"}, validationResult)
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// スタジオスコープチェック（adminは所属スタジオのみアクセス可能）
	userStudioID := middleware.GetStudioIDFromContext(ctx)
	if studioID != userStudioID {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// ListInquiriesInputを作成
	input := usecase.ListInquiriesInput{
		StudioID: studioID,
	}

	// ステータスフィルタがある場合
	if statusFilter != "" {
		status := entity.InquiryStatus(statusFilter)
		input.Status = &status
	}

	// 問い合わせ一覧を取得
	inquiries, err := inquiryUsecase.ListInquiries(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		default:
			log.Printf("Failed to list inquiries: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// レスポンスを作成
	summaries := make([]InquirySummary, len(inquiries))
	for i, inq := range inquiries {
		summaries[i] = InquirySummary{
			InquiryID:     inq.InquiryID,
			UserID:        inq.UserID,
			InquiryTitle:  inq.InquiryTitle,
			InquiryStatus: string(inq.InquiryStatus),
			CreatedAt:     inq.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	resp := InquiryListResponse{
		Inquiries: summaries,
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(listInquiriesHandler)

	// 認可ミドルウェアを適用（admin のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
