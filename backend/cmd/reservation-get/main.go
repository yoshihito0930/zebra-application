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

type OptionSnapshot struct {
	OptionID   string  `json:"option_id"`
	OptionName string  `json:"option_name"`
	Price      int     `json:"price"`
	TaxRate    float64 `json:"tax_rate"`
}

type ReservationDetailResponse struct {
	ReservationID       string           `json:"reservation_id"`
	StudioID            string           `json:"studio_id"`
	UserID              string           `json:"user_id"`
	ReservationType     string           `json:"reservation_type"`
	Status              string           `json:"status"`
	PlanID              string           `json:"plan_id"`
	PlanName            string           `json:"plan_name"`
	PlanPrice           int              `json:"plan_price"`
	PlanTaxRate         float64          `json:"plan_tax_rate"`
	Date                string           `json:"date"`
	StartTime           string           `json:"start_time"`
	EndTime             string           `json:"end_time"`
	Options             []OptionSnapshot `json:"options"`
	ShootingType        []string         `json:"shooting_type"`
	ShootingDetails     string           `json:"shooting_details"`
	PhotographerName    string           `json:"photographer_name"`
	NumberOfPeople      int              `json:"number_of_people"`
	NeedsProtection     bool             `json:"needs_protection"`
	EquipmentInsurance  bool             `json:"equipment_insurance"`
	Note                string           `json:"note"`
	CancelledBy         string           `json:"cancelled_by"`
	CancelledAt         string           `json:"cancelled_at"`
	PromotedFrom        string           `json:"promoted_from"`
	PromotedAt          string           `json:"promoted_at"`
	LinkedReservationID string           `json:"linked_reservation_id"`
	ExpiryDate          string           `json:"expiry_date"`
	CreatedAt           string           `json:"created_at"`
	UpdatedAt           string           `json:"updated_at"`
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

	// レスポンスを作成
	options := make([]OptionSnapshot, len(reservation.Options))
	for i, opt := range reservation.Options {
		options[i] = OptionSnapshot{
			OptionID:   opt.OptionID,
			OptionName: opt.OptionName,
			Price:      opt.Price,
			TaxRate:    opt.TaxRate,
		}
	}

	shootingTypes := make([]string, len(reservation.ShootingType))
	for i, st := range reservation.ShootingType {
		shootingTypes[i] = string(st)
	}

	resp := ReservationDetailResponse{
		ReservationID:       reservation.ReservationID,
		StudioID:            reservation.StudioID,
		UserID:              reservation.UserID,
		ReservationType:     string(reservation.ReservationType),
		Status:              string(reservation.Status),
		PlanID:              reservation.PlanID,
		PlanName:            reservation.PlanName,
		PlanPrice:           reservation.PlanPrice,
		PlanTaxRate:         reservation.PlanTaxRate,
		Date:                reservation.Date.Format("2006-01-02"),
		StartTime:           reservation.StartTime,
		EndTime:             reservation.EndTime,
		Options:             options,
		ShootingType:        shootingTypes,
		ShootingDetails:     reservation.ShootingDetails,
		PhotographerName:    reservation.PhotographerName,
		NumberOfPeople:      reservation.NumberOfPeople,
		NeedsProtection:     reservation.NeedsProtection,
		EquipmentInsurance:  reservation.EquipmentInsurance,
		Note:                reservation.Note,
		CancelledBy:         reservation.CancelledBy,
		PromotedFrom:        reservation.PromotedFrom,
		LinkedReservationID: reservation.LinkedReservationID,
		CreatedAt:           reservation.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           reservation.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if !reservation.CancelledAt.IsZero() {
		resp.CancelledAt = reservation.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if !reservation.PromotedAt.IsZero() {
		resp.PromotedAt = reservation.PromotedAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if !reservation.ExpiryDate.IsZero() {
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
