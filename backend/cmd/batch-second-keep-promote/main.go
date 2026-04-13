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
	reservationRepo = repository.NewReservationRepository(dynamoClient)
	notificationRepo = repository.NewNotificationRepository(dynamoClient)
}

// handler は第2キープ繰り上げバッチのハンドラー
//
// 処理内容:
//  1. 全スタジオのキャンセルされた予約を取得（直近24時間以内）
//  2. キャンセルされた予約に紐づく第2キープ（waitlisted）を検索
//  3. 第2キープを仮予約（tentative）に繰り上げ
//  4. 繰り上げ通知を作成
//
// 実行タイミング:
//   - EventBridgeで日次実行（例: 毎日午前4時）
//   - または予約キャンセル時にイベント駆動で実行（Phase 2で実装）
//
// 注意:
//   - EventBridgeからのトリガーはevents.CloudWatchEvent型
//   - MVP段階は日次バッチで実行、Phase 2でリアルタイム処理に移行
func handler(ctx context.Context, event events.CloudWatchEvent) error {
	log.Printf("Starting second keep promotion batch at %s", time.Now().Format(time.RFC3339))

	// 全スタジオのキャンセル済み予約を取得
	// TODO: 実際にはスタジオIDを列挙する必要があるが、MVP段階では簡略化
	// Phase 2では、studiosテーブルから全スタジオIDを取得するロジックを追加
	studioIDs := []string{"studio_001"} // MVP段階は1スタジオのみ想定

	promotedCount := 0

	for _, studioID := range studioIDs {
		// キャンセル済み予約を取得
		cancelledReservations, err := reservationRepo.FindByStudioAndStatus(ctx, studioID, entity.ReservationStatusCancelled)
		if err != nil {
			log.Printf("Failed to list cancelled reservations for studio %s: %v", studioID, err)
			continue
		}

		log.Printf("Found %d cancelled reservations for studio %s", len(cancelledReservations), studioID)

		// 各キャンセル済み予約について第2キープを検索
		for _, cancelledRes := range cancelledReservations {
			// 直近24時間以内にキャンセルされたもののみ処理（重複処理防止）
			if time.Since(cancelledRes.UpdatedAt) > 24*time.Hour {
				continue
			}

			// 第2キープを検索
			waitlistedReservations, err := reservationRepo.FindByLinkedReservationID(ctx, cancelledRes.ReservationID)
			if err != nil {
				log.Printf("Failed to find waitlisted reservations for %s: %v", cancelledRes.ReservationID, err)
				continue
			}

			if len(waitlistedReservations) == 0 {
				log.Printf("No waitlisted reservations found for cancelled reservation %s", cancelledRes.ReservationID)
				continue
			}

			// 第2キープを仮予約に繰り上げ
			for _, waitlistedRes := range waitlistedReservations {
				if waitlistedRes.Status != entity.ReservationStatusWaitlisted {
					log.Printf("Skipping reservation %s (status: %s, expected: waitlisted)", waitlistedRes.ReservationID, waitlistedRes.Status)
					continue
				}

				log.Printf("Promoting waitlisted reservation %s to tentative", waitlistedRes.ReservationID)

				// ステータスを仮予約に更新
				now := time.Now()
				waitlistedRes.Status = entity.ReservationStatusTentative
				waitlistedRes.UpdatedAt = now

				// 仮予約の期限を設定（利用日の7日前）
				expiryDate := waitlistedRes.Date.AddDate(0, 0, -7)
				waitlistedRes.ExpiryDate = expiryDate

				err := reservationRepo.Update(ctx, waitlistedRes)
				if err != nil {
					log.Printf("Failed to promote reservation %s: %v", waitlistedRes.ReservationID, err)
					continue
				}

				// 繰り上げ通知を作成
				notification := &entity.Notification{
					StudioID:       studioID,
					NotificationID: uuid.New().String(),
					UserID:         waitlistedRes.UserID,
					ReservationID:  &waitlistedRes.ReservationID,
					NotificationType: entity.NotificationTypePromotion,
					NotificationDetail: fmt.Sprintf(
						"第2キープが仮予約に繰り上がりました。予約ID: %s、利用日: %s、期限: %s",
						waitlistedRes.ReservationID,
						waitlistedRes.Date.Format("2006年01月02日"),
						expiryDate.Format("2006年01月02日"),
					),
					Status:      entity.NotificationStatusPending,
					ScheduledAt: now, // 即座に送信
					CreatedAt:   now,
					UpdatedAt:   now,
				}

				err = notificationRepo.Create(ctx, notification)
				if err != nil {
					log.Printf("Failed to create promotion notification for reservation %s: %v", waitlistedRes.ReservationID, err)
					// 通知作成失敗は処理を続行
				}

				promotedCount++
			}
		}
	}

	log.Printf("Second keep promotion batch completed. Promoted %d reservations.", promotedCount)

	return nil
}

func main() {
	lambda.Start(handler)
}
