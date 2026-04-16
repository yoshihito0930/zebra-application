package entity

import "time"

// ReservationType は予約種別を表す
type ReservationType string

const (
	// ReservationTypeRegular は本予約（利用日確定）
	ReservationTypeRegular ReservationType = "regular"
	// ReservationTypeTentative は仮予約（利用日の7日前まで有効）
	ReservationTypeTentative ReservationType = "tentative"
	// ReservationTypeLocationScout はロケハン（スタジオ下見）
	ReservationTypeLocationScout ReservationType = "location_scout"
	// ReservationTypeSecondKeep は第2キープ（本予約/仮予約が既に存在する時間帯の仮押さえ）
	ReservationTypeSecondKeep ReservationType = "second_keep"
)

// ReservationStatus は予約ステータスを表す
type ReservationStatus string

const (
	// ReservationStatusPending は承認待ち（admin承認前）
	ReservationStatusPending ReservationStatus = "pending"
	// ReservationStatusTentative は仮予約（承認済み、利用日の7日前まで有効）
	ReservationStatusTentative ReservationStatus = "tentative"
	// ReservationStatusConfirmed は本予約確定（承認済み）
	ReservationStatusConfirmed ReservationStatus = "confirmed"
	// ReservationStatusWaitlisted は第2キープ（waitlist）
	ReservationStatusWaitlisted ReservationStatus = "waitlisted"
	// ReservationStatusScheduled はロケハン予定
	ReservationStatusScheduled ReservationStatus = "scheduled"
	// ReservationStatusCancelled はキャンセル済み
	ReservationStatusCancelled ReservationStatus = "cancelled"
	// ReservationStatusExpired は期限切れ（仮予約の期限切れ）
	ReservationStatusExpired ReservationStatus = "expired"
	// ReservationStatusCompleted は完了（利用日経過）
	ReservationStatusCompleted ReservationStatus = "completed"
)

// CancelledBy はキャンセル者を表す
type CancelledBy string

const (
	// CancelledByCustomer は顧客によるキャンセル
	CancelledByCustomer CancelledBy = "customer"
	// CancelledByOwner はスタジオ管理者によるキャンセル
	CancelledByOwner CancelledBy = "owner"
)

// PromotedFrom は昇格元のステータスを表す
type PromotedFrom string

const (
	// PromotedFromTentative は仮予約から本予約へ昇格
	PromotedFromTentative PromotedFrom = "tentative"
	// PromotedFromWaitlisted は第2キープから仮予約へ昇格
	PromotedFromWaitlisted PromotedFrom = "waitlisted"
)

