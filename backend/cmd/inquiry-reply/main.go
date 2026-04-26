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

// ReplyInquiryRequest は問い合わせ回答リクエストの構造体
type ReplyInquiryRequest struct {
	ReplyDetail string `json:"reply_detail"`
}

// ReplyInquiryResponse は問い合わせ回答レスポンスの構造体
type ReplyInquiryResponse struct {
	InquiryID     string `json:"inquiry_id"`
	InquiryStatus string `json:"inquiry_status"`
	ReplyDetail   string `json:"reply_detail"`
	RepliedAt     string `json:"replied_at"`
}

func replyInquiryHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータから問い合わせIDを取得
	inquiryID := request.PathParameters["id"]
	if inquiryID == "" {
		return response.ErrorWithCORS(apierror.ErrInquiryNotFound), nil
	}

	// リクエストボディをパース
	var req ReplyInquiryRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	// 必須フィールドのチェック
	validator.ValidateRequired(req.ReplyDetail, "reply_detail", validationResult)

	// 文字列長のチェック
	if req.ReplyDetail != "" {
		validator.ValidateStringLength(req.ReplyDetail, "reply_detail", 1, 2000, validationResult)
	}

	// バリデーションエラーがあればエラーレスポンスを返す
	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// コンテキストからstudio_idを取得
	studioID := middleware.GetStudioIDFromContext(ctx)

	// ユースケースの入力データを作成
	input := usecase.ReplyInquiryInput{
		StudioID:    studioID,
		InquiryID:   inquiryID,
		ReplyDetail: req.ReplyDetail,
	}

	// 問い合わせに回答
	inquiry, err := inquiryUsecase.ReplyInquiry(ctx, input)
	if err != nil {
		// 業務エラーのハンドリング
		switch err {
		case apierror.ErrInquiryNotFound:
			return response.ErrorWithCORS(apierror.ErrInquiryNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to reply inquiry: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// レスポンスを作成
	resp := ReplyInquiryResponse{
		InquiryID:     inquiry.InquiryID,
		InquiryStatus: string(inquiry.InquiryStatus),
		ReplyDetail:   *inquiry.ReplyDetail,
		RepliedAt:     inquiry.RepliedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(replyInquiryHandler)

	// 認可ミドルウェアを適用（admin のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
