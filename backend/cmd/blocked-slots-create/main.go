package main

import (
	"context"
	"encoding/json"
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

type CreateBlockedSlotRequest struct {
	StudioID  string  `json:"studio_id"`
	Date      string  `json:"date"`
	IsAllDay  bool    `json:"is_all_day"`
	StartTime *string `json:"start_time,omitempty"`
	EndTime   *string `json:"end_time,omitempty"`
	Reason    string  `json:"reason"`
}

type CreateBlockedSlotResponse struct {
	BlockedSlotID string  `json:"blocked_slot_id"`
	StudioID      string  `json:"studio_id"`
	Date          string  `json:"date"`
	IsAllDay      bool    `json:"is_all_day"`
	StartTime     *string `json:"start_time,omitempty"`
	EndTime       *string `json:"end_time,omitempty"`
	Reason        string  `json:"reason"`
	CreatedAt     string  `json:"created_at"`
}

func createBlockedSlotHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// リクエストボディをパース
	var req CreateBlockedSlotRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		log.Printf("Failed to unmarshal request body: %v", err)
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// 日付のパース
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		log.Printf("Invalid date format: %v", err)
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// バリデーション: 全日でない場合は時間指定が必須
	if !req.IsAllDay && (req.StartTime == nil || req.EndTime == nil) {
		log.Printf("StartTime and EndTime are required when IsAllDay is false")
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// ブロック枠を作成
	input := usecase.CreateBlockedSlotInput{
		StudioID:  req.StudioID,
		Date:      date,
		IsAllDay:  req.IsAllDay,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Reason:    req.Reason,
	}

	blockedSlot, err := blockedSlotUsecase.CreateBlockedSlot(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrStudioNotFound:
			return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
		case apierror.ErrReservationConflict:
			return response.ErrorWithCORS(apierror.ErrReservationConflict), nil
		default:
			log.Printf("Failed to create blocked slot: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := CreateBlockedSlotResponse{
		BlockedSlotID: blockedSlot.BlockedSlotID,
		StudioID:      blockedSlot.StudioID,
		Date:          blockedSlot.Date.Format("2006-01-02"),
		IsAllDay:      blockedSlot.IsAllDay,
		StartTime:     blockedSlot.StartTime,
		EndTime:       blockedSlot.EndTime,
		Reason:        blockedSlot.Reason,
		CreatedAt:     blockedSlot.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.CreatedWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(createBlockedSlotHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
