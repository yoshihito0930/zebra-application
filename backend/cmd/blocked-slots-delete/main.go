package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/repository"
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
	blockedSlotRepo := repository.NewBlockedSlotRepository(dynamoClient)
	reservationRepo := repository.NewReservationRepository(dynamoClient)
	studioRepo := repository.NewStudioRepository(dynamoClient)

	blockedSlotUsecase = usecase.NewBlockedSlotUsecase(
		blockedSlotRepo,
		reservationRepo,
		studioRepo,
	)
}

type DeleteBlockedSlotResponse struct {
	Message string `json:"message"`
}

func deleteBlockedSlotHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータから取得
	blockedSlotID := request.PathParameters["id"]
	if blockedSlotID == "" {
		return response.ErrorWithCORS(apierror.ErrBlockedSlotNotFound), nil
	}

	// クエリパラメータからstudio_idを取得
	studioID := request.QueryStringParameters["studio_id"]
	if studioID == "" {
		log.Printf("studio_id is required")
		return response.ErrorWithCORS(apierror.ErrBadRequest), nil
	}

	// ブロック枠を削除
	err := blockedSlotUsecase.DeleteBlockedSlot(ctx, studioID, blockedSlotID)
	if err != nil {
		switch err {
		case apierror.ErrBlockedSlotNotFound:
			return response.ErrorWithCORS(apierror.ErrBlockedSlotNotFound), nil
		default:
			log.Printf("Failed to delete blocked slot: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := DeleteBlockedSlotResponse{
		Message: "ブロック枠を削除しました",
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(deleteBlockedSlotHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
