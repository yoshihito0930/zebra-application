package repository

import (
	"context"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// PlanRepository は料金プランのデータアクセスインターフェース
// DynamoDBのplansテーブルへのアクセスを抽象化する
type PlanRepository interface {
	// Create はプランを作成する
	// アクセスパターン: AP-33（プラン作成）
	//
	// ctx: リクエストコンテキスト
	// plan: 作成するプランエンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, plan *entity.Plan) error

	// FindByID はプランIDでプランを取得する
	//
	// DynamoDBキー: PK=studio_id, SK=plan_id
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// planID: プランID
	// 戻り値: プランエンティティとエラー。プランが存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, studioID, planID string) (*entity.Plan, error)

	// FindByStudio はスタジオの全プランを取得する
	// アクセスパターン: AP-32（プラン一覧取得）
	//
	// DynamoDBキー: PK=studio_id でQuery
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// 戻り値: プランのスライスとエラー。プランが存在しない場合は空スライスを返す
	FindByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error)

	// FindActiveByStudio は有効なプランのみ取得する
	// アクセスパターン: AP-50（有効なプラン一覧取得）
	//
	// DynamoDBキー: PK=studio_id でQuery後、is_active=trueでフィルタ
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// 戻り値: 有効なプランのスライスとエラー。プランが存在しない場合は空スライスを返す
	FindActiveByStudio(ctx context.Context, studioID string) ([]*entity.Plan, error)

	// Update はプランを更新する
	// アクセスパターン: AP-33（プラン更新）
	//
	// ctx: リクエストコンテキスト
	// plan: 更新するプランエンティティ（studio_id, plan_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, plan *entity.Plan) error

	// Delete はプランを削除する（論理削除: is_active=false）
	// アクセスパターン: AP-33（プラン無効化）
	// 注意: 物理削除ではなく、is_activeをfalseに設定する
	//
	// ctx: リクエストコンテキスト
	// studioID: スタジオID
	// planID: 削除するプランID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, studioID, planID string) error
}
