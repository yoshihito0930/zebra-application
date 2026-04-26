package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
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
	InquiryTitle  string `json:"inquiry_title"`
	InquiryStatus string `json:"inquiry_status"`
	CreatedAt     string `json:"created_at"`
}

// InquiryListResponse は問い合わせ一覧レスポンスの構造体
type InquiryListResponse struct {
	Inquiries []InquirySummary `json:"inquiries"`
}

func listMyInquiriesHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// コンテキストからユーザーIDを取得
	userID := middleware.GetUserIDFromContext(ctx)

	// 問い合わせ一覧を取得
	inquiries, err := inquiryUsecase.ListUserInquiries(ctx, userID)
	if err != nil {
		switch err {
		case apierror.ErrUserNotFound:
			return response.ErrorWithCORS(apierror.ErrUserNotFound), nil
		default:
			log.Printf("Failed to list user inquiries: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// レスポンスを作成
	summaries := make([]InquirySummary, len(inquiries))
	for i, inq := range inquiries {
		summaries[i] = InquirySummary{
			InquiryID:     inq.InquiryID,
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
	authHandler := middleware.MockAuthMiddleware(listMyInquiriesHandler)

	// 認可ミドルウェアを適用（customer のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
