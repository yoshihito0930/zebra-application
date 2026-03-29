package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
)

// captureOutput はテスト用のヘルパー関数
// 標準出力をキャプチャして、ログ出力をテストできるようにする
func captureOutput(f func()) string {
	// 元の標準出力を保存
	old := os.Stdout

	// パイプを作成（書き込み側と読み取り側）
	r, w, _ := os.Pipe()
	os.Stdout = w

	// テスト対象の関数を実行
	f()

	// 書き込み側を閉じる
	w.Close()

	// 標準出力を元に戻す
	os.Stdout = old

	// パイプから読み取り
	var buf bytes.Buffer
	io.Copy(&buf, r)
	return buf.String()
}

// TestNewLogger_DefaultLevel は環境変数なしの場合のデフォルトログレベルをテスト
func TestNewLogger_DefaultLevel(t *testing.T) {
	// テストケース: 環境変数なしの場合、デフォルトはINFO

	// 環境変数をクリア
	os.Unsetenv("LOG_LEVEL")

	logger := NewLogger()

	if logger.minLevel != INFO {
		t.Errorf("Default log level = %v, want INFO", logger.minLevel)
	}
}

// TestNewLogger_WithEnvVar は環境変数でログレベルを指定した場合をテスト
func TestNewLogger_WithEnvVar(t *testing.T) {
	// テストケース: 環境変数でログレベルを指定できるか

	tests := []struct {
		envValue  string
		wantLevel LogLevel
	}{
		{"DEBUG", DEBUG},
		{"INFO", INFO},
		{"WARN", WARN},
		{"ERROR", ERROR},
		{"INVALID", INFO}, // 無効な値の場合はデフォルト（INFO）
	}

	for _, tt := range tests {
		t.Run(tt.envValue, func(t *testing.T) {
			// 環境変数を設定
			os.Setenv("LOG_LEVEL", tt.envValue)
			defer os.Unsetenv("LOG_LEVEL")

			logger := NewLogger()

			if logger.minLevel != tt.wantLevel {
				t.Errorf("Log level with %s = %v, want %v", tt.envValue, logger.minLevel, tt.wantLevel)
			}
		})
	}
}

