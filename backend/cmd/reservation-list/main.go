package main

import (
	"context"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
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

type ReservationSummary struct {
	ReservationID    string `json:"reservation_id"`
	UserID           string `json:"user_id"`
	ReservationType  string `json:"reservation_type"`
	Status           string `json:"status"`
	PlanName         string `json:"plan_name"`
	Date             string `json:"date"`
	StartTime        string `json:"start_time"`
	EndTime          string `json:"end_time"`
	PhotographerName string `json:"photographer_name"`
	NumberOfPeople   int    `json:"number_of_people"`
}

type ReservationListResponse struct {
	Reservations []ReservationSummary `json:"reservations"`
}

func listReservationsHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// クエリパラメータを取得
	studioID := request.QueryStringParameters["studio_id"]
	startDateStr := request.QueryStringParameters["start_date"]
	endDateStr := request.QueryStringParameters["end_date"]
	statusFilter := request.QueryStringParameters["status"]

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}

	validator.ValidateRequired(studioID, "studio_id", validationResult)
	validator.ValidateRequired(startDateStr, "start_date", validationResult)
	validator.ValidateRequired(endDateStr, "end_date", validationResult)

	if startDateStr != "" {
		validator.ValidateDateFormat(startDateStr, "start_date", validationResult)
	}

	if endDateStr != "" {
		validator.ValidateDateFormat(endDateStr, "end_date", validationResult)
	}

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// スタジオスコープチェック（admin/staffは所属スタジオのみアクセス可能）
	userStudioID := middleware.GetStudioIDFromContext(ctx)
	role := middleware.GetRoleFromContext(ctx)

	if (role == string(middleware.RoleAdmin) || role == string(middleware.RoleStaff)) && studioID != userStudioID {
		return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
	}

	// 日付をパース
	startDate, _ := time.Parse("2006-01-02", startDateStr)
	endDate, _ := time.Parse("2006-01-02", endDateStr)

	// 予約一覧を取得
	var reservations []*entity.Reservation
	var err error

	if statusFilter != "" {
		reservations, err = reservationUsecase.ListReservationsByStudioDateRangeAndStatus(
			ctx, studioID, startDate, endDate, entity.ReservationStatus(statusFilter),
		)
	} else {
		reservations, err = reservationUsecase.ListReservationsByStudioAndDateRange(
			ctx, studioID, startDate, endDate,
		)
	}

	if err != nil {
		log.Printf("Failed to list reservations: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// レスポンスを作成（管理用なので簡略化）
	summaries := make([]ReservationSummary, len(reservations))
	for i, r := range reservations {
		summaries[i] = ReservationSummary{
			ReservationID:    r.ReservationID,
			UserID:           r.UserID,
			ReservationType:  string(r.ReservationType),
			Status:           string(r.Status),
			PlanName:         r.PlanName,
			Date:             r.Date.Format("2006-01-02"),
			StartTime:        r.StartTime,
			EndTime:          r.EndTime,
			PhotographerName: r.PhotographerName,
			NumberOfPeople:   r.NumberOfPeople,
		}
	}

	resp := ReservationListResponse{
		Reservations: summaries,
	}

	return response.OKWithCORS(resp), nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	authHandler := middleware.MockAuthMiddleware(listReservationsHandler)
	authzHandler := middleware.RequireRole(authHandler, middleware.RoleAdmin, middleware.RoleStaff)
	return authzHandler(ctx, request)
}

func main() {
	lambda.Start(handler)
}
