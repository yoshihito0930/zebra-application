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
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
	"github.com/yoshihito0930/zebra-application/internal/usecase"
)

var (
	reservationUsecase *usecase.ReservationUsecase
	reservationRepo    repository.ReservationRepository
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo = dynamodbRepo.NewReservationRepository(dynamoClient)
	userRepo := dynamodbRepo.NewUserRepository(dynamoClient)
	planRepo := dynamodbRepo.NewPlanRepository(dynamoClient)
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

// handler は仮予約期限切れ処理のバッチハンドラー
//
// 処理内容:
//  1. 全スタジオの仮予約（tentative）を取得
//  2. expiry_dateが今日以前の仮予約を期限切れ（expired）に更新
//
// 実行タイミング:
//   - EventBridgeで日次実行（例: 毎日午前2時）
//
// 注意:
//   - EventBridgeからのトリガーはevents.CloudWatchEvent型
//   - 大量の仮予約がある場合、タイムアウトに注意（Lambda最大15分）
func handler(ctx context.Context, event events.CloudWatchEvent) error {
	log.Printf("Starting tentative reservation expiry batch at %s", time.Now().Format(time.RFC3339))

	// 今日の日付を取得
	today := time.Now().Truncate(24 * time.Hour)

	// 全スタジオの仮予約を取得
	// TODO: 実際にはスタジオIDを列挙する必要があるが、MVP段階では簡略化
	// Phase 2では、studiosテーブルから全スタジオIDを取得するロジックを追加
	studioIDs := []string{"studio_001"} // MVP段階は1スタジオのみ想定

	expiredCount := 0

	for _, studioID := range studioIDs {
		// 仮予約を取得（ステータスフィルタ: tentative）
		status := entity.ReservationStatusTentative
		input := usecase.ListReservationsInput{
			StudioID:  studioID,
			StartDate: time.Time{}, // 日付範囲指定なし
			EndDate:   time.Time{},
			Status:    &status,
		}
		reservations, err := reservationUsecase.ListReservations(ctx, input)
		if err != nil {
			log.Printf("Failed to list tentative reservations for studio %s: %v", studioID, err)
			continue
		}

		log.Printf("Found %d tentative reservations for studio %s", len(reservations), studioID)

		// 期限切れの仮予約を処理
		for _, r := range reservations {
			// expiry_dateが今日以前かチェック
			if r.ExpiryDate != nil && !r.ExpiryDate.IsZero() && r.ExpiryDate.Before(today) {
				log.Printf("Expiring reservation %s (expiry_date: %s)", r.ReservationID, r.ExpiryDate.Format("2006-01-02"))

				// 期限切れに更新（ステータスをexpiredに変更）
				r.Status = entity.ReservationStatusExpired
				r.UpdatedAt = time.Now()
				err := reservationRepo.Update(ctx, r)
				if err != nil {
					log.Printf("Failed to expire reservation %s: %v", r.ReservationID, err)
					continue
				}

				expiredCount++
			}
		}
	}

	log.Printf("Tentative reservation expiry batch completed. Expired %d reservations.", expiredCount)

	return nil
}

func main() {
	lambda.Start(handler)
}
