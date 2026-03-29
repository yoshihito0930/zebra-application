package apierror

import "net/http"

// APIError はAPIエラーを表す構造体
type APIError struct {
	Code       string                  `json:"code"`              // エラーコード
	Message    string                  `json:"message"`           // ユーザー向けメッセージ
	StatusCode int                     `json:"-"`                 // HTTPステータスコード（JSONには含めない）
	Details    []ValidationErrorDetail `json:"details,omitempty"` // バリデーションエラーの詳細
}

// ValidationErrorDetail はバリデーションエラーの詳細
type ValidationErrorDetail struct {
	Field   string `json:"field"`   // エラーが発生したフィールド名
	Message string `json:"message"` // エラーメッセージ
}

// Error は error インターフェースを実装
func (e *APIError) Error() string {
	return e.Message
}

// WithDetails はバリデーションエラーに詳細情報を追加
// 元のエラーは変更せず、新しいエラーインスタンスを返す
func (e *APIError) WithDetails(details []ValidationErrorDetail) *APIError {
	return &APIError{
		Code:       e.Code,
		Message:    e.Message,
		StatusCode: e.StatusCode,
		Details:    details,
	}
}

// 400 Bad Request - バリデーションエラー
var (
	// ErrValidation は入力内容に誤りがある場合のエラー
	ErrValidation = &APIError{
		Code:       "VALIDATION_ERROR",
		Message:    "入力内容に誤りがあります",
		StatusCode: http.StatusBadRequest,
	}
)

// 401 Unauthorized - 認証エラー
var (
	// ErrAuthTokenMissing は認証トークンが提供されていない場合のエラー
	ErrAuthTokenMissing = &APIError{
		Code:       "AUTH_TOKEN_MISSING",
		Message:    "認証トークンが必要です",
		StatusCode: http.StatusUnauthorized,
	}

	// ErrAuthTokenExpired は認証トークンの有効期限が切れている場合のエラー
	ErrAuthTokenExpired = &APIError{
		Code:       "AUTH_TOKEN_EXPIRED",
		Message:    "認証トークンの有効期限が切れています",
		StatusCode: http.StatusUnauthorized,
	}

	// ErrAuthTokenInvalid は認証トークンが無効な場合のエラー
	ErrAuthTokenInvalid = &APIError{
		Code:       "AUTH_TOKEN_INVALID",
		Message:    "認証トークンが無効です",
		StatusCode: http.StatusUnauthorized,
	}

	// ErrAuthLoginFailed はログインに失敗した場合のエラー
	ErrAuthLoginFailed = &APIError{
		Code:       "AUTH_LOGIN_FAILED",
		Message:    "メールアドレスまたはパスワードが正しくありません",
		StatusCode: http.StatusUnauthorized,
	}
)

// 403 Forbidden - 認可エラー
var (
	// ErrForbiddenRole はロールに操作権限がない場合のエラー
	ErrForbiddenRole = &APIError{
		Code:       "FORBIDDEN_ROLE",
		Message:    "この操作を行う権限がありません",
		StatusCode: http.StatusForbidden,
	}

	// ErrForbiddenResource はリソースへのアクセス権限がない場合のエラー
	// 例: 他人の予約、他スタジオのデータへのアクセス
	ErrForbiddenResource = &APIError{
		Code:       "FORBIDDEN_RESOURCE",
		Message:    "このリソースにアクセスする権限がありません",
		StatusCode: http.StatusForbidden,
	}
)

