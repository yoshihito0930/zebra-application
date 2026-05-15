package main

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/helper"
	"github.com/yoshihito0930/zebra-application/internal/middleware"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

const userFetchConcurrency = 10

var (
	reservationUsecase *usecase.ReservationUsecase
	userRepo           repository.UserRepository
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo = dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo := dynamodbRepo.NewPlanRepository(dynamoClient)
	optionRepo := dynamodbRepo.NewOptionRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepo,
		optionRepo,
		blockedSlotRepo,
		studioRepo,
	)
}

type ReservationSummary struct {
	ReservationID    string              `json:"reservation_id"`
	StudioID         string              `json:"studio_id"`
	UserID           string              `json:"user_id"`
	UserName         string              `json:"user_name,omitempty"`
	UserEmail        string              `json:"user_email,omitempty"`
	IsGuest          bool                `json:"is_guest"`
	GuestName        string              `json:"guest_name,omitempty"`
	GuestEmail       string              `json:"guest_email,omitempty"`
	ReservationType  string              `json:"reservation_type"`
	Status           string              `json:"status"`
	Plan             helper.PlanInfo     `json:"plan"`
	Options          []helper.OptionInfo `json:"options"`
	Date             string              `json:"date"`
	StartTime        string              `json:"start_time"`
	EndTime          string              `json:"end_time"`
	PhotographerName string              `json:"photographer_name"`
	NumberOfPeople   int                 `json:"number_of_people"`
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

	// ListReservationsInputを作成
	input := usecase.ListReservationsInput{
		StudioID:  studioID,
		StartDate: startDate,
		EndDate:   endDate,
	}

	// ステータスフィルタがある場合
	if statusFilter != "" {
		status := entity.ReservationStatus(statusFilter)
		input.Status = &status
	}

	// 予約一覧を取得
	reservations, err := reservationUsecase.ListReservations(ctx, input)
	if err != nil {
		log.Printf("Failed to list reservations: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// 会員予約の user_id を重複排除して並列で取得
	users := fetchUsersForReservations(ctx, reservations)

	// レスポンスを作成（プラン・オプションは予約に保存済みのスナップショットを利用）
	summaries := make([]ReservationSummary, len(reservations))
	for i, r := range reservations {
		summaries[i] = buildReservationSummary(r, users)
	}

	resp := ReservationListResponse{
		Reservations: summaries,
	}

	return response.OKWithCORS(resp), nil
}

// fetchUsersForReservations は会員予約の予約者ユーザーを並列で取得する。
// ゲスト予約と user_id が無い予約は除外する。取得失敗時は警告ログのみ出力し、
// マップに含めない（フロント側で user_id へのフォールバック表示が動く）。
func fetchUsersForReservations(ctx context.Context, reservations []*entity.Reservation) map[string]*entity.User {
	uniqueUserIDs := make(map[string]struct{})
	for _, r := range reservations {
		if r.IsGuest || r.UserID == nil || *r.UserID == "" {
			continue
		}
		uniqueUserIDs[*r.UserID] = struct{}{}
	}

	users := make(map[string]*entity.User, len(uniqueUserIDs))
	if len(uniqueUserIDs) == 0 {
		return users
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, userFetchConcurrency)

	for userID := range uniqueUserIDs {
		wg.Add(1)
		sem <- struct{}{}
		go func(uid string) {
			defer wg.Done()
			defer func() { <-sem }()

			user, err := userRepo.FindByID(ctx, uid)
			if err != nil {
				log.Printf("Warning: Failed to fetch user %s: %v", uid, err)
				return
			}
			if user == nil {
				return
			}
			mu.Lock()
			users[uid] = user
			mu.Unlock()
		}(userID)
	}
	wg.Wait()

	return users
}

// buildReservationSummary は予約エンティティから一覧用サマリを組み立てる。
// プラン・オプションは予約作成時のスナップショットを使う（料金改定の影響を受けない）。
func buildReservationSummary(r *entity.Reservation, users map[string]*entity.User) ReservationSummary {
	options := make([]helper.OptionInfo, 0, len(r.OptionSnapshots))
	for _, opt := range r.OptionSnapshots {
		options = append(options, helper.OptionInfo{
			OptionID:   opt.OptionID,
			OptionName: opt.OptionName,
			Price:      opt.Price,
			TaxRate:    opt.TaxRate,
		})
	}

	summary := ReservationSummary{
		ReservationID:   r.ReservationID,
		StudioID:        r.StudioID,
		ReservationType: string(r.ReservationType),
		Status:          string(r.Status),
		Plan: helper.PlanInfo{
			PlanID:   r.PlanID,
			PlanName: r.PlanName,
			Price:    r.PlanPrice,
			TaxRate:  r.PlanTaxRate,
		},
		Options:          options,
		Date:             r.Date.Format("2006-01-02"),
		StartTime:        r.StartTime,
		EndTime:          r.EndTime,
		PhotographerName: r.PhotographerName,
		NumberOfPeople:   r.NumberOfPeople,
		IsGuest:          r.IsGuest,
	}

	if r.UserID != nil {
		summary.UserID = *r.UserID
		if user, ok := users[*r.UserID]; ok && user != nil {
			summary.UserName = user.Name
			summary.UserEmail = user.Email
		}
	}

	if r.IsGuest {
		if r.GuestName != nil {
			summary.GuestName = *r.GuestName
		}
		if r.GuestEmail != nil {
			summary.GuestEmail = *r.GuestEmail
		}
	}

	return summary
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return middleware.Compose(listReservationsHandler, middleware.RoleAdmin, middleware.RoleStaff)(ctx, request)
}

func main() {
	lambda.Start(handler)
}
