package repository

import (
	"context"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// OptionRepository はオプションのデータアクセスインターフェース
// DynamoDBのoptionsテーブルへのアクセスを抽象化する
type OptionRepository interface {
	// Create はオプションを作成する
	// アクセスパターン: 管理者によるオプション作成
	//
	// ctx: リクエストコンテキスト
	// option: 作成するオプションエンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, option *entity.Option) error

	// FindByID はオプションIDでオプションを取得する
	// アクセスパターン: 予約作成時のオプション詳細取得
	//
	// DynamoDBキー: PK=studio_id, SK=option_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// optionID: オプションID
	// 戻り値: オプションエンティティとエラー。オプションが存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID string, optionID string) (*entity.Option, error)

	// FindByStudioID はスタジオIDでオプション一覧を取得する
	// アクセスパターン: 予約フォームでのオプション一覧表示
	//
	// DynamoDBキー: PK=studio_id でQuery
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// 戻り値: オプションのスライスとエラー。オプションが存在しない場合は空スライスを返す
	FindByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error)

	// FindActiveByStudioID は有効なオプション一覧を取得する
	// アクセスパターン: 予約フォームでの有効オプション表示
	//
	// DynamoDBキー: PK=studio_id でQueryし、is_active=trueでフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// 戻り値: 有効なオプションのスライスとエラー。存在しない場合は空スライスを返す
	FindActiveByStudioID(ctx context.Context, studioID string) ([]*entity.Option, error)

	// Update はオプションを更新する
	//
	// ctx: リクエストコンテキスト
	// option: 更新するオプションエンティティ（studio_id, option_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, option *entity.Option) error

	// Delete はオプションを削除する（物理削除）
	// 注意: 通常は使用せず、is_activeをfalseに更新する
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// optionID: 削除するオプションID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID string, optionID string) error
}
