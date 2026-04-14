package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/google/uuid"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
	dynamodbRepo "github.com/yoshihito0930/zebra-application/internal/repository/dynamodb"
)

var (
	reservationRepo  repository.ReservationRepository
	notificationRepo repository.NotificationRepository
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	dynamoClient := dynamodb.NewFromConfig(cfg)
	reservationRepo = dynamodbRepo.NewReservationRepository(dynamoClient)
	notificationRepo = dynamodbRepo.NewNotificationRepository(dynamoClient)
}

// handler は仮予約期限通知バッチのハンドラー
//
// 処理内容:
//  1. 全スタジオの仮予約（tentative）を取得
//  2. 期限（expiry_date）が3日後の仮予約を抽出
//  3. 期限通知を作成（notification_type: tentative_expiry）
//
// 実行タイミング:
//   - EventBridgeで日次実行（例: 毎日午前3時）
//
// 注意:
//   - EventBridgeからのトリガーはevents.CloudWatchEvent型
//   - MVP段階は1スタジオのみ想定、Phase 2で複数スタジオ対応
func handler(ctx context.Context, event events.CloudWatchEvent) error {
	log.Printf("Starting tentative reservation reminder batch at %s", time.Now().Format(time.RFC3339))

	// 3日後の日付を計算
	threeDaysLater := time.Now().AddDate(0, 0, 3).Truncate(24 * time.Hour)

	// 全スタジオの仮予約を取得
	// TODO: 実際にはスタジオIDを列挙する必要があるが、MVP段階では簡略化
	// Phase 2では、studiosテーブルから全スタジオIDを取得するロジックを追加
	studioIDs := []string{"studio_001"} // MVP段階は1スタジオのみ想定

	notificationCount := 0

	for _, studioID := range studioIDs {
		// 仮予約を取得（ステータスフィルタ: tentative）
		reservations, err := reservationRepo.FindByStudioAndStatus(ctx, studioID, entity.ReservationStatusTentative)
		if err != nil {
			log.Printf("Failed to list tentative reservations for studio %s: %v", studioID, err)
			continue
		}

		log.Printf("Found %d tentative reservations for studio %s", len(reservations), studioID)

		// 期限が3日後の仮予約を抽出して通知作成
		for _, r := range reservations {
			// expiry_dateが3日後かチェック
			if r.ExpiryDate != nil && !r.ExpiryDate.IsZero() && isSameDay(*r.ExpiryDate, threeDaysLater) {
				log.Printf("Creating reminder for reservation %s (expiry_date: %s)", r.ReservationID, r.ExpiryDate.Format("2006-01-02"))

				// 通知を作成
				now := time.Now()
				notification := &entity.Notification{
					StudioID:       studioID,
					NotificationID: uuid.New().String(),
					UserID:         r.UserID,
					ReservationID:  &r.ReservationID,
					NotificationType: entity.NotificationTypeTentativeExpiry,
					NotificationDetail: fmt.Sprintf(
						"仮予約の期限が3日後に迫っています。予約ID: %s、利用日: %s、期限: %s",
						r.ReservationID,
						r.Date.Format("2006年01月02日"),
						r.ExpiryDate.Format("2006年01月02日"),
					),
					Status:      entity.NotificationStatusPending,
					ScheduledAt: now, // 即座に送信
					CreatedAt:   now,
					UpdatedAt:   now,
				}

				err := notificationRepo.Create(ctx, notification)
				if err != nil {
					log.Printf("Failed to create notification for reservation %s: %v", r.ReservationID, err)
					continue
				}

				notificationCount++
			}
		}
	}

	log.Printf("Tentative reservation reminder batch completed. Created %d notifications.", notificationCount)

	return nil
}

// isSameDay は2つの日付が同じ日かどうかを判定する
func isSameDay(t1, t2 time.Time) bool {
	y1, m1, d1 := t1.Date()
	y2, m2, d2 := t2.Date()
	return y1 == y2 && m1 == m2 && d1 == d2
}

func main() {
	lambda.Start(handler)
}
