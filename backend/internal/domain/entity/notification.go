package entity

import "time"

// NotificationType は通知の種類を表す
type NotificationType string

const (
	// NotificationTypeReminder は予約のリマインド通知
	NotificationTypeReminder NotificationType = "reminder"
	// NotificationTypeTentativeExpiry は仮予約の期限通知
	NotificationTypeTentativeExpiry NotificationType = "tentative_expiry"
	// NotificationTypePromotion は第2キープの繰り上げ通知
	NotificationTypePromotion NotificationType = "promotion"
	// NotificationTypeCancellation はキャンセル通知
	NotificationTypeCancellation NotificationType = "cancellation"
)

// NotificationStatus は通知の送信ステータスを表す
type NotificationStatus string

const (
	// NotificationStatusPending は送信待ち
	NotificationStatusPending NotificationStatus = "pending"
	// NotificationStatusSent は送信済み
	NotificationStatusSent NotificationStatus = "sent"
	// NotificationStatusFailed は送信失敗
	NotificationStatusFailed NotificationStatus = "failed"
)

// Notification は通知エンティティを表す
type Notification struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// NotificationID は通知の一意識別子（UUID）
	NotificationID string `json:"notification_id" dynamodbav:"notification_id"`

	// UserID は通知先のユーザーID
	UserID string `json:"user_id" dynamodbav:"user_id"`

	// ReservationID は関連する予約ID（オプショナル）
	// 予約に関連しない通知（例: お知らせ）の場合はnil
	ReservationID *string `json:"reservation_id,omitempty" dynamodbav:"reservation_id,omitempty"`

	// NotificationType は通知の種類（reminder/tentative_expiry/promotion/cancellation）
	NotificationType NotificationType `json:"notification_type" dynamodbav:"notification_type"`

	// NotificationDetail は通知内容
	NotificationDetail string `json:"notification_detail" dynamodbav:"notification_detail"`

	// Status は通知の送信ステータス（pending/sent/failed）
	Status NotificationStatus `json:"status" dynamodbav:"status"`

	// ScheduledAt は送信予定日時
	ScheduledAt time.Time `json:"scheduled_at" dynamodbav:"scheduled_at"`

	// SentAt は実際の送信日時（オプショナル、送信後に設定）
	SentAt *time.Time `json:"sent_at,omitempty" dynamodbav:"sent_at,omitempty"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// IsPending は送信待ちかどうかを判定する
// 戻り値: ステータスがpendingの場合true、それ以外の場合false
func (n *Notification) IsPending() bool {
	return n.Status == NotificationStatusPending
}

// IsSent は送信済みかどうかを判定する
// 戻り値: ステータスがsentの場合true、それ以外の場合false
func (n *Notification) IsSent() bool {
	return n.Status == NotificationStatusSent
}

// IsFailed は送信失敗かどうかを判定する
// 戻り値: ステータスがfailedの場合true、それ以外の場合false
func (n *Notification) IsFailed() bool {
	return n.Status == NotificationStatusFailed
}

// CanSend は送信可能かどうかを判定する
// now: 現在時刻
// 戻り値: 送信可能な場合true、送信不可の場合false
//
// 送信可能条件:
// - ステータスがpendingである
// - 送信予定日時が現在時刻以前である
func (n *Notification) CanSend(now time.Time) bool {
	return n.Status == NotificationStatusPending && !n.ScheduledAt.After(now)
}

// IsReminder はリマインド通知かどうかを判定する
func (n *Notification) IsReminder() bool {
	return n.NotificationType == NotificationTypeReminder
}

// IsTentativeExpiry は仮予約期限通知かどうかを判定する
func (n *Notification) IsTentativeExpiry() bool {
	return n.NotificationType == NotificationTypeTentativeExpiry
}

// IsPromotion は繰り上げ通知かどうかを判定する
func (n *Notification) IsPromotion() bool {
	return n.NotificationType == NotificationTypePromotion
}

// IsCancellation はキャンセル通知かどうかを判定する
func (n *Notification) IsCancellation() bool {
	return n.NotificationType == NotificationTypeCancellation
}
