package repository

import (
	"context"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// UserRepository はユーザーのデータアクセスインターフェース
// DynamoDBのusersテーブルへのアクセスを抽象化する
type UserRepository interface {
	// Create はユーザーを作成する
	// アクセスパターン: AP-01（ユーザー登録）, AP-16（スタッフユーザー作成）
	//
	// ctx: リクエストコンテキスト
	// user: 作成するユーザーエンティティ
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Create(ctx context.Context, user *entity.User) error

	// FindByID はユーザーIDでユーザーを取得する
	// アクセスパターン: AP-26（予約者情報取得）
	//
	// DynamoDBキー: PK=user_id
	//
	// ctx: リクエストコンテキスト
	// userID: ユーザーID
	// 戻り値: ユーザーエンティティとエラー。ユーザーが存在しない場合はnil, errorを返す
	FindByID(ctx context.Context, userID string) (*entity.User, error)

	// FindByEmail はメールアドレスでユーザーを取得する
	// アクセスパターン: AP-02（メールアドレス重複チェック）
	//
	// DynamoDBキー: GSI1（PK=email）を使用
	//
	// ctx: リクエストコンテキスト
	// email: メールアドレス
	// 戻り値: ユーザーエンティティとエラー。ユーザーが存在しない場合はnil, nilを返す（重複チェック用）
	FindByEmail(ctx context.Context, email string) (*entity.User, error)

	// Update はユーザー情報を更新する
	//
	// ctx: リクエストコンテキスト
	// user: 更新するユーザーエンティティ（user_idは必須）
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Update(ctx context.Context, user *entity.User) error

	// Delete はユーザーを削除する
	// 注意: 物理削除（DynamoDBから完全に削除）
	//
	// ctx: リクエストコンテキスト
	// userID: 削除するユーザーID
	// 戻り値: エラーが発生した場合はエラー、成功した場合はnil
	Delete(ctx context.Context, userID string) error
}
