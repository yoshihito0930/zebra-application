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
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	inquiryRepo repository.InquiryRepository
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
	inquiryRepo = dynamodbRepo.NewInquiryRepository(dynamoClient)
}

// InquiryDetailResponse は問い合わせ詳細レスポンスの構造体
type InquiryDetailResponse struct {
	InquiryID     string  `json:"inquiry_id"`
	StudioID      string  `json:"studio_id"`
	UserID        string  `json:"user_id"`
	InquiryTitle  string  `json:"inquiry_title"`
	InquiryDetail string  `json:"inquiry_detail"`
	InquiryStatus string  `json:"inquiry_status"`
	ReplyDetail   *string `json:"reply_detail,omitempty"`
	RepliedAt     *string `json:"replied_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

func getInquiryHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータから問い合わせIDを取得
	inquiryID := request.PathParameters["id"]
	if inquiryID == "" {
		return response.ErrorWithCORS(apierror.ErrInquiryNotFound), nil
	}

	// クエリパラメータからstudio_idを取得
	studioID := request.QueryStringParameters["studio_id"]
	if studioID == "" {
		// studio_idが必須でない場合、コンテキストから取得することも可能
		// ただし、顧客の場合はstudio_idを持っていないため、エラーを返す
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// 問い合わせを取得
	inquiry, err := inquiryRepo.FindByID(ctx, studioID, inquiryID)
	if err != nil {
		log.Printf("Failed to get inquiry: %v", err)
		return response.ErrorWithCORS(apierror.ErrInquiryNotFound), nil
	}

	// 所有者チェック（顧客は自分の問い合わせのみ閲覧可能）
	userID := middleware.GetUserIDFromContext(ctx)
	role := middleware.GetRoleFromContext(ctx)

	// customerの場合は自分の問い合わせのみ
	if role == string(middleware.RoleCustomer) && inquiry.UserID != userID {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// adminの場合はスタジオスコープチェック
	if role == string(middleware.RoleAdmin) {
		userStudioID := middleware.GetStudioIDFromContext(ctx)
		if studioID != userStudioID {
			return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
		}
	}

	// レスポンスを作成
	resp := InquiryDetailResponse{
		InquiryID:     inquiry.InquiryID,
		StudioID:      inquiry.StudioID,
		UserID:        inquiry.UserID,
		InquiryTitle:  inquiry.InquiryTitle,
		InquiryDetail: inquiry.InquiryDetail,
		InquiryStatus: string(inquiry.InquiryStatus),
		CreatedAt:     inquiry.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     inquiry.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// オプショナルフィールドの設定
	if inquiry.ReplyDetail != nil {
		resp.ReplyDetail = inquiry.ReplyDetail
	}
	if inquiry.RepliedAt != nil && !inquiry.RepliedAt.IsZero() {
		repliedAtStr := inquiry.RepliedAt.Format("2006-01-02T15:04:05Z07:00")
		resp.RepliedAt = &repliedAtStr
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(getInquiryHandler)

	// 認可ミドルウェアを適用（customer, admin のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer, middleware.RoleAdmin)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
