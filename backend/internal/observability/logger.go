package observability

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// LogLevel はログレベルを表す型
type LogLevel int

const (
	DEBUG LogLevel = iota // 0: 詳細なデバッグ情報（開発環境向け）
	INFO                  // 1: 通常の動作ログ（本番環境推奨）
	WARN                  // 2: 警告ログ
	ERROR                 // 3: エラーログ
)

// String はログレベルを文字列に変換
func (l LogLevel) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// Logger は構造化ログを出力するロガー
type Logger struct {
	minLevel LogLevel // 最小ログレベル（これより低いレベルのログは出力されない）
}

// NewLogger は環境変数からログレベルを読み取ってLoggerを作成
// 環境変数 LOG_LEVEL の値:
//   - "DEBUG": 全てのログを出力（開発環境）
//   - "INFO":  INFO以上を出力（本番環境推奨）
//   - "WARN":  WARN以上を出力
//   - "ERROR": ERRORのみ出力
//
// デフォルトは INFO
func NewLogger() *Logger {
	level := INFO // デフォルトはINFO

	// 環境変数 LOG_LEVEL からログレベルを取得
	if envLevel := os.Getenv("LOG_LEVEL"); envLevel != "" {
		switch envLevel {
		case "DEBUG":
			level = DEBUG
		case "INFO":
			level = INFO
		case "WARN":
			level = WARN
		case "ERROR":
			level = ERROR
		}
	}

	return &Logger{minLevel: level}
}

// logEntry は1つのログエントリを表す構造体（JSON形式で出力される）
type logEntry struct {
	Timestamp string                 `json:"timestamp"`           // ログ出力時刻（ISO 8601形式）
	Level     string                 `json:"level"`               // ログレベル（DEBUG, INFO, WARN, ERROR）
	Message   string                 `json:"message"`             // ログメッセージ
	RequestID string                 `json:"request_id,omitempty"` // リクエストID（X-Ray Trace IDなど）
	UserID    string                 `json:"user_id,omitempty"`    // ユーザーID（認証後に設定）
	StudioID  string                 `json:"studio_id,omitempty"`  // スタジオID（認証後に設定）
	Error     string                 `json:"error,omitempty"`      // エラーメッセージ（エラーがある場合のみ）
	Fields    map[string]interface{} `json:"fields,omitempty"`     // カスタムフィールド（任意の追加情報）
}

// Debug はDEBUGレベルのログを出力
// 詳細なデバッグ情報を記録する場合に使用（開発環境のみ）
//
// 使用例:
//
//	logger.Debug(ctx, "予約データを取得しました", map[string]interface{}{
//	    "reservation_id": "rsv_001",
//	    "query_time_ms": 15,
//	})
func (l *Logger) Debug(ctx context.Context, message string, fields map[string]interface{}) {
	if l.minLevel <= DEBUG {
		l.log(ctx, DEBUG, message, nil, fields)
	}
}

// Info はINFOレベルのログを出力
// 通常の動作ログを記録する場合に使用（本番環境推奨）
//
// 使用例:
//
//	logger.Info(ctx, "予約を作成しました", map[string]interface{}{
//	    "reservation_id": "rsv_001",
//	    "studio_id": "studio_001",
//	})
func (l *Logger) Info(ctx context.Context, message string, fields map[string]interface{}) {
	if l.minLevel <= INFO {
		l.log(ctx, INFO, message, nil, fields)
	}
}

// Warn はWARNレベルのログを出力
// 警告すべき事象を記録する場合に使用
//
// 使用例:
//
//	logger.Warn(ctx, "仮予約の期限が近づいています", map[string]interface{}{
//	    "reservation_id": "rsv_001",
//	    "expiry_date": "2025-03-20",
//	})
func (l *Logger) Warn(ctx context.Context, message string, fields map[string]interface{}) {
	if l.minLevel <= WARN {
		l.log(ctx, WARN, message, nil, fields)
	}
}

// Error はERRORレベルのログを出力
// エラーが発生した場合に使用
//
// 使用例:
//
//	logger.Error(ctx, "DynamoDBへの書き込みに失敗しました", err, map[string]interface{}{
//	    "reservation_id": "rsv_001",
//	    "operation": "PutItem",
//	})
func (l *Logger) Error(ctx context.Context, message string, err error, fields map[string]interface{}) {
	if l.minLevel <= ERROR {
		l.log(ctx, ERROR, message, err, fields)
	}
}

// log は実際にログを出力する内部関数
func (l *Logger) log(ctx context.Context, level LogLevel, message string, err error, fields map[string]interface{}) {
	entry := logEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339), // ISO 8601形式（例: 2025-03-29T12:34:56Z）
		Level:     level.String(),
		Message:   message,
		Fields:    fields,
	}

	// コンテキストからリクエストID、ユーザーID、スタジオIDを取得
	// これらはミドルウェアで設定される想定
	if requestID := getRequestID(ctx); requestID != "" {
		entry.RequestID = requestID
	}
	if userID := getUserID(ctx); userID != "" {
		entry.UserID = userID
	}
	if studioID := getStudioID(ctx); studioID != "" {
		entry.StudioID = studioID
	}

	// エラーがある場合はエラーメッセージを追加
	if err != nil {
		entry.Error = err.Error()
	}

	// JSON形式で標準出力に出力（Lambda環境ではCloudWatch Logsに送られる）
	jsonBytes, _ := json.Marshal(entry)
	fmt.Println(string(jsonBytes))
}

// コンテキストキー（コンテキストに値を保存する際のキー）
type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
	studioIDKey  contextKey = "studio_id"
)

// getRequestID はコンテキストからリクエストIDを取得
func getRequestID(ctx context.Context) string {
	if v := ctx.Value(requestIDKey); v != nil {
		return v.(string)
	}
	return ""
}

// getUserID はコンテキストからユーザーIDを取得
func getUserID(ctx context.Context) string {
	if v := ctx.Value(userIDKey); v != nil {
		return v.(string)
	}
	return ""
}

// getStudioID はコンテキストからスタジオIDを取得
func getStudioID(ctx context.Context) string {
	if v := ctx.Value(studioIDKey); v != nil {
		return v.(string)
	}
	return ""
}

// WithRequestID はリクエストIDをコンテキストに追加
// Lambda関数のハンドラー内で、X-Ray Trace IDなどを設定する
//
// 使用例:
//
//	ctx = observability.WithRequestID(ctx, request.RequestContext.RequestID)
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// WithUserID はユーザーIDをコンテキストに追加
// 認証ミドルウェア内で、トークンから取得したユーザーIDを設定する
//
// 使用例:
//
//	ctx = observability.WithUserID(ctx, claims.UserID)
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// WithStudioID はスタジオIDをコンテキストに追加
// 認証ミドルウェア内で、トークンから取得したスタジオIDを設定する
//
// 使用例:
//
//	ctx = observability.WithStudioID(ctx, claims.StudioID)
func WithStudioID(ctx context.Context, studioID string) context.Context {
	return context.WithValue(ctx, studioIDKey, studioID)
}
