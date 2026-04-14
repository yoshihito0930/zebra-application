package main

import (
	"context"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
	"github.com/yoshihito0930/zebra-application/internal/validator"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// グローバル変数（コールドスタート対策）
var (
	calendarUsecase *usecase.CalendarUsecase
)

// init は Lambda 関数の初期化時に1度だけ実行される
func init() {
	// AWS SDK の設定をロード
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	// DynamoDB クライアントを作成
	dynamoClient := dynamodb.NewFromConfig(cfg)

	// リポジトリを初期化
	reservationRepo := dynamodbRepo.NewReservationRepository(dynamoClient)
	blockedSlotRepo := dynamodbRepo.NewBlockedSlotRepository(dynamoClient)
	studioRepo := dynamodbRepo.NewStudioRepository(dynamoClient)

	// ユースケースを初期化
	calendarUsecase = usecase.NewCalendarUsecase(reservationRepo, blockedSlotRepo, studioRepo)
}

// ReservationSummary は予約サマリーの構造体
type ReservationSummary struct {
	ReservationID   string `json:"reservation_id"`
	ReservationType string `json:"reservation_type"`
	Status          string `json:"status"`
	Date            string `json:"date"`
	StartTime       string `json:"start_time"`
	EndTime         string `json:"end_time"`
}

// BlockedSlotSummary はブロック枠サマリーの構造体
type BlockedSlotSummary struct {
	BlockedSlotID string `json:"blocked_slot_id"`
	Date          string `json:"date"`
	IsAllDay      bool   `json:"is_all_day"`
	StartTime     string `json:"start_time,omitempty"`
	EndTime       string `json:"end_time,omitempty"`
	Reason        string `json:"reason"`
}

// CalendarResponse はカレンダーレスポンスの構造体
type CalendarResponse struct {
	Reservations  []ReservationSummary  `json:"reservations"`
	BlockedSlots  []BlockedSlotSummary  `json:"blocked_slots"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// パスパラメータからスタジオIDを取得
	studioID := request.PathParameters["id"]
	if studioID == "" {
		return response.ErrorWithCORS(apierror.ErrStudioNotFound), nil
	}

	// クエリパラメータから対象月を取得
	month := request.QueryStringParameters["month"]

	// バリデーション
	validationResult := &validator.ValidationResult{Valid: true}
	validator.ValidateRequired(month, "month", validationResult)

	if !validationResult.Valid {
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// 月の形式をチェック（YYYY-MM形式）
	// 簡易的な正規表現チェック
	if len(month) != 7 || month[4] != '-' {
		validationResult.AddError("month", "月の形式が正しくありません（YYYY-MM形式で入力してください）")
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// 月をtime.Timeに変換
	monthDate, err := time.Parse("2006-01", month)
	if err != nil {
		validationResult.AddError("month", "月の形式が正しくありません")
		return response.ErrorWithCORS(validationResult.ToAPIError()), nil
	}

	// カレンダー情報を取得
	calendar, err := calendarUsecase.GetCalendar(ctx, studioID, monthDate)
	if err != nil {
		log.Printf("Failed to get calendar: %v", err)
		return response.ErrorWithCORS(apierror.ErrInternalServer), nil
	}

	// レスポンスを作成
	reservations := make([]ReservationSummary, len(calendar.Reservations))
	for i, r := range calendar.Reservations {
		reservations[i] = ReservationSummary{
			ReservationID:   r.ReservationID,
			ReservationType: string(r.ReservationType),
			Status:          string(r.Status),
			Date:            r.Date.Format("2006-01-02"),
			StartTime:       r.StartTime,
			EndTime:         r.EndTime,
		}
	}

	blockedSlots := make([]BlockedSlotSummary, len(calendar.BlockedSlots))
	for i, b := range calendar.BlockedSlots {
		bs := BlockedSlotSummary{
			BlockedSlotID: b.BlockedSlotID,
			Date:          b.Date.Format("2006-01-02"),
			IsAllDay:      b.IsAllDay,
			Reason:        b.Reason,
		}
		if b.StartTime != nil {
			bs.StartTime = *b.StartTime
		}
		if b.EndTime != nil {
			bs.EndTime = *b.EndTime
		}
		blockedSlots[i] = bs
	}

	resp := CalendarResponse{
		Reservations: reservations,
		BlockedSlots: blockedSlots,
	}

	return response.OKWithCORS(resp), nil
}

func main() {
	lambda.Start(handler)
}
