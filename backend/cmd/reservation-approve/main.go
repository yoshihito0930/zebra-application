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

var (
	reservationUsecase *usecase.ReservationUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo := dynamodbRepo.NewPlanRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepo,
		blockedSlotRepo,
		studioRepo,
	)
}

type ApproveReservationResponse struct {
	ReservationID   string `json:"reservation_id"`
	ReservationType string `json:"reservation_type"`
	Status          string `json:"status"`
}

func approveReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	// 予約を承認
	reservation, err := reservationUsecase.ApproveReservation(ctx, reservationID)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to approve reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := ApproveReservationResponse{
		ReservationID:   reservation.ReservationID,
		ReservationType: string(reservation.ReservationType),
		Status:          string(reservation.Status),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(approveReservationHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
