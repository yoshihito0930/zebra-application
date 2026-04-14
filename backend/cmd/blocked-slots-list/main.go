package main

import (
	"context"
	"log"
	"time"

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

var (
	blockedSlotUsecase *usecase.BlockedSlotUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	blockedSlotUsecase = usecase.NewBlockedSlotUsecase(
		blockedSlotRepo,
		reservationRepo,
		studioRepo,
	)
}

type BlockedSlotItem struct {
	BlockedSlotID string  `json:"blocked_slot_id"`
	StudioID      string  `json:"studio_id"`
	Date          string  `json:"date"`
	IsAllDay      bool    `json:"is_all_day"`
	StartTime     *string `json:"start_time,omitempty"`
	EndTime       *string `json:"end_time,omitempty"`
	Reason        string  `json:"reason"`
	CreatedAt     string  `json:"created_at"`
}

type ListBlockedSlotsResponse struct {
	BlockedSlots []BlockedSlotItem `json:"blocked_slots"`
	Total        int               `json:"total"`
}

func listBlockedSlotsHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// クエリパラメータから取得
	studioID := request.QueryStringParameters["studio_id"]
	startDateStr := request.QueryStringParameters["start_date"]
	endDateStr := request.QueryStringParameters["end_date"]

	// バリデーション
	if studioID == "" {
		log.Printf("studio_id is required")
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}
	if startDateStr == "" || endDateStr == "" {
		log.Printf("start_date and end_date are required")
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// 日付のパース
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		log.Printf("Invalid start_date format: %v", err)
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}
	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		log.Printf("Invalid end_date format: %v", err)
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// ブロック枠一覧を取得
	input := usecase.ListBlockedSlotsInput{
		StudioID:  studioID,
		StartDate: startDate,
		EndDate:   endDate,
	}

	blockedSlots, err := blockedSlotUsecase.ListBlockedSlots(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		default:
			log.Printf("Failed to list blocked slots: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	// レスポンスを構築
	items := make([]BlockedSlotItem, 0, len(blockedSlots))
	for _, bs := range blockedSlots {
		items = append(items, BlockedSlotItem{
			BlockedSlotID: bs.BlockedSlotID,
			StudioID:      bs.StudioID,
			Date:          bs.Date.Format("2006-01-02"),
			IsAllDay:      bs.IsAllDay,
			StartTime:     bs.StartTime,
			EndTime:       bs.EndTime,
			Reason:        bs.Reason,
			CreatedAt:     bs.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	resp := ListBlockedSlotsResponse{
		BlockedSlots: items,
		Total:        len(items),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(listBlockedSlotsHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
