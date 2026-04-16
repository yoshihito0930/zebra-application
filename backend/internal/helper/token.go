package helper

import (
	"fmt"
	"regexp"

	"github.com/google/uuid"
)

// GenerateGuestToken はゲスト予約用の確認トークンを生成する
// トークンはUUID v4形式で生成され、推測不可能である
//
// 戻り値:
//   - string: 生成されたトークン（UUID v4形式の文字列）
//
// 使用例:
//
//	token := helper.GenerateGuestToken()
//	// => "550e8400-e29b-41d4-a716-446655440000"
func GenerateGuestToken() string {
	return uuid.New().String()
}

// ValidateGuestToken はゲストトークンの形式を検証する
// トークンがUUID v4形式であることを確認する
//
// 引数:
//   - token: 検証対象のトークン文字列
//
// 戻り値:
//   - error: 検証エラー（トークンが有効な場合はnil）
//
// 使用例:
//
//	err := helper.ValidateGuestToken("550e8400-e29b-41d4-a716-446655440000")
//	if err != nil {
//	    // トークンが無効
//	}
func ValidateGuestToken(token string) error {
	if token == "" {
		return fmt.Errorf("token is empty")
	}

	// UUID v4形式の正規表現パターン
	// 形式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	// x: 16進数 (0-9, a-f)
	// 4: バージョン4を示す固定値
	// y: 8, 9, a, b のいずれか（バリアントビット）
	uuidPattern := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

	if !uuidPattern.MatchString(token) {
		return fmt.Errorf("invalid token format: expected UUID v4")
	}

	return nil
}
