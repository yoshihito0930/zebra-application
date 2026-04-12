package repository

import (
	"context"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// StudioRepository はスタジオのデータアクセスインターフェース
// DynamoDBのstudiosテーブルへのアクセスを抽象化する
type StudioRepository interface {
	// Create はスタジオを作成する
	//
	// ctx: リクエストコンテキスト
	// studio: 作成するスタジオエンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, studio *entity.Studio) error

	// FindByID はスタジオIDでスタジオを取得する
	//
	// DynamoDBキー: PK=studio_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// 戻り値: スタジオエンティティとエラー。スタジオが存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID string) (*entity.Studio, error)

	// Update はスタジオ情報を更新する
	//
	// ctx: リクエストコンテキスト
	// studio: 更新するスタジオエンティティ（studio_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, studio *entity.Studio) error

	// Delete はスタジオを削除する（論理削除: is_active=false）
	// 注意: 物理削除ではなく、is_activeをfalseに設定する
	//
	// ctx: リクエストコンテキスト
	// studioID: 削除するスタジオID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID string) error
}
