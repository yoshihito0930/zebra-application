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
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
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

type UpdateReservationRequest struct {
	Date            *string `json:"date,omitempty"`
	StartTime       *string `json:"start_time,omitempty"`
	EndTime         *string `json:"end_time,omitempty"`
	Note            *string `json:"note,omitempty"`
	ShootingDetails *string `json:"shooting_details,omitempty"`
}

type UpdateReservationResponse struct {
	ReservationID string `json:"reservation_id"`
	Status        string `json:"status"`
	Date          string `json:"date"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	UpdatedAt     string `json:"updated_at"`
}

func updateReservationHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	reservationID := request.PathParameters["id"]
	if reservationID == "" {
		return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
	}

	var req UpdateReservationRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		return response.ErrorWithCORS(apierror.ErrValidation), nil
	}

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	if req.Date != nil {
		if validator.ValidateDateFormat(*req.Date, "date", validationResult) {
			validator.ValidateDateNotPast(*req.Date, "date", validationResult)
		}
	}

	if req.StartTime != nil {
		validator.ValidateTimeFormat(*req.StartTime, "start_time", validationResult)
	}

	if req.EndTime != nil {
		validator.ValidateTimeFormat(*req.EndTime, "end_time", validationResult)
	}

	if req.StartTime != nil && req.EndTime != nil {
		validator.ValidateTimeRange(*req.StartTime, *req.EndTime, validationResult)
	}

	if req.Note != nil {
		validator.ValidateStringLength(*req.Note, "note", 0, 500, validationResult)
	}

	if req.ShootingDetails != nil {
		validator.ValidateStringLength(*req.ShootingDetails, "shooting_details", 1, 500, validationResult)
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// ユースケースの入力データを作成
	input := usecase.UpdateReservationInput{
		ReservationID: reservationID,
	}

	if req.Date != nil {
		date, _ := time.Parse("2006-01-02", *req.Date)
		input.Date = &date
	}

	if req.StartTime != nil {
		input.StartTime = req.StartTime
	}

	if req.EndTime != nil {
		input.EndTime = req.EndTime
	}

	if req.Note != nil {
		input.Note = req.Note
	}

	if req.ShootingDetails != nil {
		input.ShootingDetails = req.ShootingDetails
	}

	// 予約を更新
	reservation, err := reservationUsecase.UpdateReservation(ctx, input)
	if err != nil {
		switch err {
		case apierror.ErrReservationNotFound:
			return response.ErrorWithCORS(apierror.ErrReservationNotFound), nil
		case apierror.ErrInvalidStatusTransition:
			return response.ErrorWithCORS(apierror.ErrInvalidStatusTransition), nil
		case apierror.ErrReservationConflict:
			return response.ErrorWithCORS(apierror.ErrReservationConflict), nil
		default:
			log.Printf("Failed to update reservation: %v", err)
			return response.ErrorWithCORS(apierror.ErrInternalServer), nil
		}
	}

	resp := UpdateReservationResponse{
		ReservationID: reservation.ReservationID,
		Status:        string(reservation.Status),
		Date:          reservation.Date.Format("2006-01-02"),
		StartTime:     reservation.StartTime,
		EndTime:       reservation.EndTime,
		UpdatedAt:     reservation.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(updateReservationHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
