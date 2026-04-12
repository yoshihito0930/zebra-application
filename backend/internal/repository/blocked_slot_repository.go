package repository

import (
	"context"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// BlockedSlotRepository はブロック枠のデータアクセスインターフェース
// DynamoDBのblocked_slotsテーブルへのアクセスを抽象化する
type BlockedSlotRepository interface {
	// Create はブロック枠を作成する
	// アクセスパターン: AP-29（ブロック枠作成）
	//
	// ctx: リクエストコンテキスト
	// blockedSlot: 作成するブロック枠エンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, blockedSlot *entity.BlockedSlot) error

	// FindByID はブロック枠IDでブロック枠を取得する
	//
	// DynamoDBキー: PK=studio_id, SK=date#blocked_slot_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// blockedSlotID: ブロック枠ID
	// 戻り値: ブロック枠エンティティとエラー。ブロック枠が存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID, blockedSlotID string) (*entity.BlockedSlot, error)

	// FindByStudioAndDateRange は指定期間のブロック枠一覧を取得する
	// アクセスパターン: AP-04（指定月のブロック枠一覧）, AP-30（ブロック枠一覧取得）
	//
	// DynamoDBキー: PK=studio_id, SK between date#blocked_slot_id でQuery
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// startDate: 開始日（この日を含む）
	// endDate: 終了日（この日を含む）
	// 戻り値: ブロック枠のスライスとエラー。ブロック枠が存在しない場合は空スライスを返す
	FindByStudioAndDateRange(ctx context.Context, studioID string, startDate, endDate time.Time) ([]*entity.BlockedSlot, error)

	// FindByStudioAndDate は指定日のブロック枠を取得する
	// アクセスパターン: AP-06（ブロック枠の存在チェック）
	//
	// DynamoDBキー: PK=studio_id, SK begins_with date でQuery
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// date: 対象日
	// 戻り値: ブロック枠のスライスとエラー。ブロック枠が存在しない場合は空スライスを返す
	FindByStudioAndDate(ctx context.Context, studioID string, date time.Time) ([]*entity.BlockedSlot, error)

	// Update はブロック枠を更新する
	//
	// ctx: リクエストコンテキスト
	// blockedSlot: 更新するブロック枠エンティティ（studio_id, blocked_slot_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, blockedSlot *entity.BlockedSlot) error

	// Delete はブロック枠を削除する（物理削除）
	// アクセスパターン: AP-31（ブロック枠削除）
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// blockedSlotID: 削除するブロック枠ID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID, blockedSlotID string) error
}