// TestLogLevel_String はLogLevel.String()メソッドをテスト
func TestLogLevel_String(t *testing.T) {
	tests := []struct {
		level LogLevel
		want  string
	}{
		{DEBUG, "DEBUG"},
		{INFO, "INFO"},
		{WARN, "WARN"},
		{ERROR, "ERROR"},
		{LogLevel(999), "UNKNOWN"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := tt.level.String(); got != tt.want {
				t.Errorf("LogLevel.String() = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestLogger_Info はInfo()メソッドをテスト
func TestLogger_Info(t *testing.T) {
	// テストケース: INFOログが正しくJSON形式で出力されるか

	// 1. ロガーを作成（DEBUGレベルで全ログ出力）
	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	// 2. コンテキストにリクエストIDを追加
	ctx := WithRequestID(context.Background(), "req_12345")

	// 3. 標準出力をキャプチャしながらログ出力
	output := captureOutput(func() {
		logger.Info(ctx, "テストメッセージ", map[string]interface{}{
			"reservation_id": "rsv_001",
			"status":         "confirmed",
		})
	})

	// 4. 出力がJSON形式であることを確認
	var logEntry map[string]interface{}
	if err := json.Unmarshal([]byte(output), &logEntry); err != nil {
		t.Fatalf("Failed to parse log output as JSON: %v\nOutput: %s", err, output)
	}

	// 5. ログレベルの確認
	if logEntry["level"] != "INFO" {
		t.Errorf("level = %v, want INFO", logEntry["level"])
	}

	// 6. メッセージの確認
	if logEntry["message"] != "テストメッセージ" {
		t.Errorf("message = %v, want テストメッセージ", logEntry["message"])
	}

	// 7. リクエストIDの確認
	if logEntry["request_id"] != "req_12345" {
		t.Errorf("request_id = %v, want req_12345", logEntry["request_id"])
	}

	// 8. タイムスタンプが存在するか確認
	if _, ok := logEntry["timestamp"]; !ok {
		t.Error("timestamp field should be present")
	}

	// 9. カスタムフィールドの確認
	fields := logEntry["fields"].(map[string]interface{})
	if fields["reservation_id"] != "rsv_001" {
		t.Errorf("fields.reservation_id = %v, want rsv_001", fields["reservation_id"])
	}
	if fields["status"] != "confirmed" {
		t.Errorf("fields.status = %v, want confirmed", fields["status"])
	}
}

// TestLogger_Debug はDebug()メソッドをテスト
func TestLogger_Debug(t *testing.T) {
	// テストケース: DEBUGログが正しく出力されるか

	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()

	output := captureOutput(func() {
		logger.Debug(ctx, "デバッグメッセージ", map[string]interface{}{
			"query": "SELECT * FROM reservations",
		})
	})

	var logEntry map[string]interface{}
	json.Unmarshal([]byte(output), &logEntry)

	if logEntry["level"] != "DEBUG" {
		t.Errorf("level = %v, want DEBUG", logEntry["level"])
	}
}

// TestLogger_Warn はWarn()メソッドをテスト
func TestLogger_Warn(t *testing.T) {
	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()

	output := captureOutput(func() {
		logger.Warn(ctx, "警告メッセージ", nil)
	})

	var logEntry map[string]interface{}
	json.Unmarshal([]byte(output), &logEntry)

	if logEntry["level"] != "WARN" {
		t.Errorf("level = %v, want WARN", logEntry["level"])
	}
}

// TestLogger_Error はError()メソッドをテスト
func TestLogger_Error(t *testing.T) {
	// テストケース: ERRORログがエラー情報を含むか

	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()
	testErr := errors.New("データベース接続エラー")

	output := captureOutput(func() {
		logger.Error(ctx, "エラーが発生しました", testErr, map[string]interface{}{
			"operation": "DynamoDB.PutItem",
		})
	})

	var logEntry map[string]interface{}
	json.Unmarshal([]byte(output), &logEntry)

	// ログレベルの確認
	if logEntry["level"] != "ERROR" {
		t.Errorf("level = %v, want ERROR", logEntry["level"])
	}

	// エラーフィールドが存在するか確認
	if logEntry["error"] != "データベース接続エラー" {
		t.Errorf("error = %v, want データベース接続エラー", logEntry["error"])
	}

	// カスタムフィールドの確認
	fields := logEntry["fields"].(map[string]interface{})
	if fields["operation"] != "DynamoDB.PutItem" {
		t.Errorf("fields.operation = %v, want DynamoDB.PutItem", fields["operation"])
	}
}

// TestLogger_LogLevelFiltering はログレベルフィルタリングをテスト
func TestLogger_LogLevelFiltering(t *testing.T) {
	// テストケース: ログレベルがERRORの場合、INFOログは出力されない

	os.Setenv("LOG_LEVEL", "ERROR")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()

	// DEBUGログを出力（出力されないはず）
	output := captureOutput(func() {
		logger.Debug(ctx, "これは表示されない", nil)
	})
	if strings.TrimSpace(output) != "" {
		t.Errorf("DEBUG log should not be output when level is ERROR, got: %s", output)
	}

	// INFOログを出力（出力されないはず）
	output = captureOutput(func() {
		logger.Info(ctx, "これも表示されない", nil)
	})
	if strings.TrimSpace(output) != "" {
		t.Errorf("INFO log should not be output when level is ERROR, got: %s", output)
	}

	// WARNログを出力（出力されないはず）
	output = captureOutput(func() {
		logger.Warn(ctx, "これも表示されない", nil)
	})
	if strings.TrimSpace(output) != "" {
		t.Errorf("WARN log should not be output when level is ERROR, got: %s", output)
	}

	// ERRORログを出力（出力されるはず）
	output = captureOutput(func() {
		logger.Error(ctx, "これは表示される", nil, nil)
	})
	if strings.TrimSpace(output) == "" {
		t.Error("ERROR log should be output when level is ERROR")
	}
}

// TestLogger_LogLevelFiltering_WARN はWARNレベルでのフィルタリングをテスト
func TestLogger_LogLevelFiltering_WARN(t *testing.T) {
	// テストケース: ログレベルがWARNの場合、INFOは出力されず、WARNとERRORは出力される

	os.Setenv("LOG_LEVEL", "WARN")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()

	// INFOログは出力されない
	output := captureOutput(func() {
		logger.Info(ctx, "出力されない", nil)
	})
	if strings.TrimSpace(output) != "" {
		t.Error("INFO log should not be output when level is WARN")
	}

	// WARNログは出力される
	output = captureOutput(func() {
		logger.Warn(ctx, "出力される", nil)
	})
	if strings.TrimSpace(output) == "" {
		t.Error("WARN log should be output when level is WARN")
	}

	// ERRORログも出力される
	output = captureOutput(func() {
		logger.Error(ctx, "出力される", nil, nil)
	})
	if strings.TrimSpace(output) == "" {
		t.Error("ERROR log should be output when level is WARN")
	}
}

// TestContextValues はコンテキストへの値の追加・取得をテスト
func TestContextValues(t *testing.T) {
	// テストケース: コンテキストにユーザーID、スタジオIDを追加・取得できるか

	ctx := context.Background()

	// リクエストIDを追加・取得
	ctx = WithRequestID(ctx, "req_001")
	if getRequestID(ctx) != "req_001" {
		t.Errorf("getRequestID() = %v, want req_001", getRequestID(ctx))
	}

	// ユーザーIDを追加・取得
	ctx = WithUserID(ctx, "usr_123")
	if getUserID(ctx) != "usr_123" {
		t.Errorf("getUserID() = %v, want usr_123", getUserID(ctx))
	}

	// スタジオIDを追加・取得
	ctx = WithStudioID(ctx, "studio_001")
	if getStudioID(ctx) != "studio_001" {
		t.Errorf("getStudioID() = %v, want studio_001", getStudioID(ctx))
	}
}

// TestContextValues_Empty は空のコンテキストから値を取得した場合をテスト
func TestContextValues_Empty(t *testing.T) {
	// テストケース: 値が設定されていないコンテキストからは空文字列が返る

	ctx := context.Background()

	if getRequestID(ctx) != "" {
		t.Error("getRequestID() should return empty string for empty context")
	}
	if getUserID(ctx) != "" {
		t.Error("getUserID() should return empty string for empty context")
	}
	if getStudioID(ctx) != "" {
		t.Error("getStudioID() should return empty string for empty context")
	}
}

// TestLogger_WithAllContextValues はすべてのコンテキスト値が含まれたログをテスト
func TestLogger_WithAllContextValues(t *testing.T) {
	// テストケース: リクエストID、ユーザーID、スタジオIDがすべてログに含まれるか

	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	// すべての値をコンテキストに追加
	ctx := context.Background()
	ctx = WithRequestID(ctx, "req_12345")
	ctx = WithUserID(ctx, "usr_67890")
	ctx = WithStudioID(ctx, "studio_001")

	output := captureOutput(func() {
		logger.Info(ctx, "すべてのコンテキスト値をテスト", nil)
	})

	var logEntry map[string]interface{}
	json.Unmarshal([]byte(output), &logEntry)

	// すべての値が含まれているか確認
	if logEntry["request_id"] != "req_12345" {
		t.Errorf("request_id = %v, want req_12345", logEntry["request_id"])
	}
	if logEntry["user_id"] != "usr_67890" {
		t.Errorf("user_id = %v, want usr_67890", logEntry["user_id"])
	}
	if logEntry["studio_id"] != "studio_001" {
		t.Errorf("studio_id = %v, want studio_001", logEntry["studio_id"])
	}
}

// TestLogger_WithoutFields はフィールドなしのログをテスト
func TestLogger_WithoutFields(t *testing.T) {
	// テストケース: fieldsにnilを渡してもエラーにならないか

	os.Setenv("LOG_LEVEL", "DEBUG")
	logger := NewLogger()
	defer os.Unsetenv("LOG_LEVEL")

	ctx := context.Background()

	output := captureOutput(func() {
		logger.Info(ctx, "フィールドなしのログ", nil)
	})

	var logEntry map[string]interface{}
	if err := json.Unmarshal([]byte(output), &logEntry); err != nil {
		t.Fatalf("Failed to parse log: %v", err)
	}

	// fieldsフィールドが存在しないか、空であることを確認
	// （JSON出力時に omitempty により省略される）
	if fields, ok := logEntry["fields"]; ok && fields != nil {
		t.Errorf("fields should be omitted when nil, got: %v", fields)
	}
}