// 404 Not Found - リソース不在エラー
var (
	// ErrReservationNotFound は指定された予約が見つからない場合のエラー
	ErrReservationNotFound = &APIError{
		Code:       "RESERVATION_NOT_FOUND",
		Message:    "指定された予約が見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrUserNotFound は指定されたユーザーが見つからない場合のエラー
	ErrUserNotFound = &APIError{
		Code:       "USER_NOT_FOUND",
		Message:    "指定されたユーザが見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrPlanNotFound は指定されたプランが見つからない場合のエラー
	ErrPlanNotFound = &APIError{
		Code:       "PLAN_NOT_FOUND",
		Message:    "指定されたプランが見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrOptionNotFound は指定されたオプションが見つからない場合のエラー
	ErrOptionNotFound = &APIError{
		Code:       "OPTION_NOT_FOUND",
		Message:    "指定されたオプションが見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrStudioNotFound は指定されたスタジオが見つからない場合のエラー
	ErrStudioNotFound = &APIError{
		Code:       "STUDIO_NOT_FOUND",
		Message:    "指定されたスタジオが見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrBlockedSlotNotFound は指定されたブロック枠が見つからない場合のエラー
	ErrBlockedSlotNotFound = &APIError{
		Code:       "BLOCKED_SLOT_NOT_FOUND",
		Message:    "指定されたブロック枠が見つかりません",
		StatusCode: http.StatusNotFound,
	}

	// ErrInquiryNotFound は指定された問い合わせが見つからない場合のエラー
	ErrInquiryNotFound = &APIError{
		Code:       "INQUIRY_NOT_FOUND",
		Message:    "指定された問い合わせが見つかりません",
		StatusCode: http.StatusNotFound,
	}
)

// 409 Conflict - 業務エラー（業務ロジック上の競合）
var (
	// ErrReservationConflict は指定日時が既に予約済みの場合のエラー
	ErrReservationConflict = &APIError{
		Code:       "RESERVATION_CONFLICT",
		Message:    "指定の日時は既に予約済みです",
		StatusCode: http.StatusConflict,
	}

	// ErrBlockedSlotConflict は指定日時がブロック枠に設定されている場合のエラー
	ErrBlockedSlotConflict = &APIError{
		Code:       "BLOCKED_SLOT_CONFLICT",
		Message:    "指定の日時はブロック枠に設定されています",
		StatusCode: http.StatusConflict,
	}

	// ErrRegularHoliday は指定日が定休日の場合のエラー
	ErrRegularHoliday = &APIError{
		Code:       "REGULAR_HOLIDAY",
		Message:    "指定の日付は定休日です",
		StatusCode: http.StatusConflict,
	}

	// ErrEmailAlreadyExists はメールアドレスが既に登録されている場合のエラー
	ErrEmailAlreadyExists = &APIError{
		Code:       "EMAIL_ALREADY_EXISTS",
		Message:    "このメールアドレスは既に登録されています",
		StatusCode: http.StatusConflict,
	}

	// ErrInvalidStatusTransition は現在の状態で実行できない操作の場合のエラー
	// 例: キャンセル済み予約の承認、完了済み予約の編集など
	ErrInvalidStatusTransition = &APIError{
		Code:       "INVALID_STATUS_TRANSITION",
		Message:    "この操作は現在のステータスでは実行できません",
		StatusCode: http.StatusConflict,
	}

	// ErrSecondKeepNoPrimary は第2キープの前提条件（同一時間帯の本予約/仮予約）が満たされていない場合のエラー
	ErrSecondKeepNoPrimary = &APIError{
		Code:       "SECOND_KEEP_NO_PRIMARY",
		Message:    "第2キープには同一時間帯の本予約/仮予約が必要です",
		StatusCode: http.StatusConflict,
	}

	// ErrPlanInactive は無効化されたプランを指定した場合のエラー
	ErrPlanInactive = &APIError{
		Code:       "PLAN_INACTIVE",
		Message:    "指定されたプランは現在利用できません",
		StatusCode: http.StatusConflict,
	}

	// ErrOptionInactive は無効化されたオプションを指定した場合のエラー
	ErrOptionInactive = &APIError{
		Code:       "OPTION_INACTIVE",
		Message:    "指定されたオプションは現在利用できません",
		StatusCode: http.StatusConflict,
	}
)

// 500 Internal Server Error - サーバー内部エラー
var (
	// ErrInternalServer はサーバー内部でエラーが発生した場合のエラー
	// 内部の詳細情報はレスポンスに含めず、CloudWatch Logsに記録する
	ErrInternalServer = &APIError{
		Code:       "INTERNAL_ERROR",
		Message:    "サーバー内部でエラーが発生しました",
		StatusCode: http.StatusInternalServerError,
	}
)
