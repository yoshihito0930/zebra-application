package repository

import (
	"context"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// ReservationRepository は予約のデータアクセスインターフェース
// DynamoDBのreservationsテーブルへのアクセスを抽象化する
type ReservationRepository interface {
	// Create は予約を作成する
	// アクセスパターン: AP-07（予約作成）, AP-17（管理者側予約作成）
	//
	// ctx: リクエストコンテキスト
	// reservation: 作成する予約エンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, reservation *entity.Reservation) error

	// FindByID は予約IDで予約を取得する
	// アクセスパターン: AP-10（予約詳細取得）, AP-25, AP-39
	//
	// DynamoDBキー: GSI3（PK=reservation_id）を使用
	//
	// ctx: リクエストコンテキスト
	// reservationID: 予約ID
	// 戻り値: 予約エンティティとエラー。予約が存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, reservationID string) (*entity.Reservation, error)

	// FindByStudioAndDateRange は指定期間の予約一覧を取得する
	// アクセスパターン: AP-03（指定月の予約一覧）, AP-24, AP-38
	//
	// DynamoDBキー: PK=studio_id, SK between date#reservation_id でQuery
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// startDate: 開始日（この日を含む）
	// endDate: 終了日（この日を含む）
	// 戻り値: 予約のスライスとエラー。予約が存在しない場合は空スライスを返す
	FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.Reservation, error)

	// FindByStudioAndStatus はステータス別予約一覧を取得する
	// アクセスパターン: AP-18（pending予約一覧取得）
	//
	// DynamoDBキー: GSI1（PK=studio_id#status, SK=date）を使用
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// status: 予約ステータス
	// 戻り値: 予約のスライスとエラー。予約が存在しない場合は空スライスを返す
	FindByStudioAndStatus(ctx context.Context, studioID string, status entity.ReservationStatus) ([]*entity.Reservation, error)

	// FindByUserID はユーザー別予約一覧を取得する
	// アクセスパターン: AP-09（自分の予約一覧取得）
	//
	// DynamoDBキー: GSI2（PK=user_id, SK=date#reservation_id）を使用
	//
	// ctx: リクエストコンテキスト
	// userID: ユーザーID
	// 戻り値: 予約のスライスとエラー。予約が存在しない場合は空スライスを返す
	FindByUserID(ctx context.Context, userID string) ([]*entity.Reservation, error)

	// FindByGuestToken はゲストトークンで予約を取得する
	// ゲスト予約の確認・キャンセル・昇格に使用
	//
	// DynamoDBキー: GSI5（PK=guest_token）を使用
	//
	// ctx: リクエストコンテキスト
	// guestToken: ゲスト確認用トークン（UUID v4形式）
	// 戻り値: 予約エンティティとエラー。予約が存在しない場合はnil, errorを返す
	FindByGuestToken(ctx context.Context, guestToken string) (*entity.Reservation, error)

	// FindByLinkedReservationID は第2キープを検索する
	// アクセスパターン: AP-42（第2キープ取得）
	//
	// DynamoDBキー: GSI4（PK=linked_reservation_id）を使用
	//
	// ctx: リクエストコンテキスト
	// linkedReservationID: 第1候補の予約ID
	// 戻り値: 予約のスライスとエラー。予約が存在しない場合は空スライスを返す
	FindByLinkedReservationID(ctx context.Context, linkedReservationID string) ([]*entity.Reservation, error)

	// FindConflicting は指定時間帯に重複する予約を検索する
	// アクセスパターン: AP-05（同一時間帯の予約存在チェック）
	//
	// DynamoDBキー: PK=studio_id, SK begins_with date でQueryし、
	// 時間帯の重複とステータス（confirmed/tentative/scheduled）でフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// date: 利用日
	// startTime: 開始時刻（HH:MM形式）
	// endTime: 終了時刻（HH:MM形式）
	// 戻り値: 重複する予約のスライスとエラー。重複がない場合は空スライスを返す
	FindConflicting(ctx context.Context, studioID string, date time.Time, startTime, endTime string) ([]*entity.Reservation, error)

	// FindExpiredTentative は期限切れの仮予約を検索する
	// アクセスパターン: AP-48（期限切れの仮予約取得）
	//
	// DynamoDBキー: GSI1（PK=studio_id#tentative）でQueryし、
	// expiry_date < 指定日 でフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// expiryDate: 期限日（この日より前が期限切れ）
	// 戻り値: 期限切れの仮予約のスライスとエラー。存在しない場合は空スライスを返す
	FindExpiredTentative(ctx context.Context, studioID string, expiryDate time.Time) ([]*entity.Reservation, error)

	// FindUpcomingConfirmed は翌日の確定予約を検索する
	// アクセスパターン: AP-44（翌日の予約一覧取得）
	//
	// DynamoDBキー: GSI1（PK=studio_id#confirmed, SK=date）でQueryし、
	// date = 指定日 でフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// date: 対象日
	// 戻り値: 確定予約のスライスとエラー。存在しない場合は空スライスを返す
	FindUpcomingConfirmed(ctx context.Context, studioID string, date time.Time) ([]*entity.Reservation, error)

	// FindPastConfirmed は利用日経過の確定予約を検索する
	// アクセスパターン: AP-46（利用日経過の予約取得）
	//
	// DynamoDBキー: GSI1（PK=studio_id#confirmed または studio_id#scheduled）でQueryし、
	// date < 指定日 でフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// beforeDate: この日より前の予約を取得
	// 戻り値: 利用日経過の予約のスライスとエラー。存在しない場合は空スライスを返す
	FindPastConfirmed(ctx context.Context, studioID string, beforeDate time.Time) ([]*entity.Reservation, error)

	// Update は予約を更新する
	// アクセスパターン: AP-11, AP-13, AP-19, AP-21, AP-23, AP-27, AP-28, AP-43, AP-47, AP-49
	// （各種ステータス更新、予約内容更新）
	//
	// ctx: リクエストコンテキスト
	// reservation: 更新する予約エンティティ（studio_id, reservation_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, reservation *entity.Reservation) error

	// Delete は予約を削除する（物理削除）
	// 注意: 通常は使用せず、ステータスをcancelledに更新する
	//
	// ctx: リクエストコンテキスト
	// reservationID: 削除する予約ID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, reservationID string) error
}