// Reservation は予約エンティティを表す
type Reservation struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// ReservationID は予約の一意識別子（UUID）
	ReservationID string `json:"reservation_id" dynamodbav:"reservation_id"`

	// UserID は予約者のユーザーID（ゲスト予約の場合はnil）
	UserID *string `json:"user_id,omitempty" dynamodbav:"user_id,omitempty"`

	// IsGuest はゲスト予約フラグ
	IsGuest bool `json:"is_guest" dynamodbav:"is_guest"`

	// GuestName はゲスト名（ゲスト予約の場合のみ）
	GuestName *string `json:"guest_name,omitempty" dynamodbav:"guest_name,omitempty"`

	// GuestEmail はゲストメールアドレス（ゲスト予約の場合のみ）
	GuestEmail *string `json:"guest_email,omitempty" dynamodbav:"guest_email,omitempty"`

	// GuestPhone はゲスト電話番号（ゲスト予約の場合のみ）
	GuestPhone *string `json:"guest_phone,omitempty" dynamodbav:"guest_phone,omitempty"`

	// GuestCompany はゲスト会社名（ゲスト予約の場合のみ、オプショナル）
	GuestCompany *string `json:"guest_company,omitempty" dynamodbav:"guest_company,omitempty"`

	// GuestToken は予約確認用トークン（ゲスト予約の場合のみ、UUID）
	GuestToken *string `json:"guest_token,omitempty" dynamodbav:"guest_token,omitempty"`

	// ReservationType は予約種別（regular/tentative/location_scout/second_keep）
	ReservationType ReservationType `json:"reservation_type" dynamodbav:"reservation_type"`

	// Status は予約ステータス
	Status ReservationStatus `json:"status" dynamodbav:"status"`

	// PlanID は料金プランID
	PlanID string `json:"plan_id" dynamodbav:"plan_id"`

	// Date は利用日（YYYY-MM-DD）
	Date time.Time `json:"date" dynamodbav:"date"`

	// StartTime は開始時刻（HH:MM形式、例: "10:00"）
	StartTime string `json:"start_time" dynamodbav:"start_time"`

	// EndTime は終了時刻（HH:MM形式、例: "18:00"）
	EndTime string `json:"end_time" dynamodbav:"end_time"`

	// Note は備考（オプショナル）
	Note *string `json:"note,omitempty" dynamodbav:"note,omitempty"`

	// CancelledBy はキャンセル者（customer/owner、キャンセル時のみ）
	CancelledBy *CancelledBy `json:"cancelled_by,omitempty" dynamodbav:"cancelled_by,omitempty"`

	// CancelledAt はキャンセル日時（オプショナル）
	CancelledAt *time.Time `json:"cancelled_at,omitempty" dynamodbav:"cancelled_at,omitempty"`

	// PromotedFrom は昇格元のステータス（tentative/waitlisted、昇格時のみ）
	PromotedFrom *PromotedFrom `json:"promoted_from,omitempty" dynamodbav:"promoted_from,omitempty"`

	// PromotedAt は昇格日時（オプショナル）
	PromotedAt *time.Time `json:"promoted_at,omitempty" dynamodbav:"promoted_at,omitempty"`

	// LinkedReservationID は第2キープ時の第1候補予約ID（オプショナル）
	LinkedReservationID *string `json:"linked_reservation_id,omitempty" dynamodbav:"linked_reservation_id,omitempty"`

	// ExpiryDate は仮予約の有効期限日（YYYY-MM-DD、仮予約のみ）
	ExpiryDate *time.Time `json:"expiry_date,omitempty" dynamodbav:"expiry_date,omitempty"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`

	// NeedsProtection は養生の有無
	NeedsProtection bool `json:"needs_protection" dynamodbav:"needs_protection"`

	// NumberOfPeople は撮影人数
	NumberOfPeople int `json:"number_of_people" dynamodbav:"number_of_people"`

	// EquipmentInsurance は機材保険の有無
	EquipmentInsurance bool `json:"equipment_insurance" dynamodbav:"equipment_insurance"`

	// Options はオプション（複数選択可、例: ["6人以上のワークショップ", "ラメなどの小道具"]）
	Options []string `json:"options,omitempty" dynamodbav:"options,omitempty"`

	// ShootingType は撮影内容（複数選択可、例: ["スチール", "ムービー"]）
	ShootingType []string `json:"shooting_type" dynamodbav:"shooting_type"`

	// ShootingDetails は撮影の詳細説明
	ShootingDetails string `json:"shooting_details" dynamodbav:"shooting_details"`

	// PhotographerName はカメラマン氏名
	PhotographerName string `json:"photographer_name" dynamodbav:"photographer_name"`
}

// CanCancel は予約がキャンセル可能かを判定する
// 戻り値: キャンセル可能な場合true、不可の場合false
//
// キャンセル可能なステータス:
// - pending（承認待ち）
// - tentative（仮予約）
// - confirmed（本予約確定）
// - waitlisted（第2キープ）
// - scheduled（ロケハン予定）
func (r *Reservation) CanCancel() bool {
	return r.Status == ReservationStatusPending ||
		r.Status == ReservationStatusTentative ||
		r.Status == ReservationStatusConfirmed ||
		r.Status == ReservationStatusWaitlisted ||
		r.Status == ReservationStatusScheduled
}

