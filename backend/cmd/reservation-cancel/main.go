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
	reservationUsecase *usecase.ReservationUsecase
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo := repository.NewReservationRepository(dynamoClient)
	userRepo := repository.NewUserRepository(dynamoClient)
	planRepo := repository.NewPlanRepository(dynamoClient)
	blockedSlotRepo := repository.NewBlockedSlotRepository(dynamoClient)
	studioRepo := repository.NewStudioRepository(dynamoClient)

	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepo,
		blockedSlotRepo,
		studioRepo,
	)
}

type CancelReservationResponse struct {
	ReservationID string `json:"reservation_id"`
	Status        string `json:"status"`
	CancelledBy   string `json:"cancelled_by"`
	CancelledAt   string `json:"cancelled_at"`
}

func cancelReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	// コンテキストからロールとユーザーIDを取得
	role := middleware.GetRoleFromContext(ctx)
	userID := middleware.GetUserIDFromContext(ctx)

	// 予約を取得して所有者チェック（顧客の場合のみ）
	reservation, err := reservationUsecase.GetReservation(ctx, reservationID)
	if err != nil {
		if err == apierror.ErrReservationNotFound {
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		}
		log.Printf("Failed to get reservation: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// 顧客は自分の予約のみキャンセル可能
	if role == string(middleware.RoleCustomer) && reservation.UserID != userID {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// キャンセル実行者を判定
	var cancelledBy string
	if role == string(middleware.RoleAdmin) {
		cancelledBy = "owner" // 管理者がキャンセル
	} else {
		cancelledBy = "customer" // 顧客がキャンセル
	}

	// 予約をキャンセル
	reservation, err = reservationUsecase.CancelReservation(ctx, reservationID, cancelledBy)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		default:
			log.Printf("Failed to cancel reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := CancelReservationResponse{
		ReservationID: reservation.ReservationID,
		Status:        string(reservation.Status),
		CancelledBy:   reservation.CancelledBy,
		CancelledAt:   reservation.CancelledAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(cancelReservationHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
