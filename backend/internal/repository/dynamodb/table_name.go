package dynamodb

import (
	"fmt"
	"os"
	"strings"
)

// GetTableName は環境変数から直接テーブル名を取得する
// 優先順位: 1. 環境変数{UPPER_BASE_NAME}_TABLE, 2. ENVIRONMENT-{baseTableName}
// 例: baseTableName="blocked_slots" -> 環境変数BLOCKED_SLOTS_TABLEの値を取得
func GetTableName(baseTableName string) string {
	// 環境変数名を生成: blocked_slots -> BLOCKED_SLOTS_TABLE
	envVarName := strings.ToUpper(baseTableName) + "_TABLE"
	tableName := os.Getenv(envVarName)

	if tableName != "" {
		return tableName
	}

	// 環境変数が設定されていない場合はENVIRONMENTを使用してフォールバック
	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		// 環境変数が設定されていない場合はベース名をそのまま返す（ローカル開発用）
		return baseTableName
	}
	// ハイフン区切りに変換: blocked_slots -> blocked-slots
	baseNameWithHyphen := strings.ReplaceAll(baseTableName, "_", "-")
	return fmt.Sprintf("%s-%s", env, baseNameWithHyphen)
}
