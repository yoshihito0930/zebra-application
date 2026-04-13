package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	reservationUsecase *usecase.ReservationUsecase
)

// init は Lambda 関数の初期化時に1度だけ実行される
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

// OptionSnapshot はオプションスナップショットの構造体
type OptionSnapshot struct {
	OptionID   string  `json:"option_id"`
	OptionName string  `json:"option_name"`
	Price      int     `json:"price"`
	TaxRate    float64 `json:"tax_rate"`
}

// ReservationListItem は予約一覧の項目
type ReservationListItem struct {
	ReservationID      string           `json:"reservation_id"`
	StudioID           string           `json:"studio_id"`
	ReservationType    string           `json:"reservation_type"`
	Status             string           `json:"status"`
	PlanID             string           `json:"plan_id"`
	PlanName           string           `json:"plan_name"`
	PlanPrice          int              `json:"plan_price"`
	PlanTaxRate        float64          `json:"plan_tax_rate"`
	Date               string           `json:"date"`
	StartTime          string           `json:"start_time"`
	EndTime            string           `json:"end_time"`
	Options            []OptionSnapshot `json:"options"`
	ShootingType       []string         `json:"shooting_type"`
	ShootingDetails    string           `json:"shooting_details"`
	PhotographerName   string           `json:"photographer_name"`
	NumberOfPeople     int              `json:"number_of_people"`
	NeedsProtection    bool             `json:"needs_protection"`
	EquipmentInsurance bool             `json:"equipment_insurance"`
	Note               string           `json:"note"`
	CancelledBy        string           `json:"cancelled_by,omitempty"`
	CancelledAt        string           `json:"cancelled_at,omitempty"`
	PromotedFrom       string           `json:"promoted_from,omitempty"`
	PromotedAt         string           `json:"promoted_at,omitempty"`
	ExpiryDate         string           `json:"expiry_date,omitempty"`
	CreatedAt          string           `json:"created_at"`
	UpdatedAt          string           `json:"updated_at"`
}

// ReservationListResponse は予約一覧レスポンス
type ReservationListResponse struct {
	Reservations []ReservationListItem `json:"reservations"`
}

func listMyReservationsHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// コンテキストからユーザーIDを取得
	userID := middleware.GetUserIDFromContext(ctx)

	// クエリパラメータからステータスフィルタを取得（任意）
	statusFilter := request.QueryStringParameters["status"]

	// 予約一覧を取得
	var reservations []*entity.Reservation
	var err error

	if statusFilter != "" {
		reservations, err = reservationUsecase.ListReservationsByUserAndStatus(ctx, userID, entity.ReservationStatus(statusFilter))
	} else {
		reservations, err = reservationUsecase.ListReservationsByUser(ctx, userID)
	}

	if err != nil {
		log.Printf("Failed to list reservations: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// レスポンスを作成
	items := make([]ReservationListItem, len(reservations))
	for i, r := range reservations {
		options := make([]OptionSnapshot, len(r.Options))
		for j, opt := range r.Options {
			options[j] = OptionSnapshot{
				OptionID:   opt.OptionID,
				OptionName: opt.OptionName,
				Price:      opt.Price,
				TaxRate:    opt.TaxRate,
			}
		}

		shootingTypes := make([]string, len(r.ShootingType))
		for j, st := range r.ShootingType {
			shootingTypes[j] = string(st)
		}

		item := ReservationListItem{
			ReservationID:      r.ReservationID,
			StudioID:           r.StudioID,
			ReservationType:    string(r.ReservationType),
			Status:             string(r.Status),
			PlanID:             r.PlanID,
			PlanName:           r.PlanName,
			PlanPrice:          r.PlanPrice,
			PlanTaxRate:        r.PlanTaxRate,
			Date:               r.Date.Format("2006-01-02"),
			StartTime:          r.StartTime,
			EndTime:            r.EndTime,
			Options:            options,
			ShootingType:       shootingTypes,
			ShootingDetails:    r.ShootingDetails,
			PhotographerName:   r.PhotographerName,
			NumberOfPeople:     r.NumberOfPeople,
			NeedsProtection:    r.NeedsProtection,
			EquipmentInsurance: r.EquipmentInsurance,
			Note:               r.Note,
			CreatedAt:          r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:          r.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if r.CancelledBy != "" {
			item.CancelledBy = r.CancelledBy
			item.CancelledAt = r.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
		}
		if r.PromotedFrom != "" {
			item.PromotedFrom = r.PromotedFrom
			item.PromotedAt = r.PromotedAt.Format("2006-01-02T15:04:05Z07:00")
		}
		if !r.ExpiryDate.IsZero() {
			item.ExpiryDate = r.ExpiryDate.Format("2006-01-02")
		}

		items[i] = item
	}

	resp := ReservationListResponse{
		Reservations: items,
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// 認証ミドルウェアを適用
	authHandler := middleware.MockAuthMiddleware(listMyReservationsHandler)

	// 認可ミドルウェアを適用（customer のみ）
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleCustomer)

	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
