package repository

import (
	"context"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// InquiryRepository は問い合わせのデータアクセスインターフェース
// DynamoDBのinquiriesテーブルへのアクセスを抽象化する
type InquiryRepository interface {
	// Create は問い合わせを作成する
	// アクセスパターン: AP-14（問い合わせ作成）
	//
	// ctx: リクエストコンテキスト
	// inquiry: 作成する問い合わせエンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, inquiry *entity.Inquiry) error

	// FindByID は問い合わせIDで問い合わせを取得する
	//
	// DynamoDBキー: PK=studio_id, SK=inquiry_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// inquiryID: 問い合わせID
	// 戻り値: 問い合わせエンティティとエラー。問い合わせが存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID, inquiryID string) (*entity.Inquiry, error)

	// FindByUserID はユーザー別問い合わせ一覧を取得する
	// アクセスパターン: AP-15（自分の問い合わせ一覧取得）
	//
	// DynamoDBキー: GSI2（PK=user_id, SK=created_at）を使用
	//
	// ctx: リクエストコンテキスト
	// userID: ユーザーID
	// 戻り値: 問い合わせのスライスとエラー。問い合わせが存在しない場合は空スライスを返す
	FindByUserID(ctx context.Context, userID string) ([]*entity.Inquiry, error)

	// FindByStudioAndStatus はステータス別問い合わせ一覧を取得する
	// アクセスパターン: AP-36（未回答の問い合わせ一覧取得）
	//
	// DynamoDBキー: GSI1（PK=studio_id#inquiry_status, SK=created_at）を使用
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// status: 問い合わせステータス（open/replied/closed）
	// 戻り値: 問い合わせのスライスとエラー。問い合わせが存在しない場合は空スライスを返す
	FindByStudioAndStatus(ctx context.Context, studioID string, status entity.InquiryStatus) ([]*entity.Inquiry, error)

	// Update は問い合わせを更新する
	// アクセスパターン: AP-37（問い合わせに回答）
	//
	// ctx: リクエストコンテキスト
	// inquiry: 更新する問い合わせエンティティ（studio_id, inquiry_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, inquiry *entity.Inquiry) error

	// Delete は問い合わせを削除する（物理削除）
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// inquiryID: 削除する問い合わせID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID, inquiryID string) error
}
