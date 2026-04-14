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
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
	"github.com/yoshihito0930/zebra-application/internal/helper"
)

// グローバル変数（コールドスタート対策）
var (
	reservationUsecase *usecase.ReservationUsecase
	planRepo           repository.PlanRepository
	optionRepo         repository.OptionRepository
)

// init は Lambda 関数の初期化時に1度だけ実行される
func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	planRepoGlobal := dynamodbRepo.NewPlanRepository(dynamoClient)
	optionRepoGlobal := dynamodbRepo.NewOptionRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	planRepo = planRepoGlobal
	optionRepo = optionRepoGlobal

	reservationUsecase = usecase.NewReservationUsecase(
		reservationRepo,
		userRepo,
		planRepoGlobal,
		blockedSlotRepo,
		studioRepo,
	)
}

// ReservationListItem は予約一覧の項目（helper.ReservationResponseに追加フィールドを含む）
type ReservationListItem struct {
	helper.ReservationResponse
	CancelledBy string `json:"cancelled_by,omitempty"`
	CancelledAt string `json:"cancelled_at,omitempty"`
	PromotedFrom string `json:"promoted_from,omitempty"`
	PromotedAt   string `json:"promoted_at,omitempty"`
	ExpiryDate   string `json:"expiry_date,omitempty"`
	UpdatedAt    string `json:"updated_at"`
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
	reservations, err := reservationUsecase.ListUserReservations(ctx, userID)
	if err != nil {
		log.Printf("Failed to list reservations: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// statusフィルタがある場合はフィルタリング
	if statusFilter != "" {
		filtered := make([]*entity.Reservation, 0)
		targetStatus := entity.ReservationStatus(statusFilter)
		for _, r := range reservations {
			if r.Status == targetStatus {
				filtered = append(filtered, r)
			}
		}
		reservations = filtered
	}

	// レスポンスを作成（helperを使って各予約のレスポンスを構築）
	items := make([]ReservationListItem, len(reservations))
	for i, r := range reservations {
		// helperを使って基本レスポンスを構築
		baseResp := helper.BuildReservationResponse(ctx, r, planRepo, optionRepo)

		// 詳細レスポンスを作成（追加フィールドを含む）
		item := ReservationListItem{
			ReservationResponse: baseResp,
			UpdatedAt:           r.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		// オプショナルフィールドの設定
		if r.CancelledBy != nil {
			item.CancelledBy = string(*r.CancelledBy)
		}
		if r.CancelledAt != nil && !r.CancelledAt.IsZero() {
			item.CancelledAt = r.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
		}
		if r.PromotedFrom != nil {
			item.PromotedFrom = string(*r.PromotedFrom)
		}
		if r.PromotedAt != nil && !r.PromotedAt.IsZero() {
			item.PromotedAt = r.PromotedAt.Format("2006-01-02T15:04:05Z07:00")
		}
		if r.ExpiryDate != nil && !r.ExpiryDate.IsZero() {
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
