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
	"github.com/yoshihito0930/zebra-application/internal/helper"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

var (
	reservationUsecase *usecase.ReservationUsecase
	planRepo           repository.PlanRepository
	optionRepo         repository.OptionRepository
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo = dynamodbRepo.NewPlanRepository(dynamoClient)
	optionRepo = dynamodbRepo.NewOptionRepository(dynamoClient)
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

// ReservationDetailResponse は予約詳細レスポンス（helper.ReservationResponseに追加フィールドを含む）
type ReservationDetailResponse struct {
	helper.ReservationResponse
	CancelledBy         string `json:"cancelled_by,omitempty"`
	CancelledAt         string `json:"cancelled_at,omitempty"`
	PromotedFrom        string `json:"promoted_from,omitempty"`
	PromotedAt          string `json:"promoted_at,omitempty"`
	LinkedReservationID string `json:"linked_reservation_id,omitempty"`
	ExpiryDate          string `json:"expiry_date,omitempty"`
	UpdatedAt           string `json:"updated_at"`
}

func getReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	reservation, err := reservationUsecase.GetReservation(ctx, reservationID)
	if err != nil {
		if err == apierror.ErrReservationNotFound {
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		}
		log.Printf("Failed to get reservation: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// 所有者チェック（顧客は自分の予約のみ閲覧可能）
	if !middleware.CheckOwnership(ctx, reservation.UserID) {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// helperを使って基本レスポンスを構築
	baseResp := helper.BuildReservationResponse(ctx, reservation, planRepo, optionRepo)

	// 詳細レスポンスを作成（追加フィールドを含む）
	resp := ReservationDetailResponse{
		ReservationResponse: baseResp,
		UpdatedAt:           reservation.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// オプショナルフィールドの設定
	if reservation.CancelledBy != nil {
		resp.CancelledBy = string(*reservation.CancelledBy)
	}
	if reservation.CancelledAt != nil && !reservation.CancelledAt.IsZero() {
		resp.CancelledAt = reservation.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if reservation.PromotedFrom != nil {
		resp.PromotedFrom = string(*reservation.PromotedFrom)
	}
	if reservation.PromotedAt != nil && !reservation.PromotedAt.IsZero() {
		resp.PromotedAt = reservation.PromotedAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if reservation.LinkedReservationID != nil {
		resp.LinkedReservationID = *reservation.LinkedReservationID
	}
	if reservation.ExpiryDate != nil && !reservation.ExpiryDate.IsZero() {
		resp.ExpiryDate = reservation.ExpiryDate.Format("2006-01-02")
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(getReservationHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer, middleware.RoleAdmin, middleware.RoleStaff)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