// CanApprove は予約が承認可能かを判定する
// 戻り値: 承認可能な場合true、不可の場合false
//
// 承認可能なステータス:
// - pending（承認待ち）のみ
func (r *Reservation) CanApprove() bool {
	return r.Status == ReservationStatusPending
}

// CanPromoteToConfirmed は本予約に昇格可能かを判定する
// 戻り値: 昇格可能な場合true、不可の場合false
//
// 昇格可能なステータス:
// - tentative（仮予約）のみ
func (r *Reservation) CanPromoteToConfirmed() bool {
	return r.Status == ReservationStatusTentative
}

// IsExpired は仮予約が期限切れかを判定する
// now: 現在日時
// tentativeExpiryDays: 仮予約の有効期限（利用日の何日前か）
// 戻り値: 期限切れの場合true、有効な場合false
//
// 期限切れ条件:
// - ステータスがtentative（仮予約）
// - 現在日時が「利用日 - tentativeExpiryDays」を過ぎている
//
// 例: 利用日が2026-04-20、tentativeExpiryDays=7の場合
//     期限日は2026-04-13（利用日の7日前）
//     2026-04-14以降は期限切れ
func (r *Reservation) IsExpired(now time.Time, tentativeExpiryDays int) bool {
	if r.Status != ReservationStatusTentative {
		return false
	}

	// 期限日を計算（利用日 - tentativeExpiryDays）
	expiryDate := r.Date.AddDate(0, 0, -tentativeExpiryDays)

	// 現在日時が期限日を過ぎているかチェック
	return now.After(expiryDate)
}

// IsCompleted は予約が完了済みかを判定する
// 戻り値: ステータスがcompletedの場合true、それ以外の場合false
func (r *Reservation) IsCompleted() bool {
	return r.Status == ReservationStatusCompleted
}

// IsCancelled はキャンセル済みかを判定する
// 戻り値: ステータスがcancelledの場合true、それ以外の場合false
func (r *Reservation) IsCancelled() bool {
	return r.Status == ReservationStatusCancelled
}

// IsSecondKeep は第2キープかを判定する
// 戻り値: 予約種別がsecond_keepの場合true、それ以外の場合false
func (r *Reservation) IsSecondKeep() bool {
	return r.ReservationType == ReservationTypeSecondKeep
}

// IsRegular は本予約かを判定する
// 戻り値: 予約種別がregularの場合true、それ以外の場合false
func (r *Reservation) IsRegular() bool {
	return r.ReservationType == ReservationTypeRegular
}

// IsTentative は仮予約かを判定する
// 戻り値: 予約種別がtentativeの場合true、それ以外の場合false
func (r *Reservation) IsTentative() bool {
	return r.ReservationType == ReservationTypeTentative
}

// IsLocationScout はロケハンかを判定する
// 戻り値: 予約種別がlocation_scoutの場合true、それ以外の場合false
func (r *Reservation) IsLocationScout() bool {
	return r.ReservationType == ReservationTypeLocationScout
}

// ShouldBeCompleted は予約を完了済みにすべきかを判定する
// now: 現在日時
// 戻り値: 完了済みにすべき場合true、そうでない場合false
//
// 完了済みにすべき条件:
// - ステータスがconfirmed（本予約確定）またはscheduled（ロケハン予定）
// - 利用日が現在日時より前（利用日経過）
func (r *Reservation) ShouldBeCompleted(now time.Time) bool {
	if r.Status != ReservationStatusConfirmed && r.Status != ReservationStatusScheduled {
		return false
	}

	// 利用日の翌日0時以降を完了済みとする
	// 例: 利用日が2026-04-20の場合、2026-04-21 00:00:00以降は完了済み
	nextDay := r.Date.AddDate(0, 0, 1)
	return now.After(nextDay) || now.Equal(nextDay)
}
