package repository

import (
	"context"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// NotificationRepository は通知のデータアクセスインターフェース
// DynamoDBのnotificationsテーブルへのアクセスを抽象化する
type NotificationRepository interface {
	// Create は通知を作成する
	// アクセスパターン: AP-08, AP-12, AP-20, AP-22, AP-35, AP-41, AP-45（各種通知作成）
	//
	// ctx: リクエストコンテキスト
	// notification: 作成する通知エンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, notification *entity.Notification) error

	// FindByID は通知IDで通知を取得する
	//
	// DynamoDBキー: PK=studio_id, SK=scheduled_at#notification_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// notificationID: 通知ID
	// 戻り値: 通知エンティティとエラー。通知が存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID, notificationID string) (*entity.Notification, error)

	// FindPendingByStudio は送信待ちの通知を取得する（バッチ処理用）
	// 指定された日時より前にスケジュールされた、送信待ち（pending）の通知を取得する
	//
	// DynamoDBキー: PK=studio_id, SK <= scheduled_at#notification_id でQueryし、status=pendingでフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// scheduledBefore: この日時より前にスケジュールされた通知を取得
	// 戻り値: 通知のスライスとエラー。通知が存在しない場合は空スライスを返す
	FindPendingByStudio(ctx context.Context, studioID string, scheduledBefore time.Time) ([]*entity.Notification, error)

	// Update は通知を更新する（送信ステータス更新など）
	//
	// ctx: リクエストコンテキスト
	// notification: 更新する通知エンティティ（studio_id, notification_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, notification *entity.Notification) error

	// Delete は通知を削除する（物理削除）
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// notificationID: 削除する通知ID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID, notificationID string) error
}
