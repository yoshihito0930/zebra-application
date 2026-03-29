package apierror

import (
	"net/http"
	"testing"
)

// TestAPIError_Error は APIError.Error() メソッドをテスト
// Go言語のerrorインターフェースを実装しているかを確認
func TestAPIError_Error(t *testing.T) {
	// テストケース: APIErrorのError()メソッドがメッセージを返すことを確認

	// 1. テスト対象のデータを準備
	err := &APIError{
		Code:       "TEST_ERROR",
		Message:    "これはテストエラーです",
		StatusCode: http.StatusBadRequest,
	}

	// 2. 実際にメソッドを実行
	result := err.Error()

	// 3. 期待する結果と比較
	expected := "これはテストエラーです"
	if result != expected {
		// 期待と異なる場合、テスト失敗
		t.Errorf("Error() = %v, want %v", result, expected)
	}
}

// TestAPIError_WithDetails はWithDetails()メソッドをテスト
// バリデーションエラーに詳細情報を追加できることを確認
func TestAPIError_WithDetails(t *testing.T) {
	// テストケース: WithDetails()が詳細情報を追加できることを確認

	// 1. 元のエラーを準備
	baseErr := ErrValidation

	// 2. バリデーション詳細を追加
	details := []ValidationErrorDetail{
		{Field: "email", Message: "メールアドレス形式が正しくありません"},
		{Field: "password", Message: "8文字以上である必要があります"},
	}
	err := baseErr.WithDetails(details)

	// 3. 詳細が正しく追加されたか確認
	if len(err.Details) != 2 {
		t.Errorf("Details length = %d, want 2", len(err.Details))
	}

	if err.Details[0].Field != "email" {
		t.Errorf("Details[0].Field = %v, want email", err.Details[0].Field)
	}

	if err.Details[0].Message != "メールアドレス形式が正しくありません" {
		t.Errorf("Details[0].Message = %v, want メールアドレス形式が正しくありません", err.Details[0].Message)
	}

	// 4. 元のエラーが変更されていないことを確認（不変性のテスト）
	if len(baseErr.Details) != 0 {
		t.Error("Original error should not be modified")
	}
}

// TestErrValidation はバリデーションエラーの定義をテスト
func TestErrValidation(t *testing.T) {
	// テストケース: バリデーションエラーが正しく定義されているか確認

	if ErrValidation.Code != "VALIDATION_ERROR" {
		t.Errorf("Code = %v, want VALIDATION_ERROR", ErrValidation.Code)
	}

	if ErrValidation.StatusCode != http.StatusBadRequest {
		t.Errorf("StatusCode = %v, want %v", ErrValidation.StatusCode, http.StatusBadRequest)
	}

	if ErrValidation.Message == "" {
		t.Error("Message should not be empty")
	}
}

// TestAuthErrors は認証関連のエラー定義をテスト（401 Unauthorized）
func TestAuthErrors(t *testing.T) {
	// テストケース: 認証エラーが正しく定義されているか確認

	tests := []struct {
		name       string
		err        *APIError
		wantCode   string
		wantStatus int
	}{
		{
			name:       "AUTH_TOKEN_MISSING",
			err:        ErrAuthTokenMissing,
			wantCode:   "AUTH_TOKEN_MISSING",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "AUTH_TOKEN_EXPIRED",
			err:        ErrAuthTokenExpired,
			wantCode:   "AUTH_TOKEN_EXPIRED",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "AUTH_TOKEN_INVALID",
			err:        ErrAuthTokenInvalid,
			wantCode:   "AUTH_TOKEN_INVALID",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "AUTH_LOGIN_FAILED",
			err:        ErrAuthLoginFailed,
			wantCode:   "AUTH_LOGIN_FAILED",
			wantStatus: http.StatusUnauthorized,
		},
	}

	// テーブル駆動テスト: 複数のテストケースをループで実行
	for _, tt := range tests {
		// t.Run()でサブテストを作成（テスト結果が見やすくなる）
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Code != tt.wantCode {
				t.Errorf("Code = %v, want %v", tt.err.Code, tt.wantCode)
			}
			if tt.err.StatusCode != tt.wantStatus {
				t.Errorf("StatusCode = %v, want %v", tt.err.StatusCode, tt.wantStatus)
			}
			if tt.err.Message == "" {
				t.Error("Message should not be empty")
			}
		})
	}
}

// TestForbiddenErrors は認可関連のエラー定義をテスト（403 Forbidden）
func TestForbiddenErrors(t *testing.T) {
	tests := []struct {
		name     string
		err      *APIError
		wantCode string
	}{
		{
			name:     "FORBIDDEN_ROLE",
			err:      ErrForbiddenRole,
			wantCode: "FORBIDDEN_ROLE",
		},
		{
			name:     "FORBIDDEN_RESOURCE",
			err:      ErrForbiddenResource,
			wantCode: "FORBIDDEN_RESOURCE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Code != tt.wantCode {
				t.Errorf("Code = %v, want %v", tt.err.Code, tt.wantCode)
			}
			if tt.err.StatusCode != http.StatusForbidden {
				t.Errorf("StatusCode = %v, want %v", tt.err.StatusCode, http.StatusForbidden)
			}
		})
	}
}

// TestNotFoundErrors はリソース不在エラーの定義をテスト（404 Not Found）
func TestNotFoundErrors(t *testing.T) {
	tests := []struct {
		name     string
		err      *APIError
		wantCode string
	}{
		{"RESERVATION_NOT_FOUND", ErrReservationNotFound, "RESERVATION_NOT_FOUND"},
		{"USER_NOT_FOUND", ErrUserNotFound, "USER_NOT_FOUND"},
		{"PLAN_NOT_FOUND", ErrPlanNotFound, "PLAN_NOT_FOUND"},
		{"OPTION_NOT_FOUND", ErrOptionNotFound, "OPTION_NOT_FOUND"},
		{"STUDIO_NOT_FOUND", ErrStudioNotFound, "STUDIO_NOT_FOUND"},
		{"BLOCKED_SLOT_NOT_FOUND", ErrBlockedSlotNotFound, "BLOCKED_SLOT_NOT_FOUND"},
		{"INQUIRY_NOT_FOUND", ErrInquiryNotFound, "INQUIRY_NOT_FOUND"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Code != tt.wantCode {
				t.Errorf("Code = %v, want %v", tt.err.Code, tt.wantCode)
			}
			if tt.err.StatusCode != http.StatusNotFound {
				t.Errorf("StatusCode = %v, want %v", tt.err.StatusCode, http.StatusNotFound)
			}
		})
	}
}

// TestConflictErrors は業務エラーの定義をテスト（409 Conflict）
func TestConflictErrors(t *testing.T) {
	tests := []struct {
		name     string
		err      *APIError
		wantCode string
	}{
		{"RESERVATION_CONFLICT", ErrReservationConflict, "RESERVATION_CONFLICT"},
		{"BLOCKED_SLOT_CONFLICT", ErrBlockedSlotConflict, "BLOCKED_SLOT_CONFLICT"},
		{"REGULAR_HOLIDAY", ErrRegularHoliday, "REGULAR_HOLIDAY"},
		{"EMAIL_ALREADY_EXISTS", ErrEmailAlreadyExists, "EMAIL_ALREADY_EXISTS"},
		{"INVALID_STATUS_TRANSITION", ErrInvalidStatusTransition, "INVALID_STATUS_TRANSITION"},
		{"SECOND_KEEP_NO_PRIMARY", ErrSecondKeepNoPrimary, "SECOND_KEEP_NO_PRIMARY"},
		{"PLAN_INACTIVE", ErrPlanInactive, "PLAN_INACTIVE"},
		{"OPTION_INACTIVE", ErrOptionInactive, "OPTION_INACTIVE"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Code != tt.wantCode {
				t.Errorf("Code = %v, want %v", tt.err.Code, tt.wantCode)
			}
			if tt.err.StatusCode != http.StatusConflict {
				t.Errorf("StatusCode = %v, want %v", tt.err.StatusCode, http.StatusConflict)
			}
		})
	}
}

// TestErrInternalServer はサーバーエラーの定義をテスト（500 Internal Server Error）
func TestErrInternalServer(t *testing.T) {
	if ErrInternalServer.Code != "INTERNAL_ERROR" {
		t.Errorf("Code = %v, want INTERNAL_ERROR", ErrInternalServer.Code)
	}

	if ErrInternalServer.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %v, want %v", ErrInternalServer.StatusCode, http.StatusInternalServerError)
	}
}

// TestAllErrorCodesUnique はすべてのエラーコードが重複していないことを確認
// これは重要なテスト: エラーコードが重複すると、クライアント側でエラーハンドリングができなくなる
func TestAllErrorCodesUnique(t *testing.T) {
	// すべてのエラーをリストアップ
	errors := []*APIError{
		// 400
		ErrValidation,
		// 401
		ErrAuthTokenMissing,
		ErrAuthTokenExpired,
		ErrAuthTokenInvalid,
		ErrAuthLoginFailed,
		// 403
		ErrForbiddenRole,
		ErrForbiddenResource,
		// 404
		ErrReservationNotFound,
		ErrUserNotFound,
		ErrPlanNotFound,
		ErrOptionNotFound,
		ErrStudioNotFound,
		ErrBlockedSlotNotFound,
		ErrInquiryNotFound,
		// 409
		ErrReservationConflict,
		ErrBlockedSlotConflict,
		ErrRegularHoliday,
		ErrEmailAlreadyExists,
		ErrInvalidStatusTransition,
		ErrSecondKeepNoPrimary,
		ErrPlanInactive,
		ErrOptionInactive,
		// 500
		ErrInternalServer,
	}

	// コードの重複チェック
	seen := make(map[string]bool)
	for _, err := range errors {
		if seen[err.Code] {
			t.Errorf("Duplicate error code: %s", err.Code)
		}
		seen[err.Code] = true
	}

	// すべてのエラーがテストされていることを確認
	expectedCount := 23 // 上記で定義したエラーの総数
	if len(errors) != expectedCount {
		t.Errorf("Expected %d errors, got %d. Please update the test if you added/removed errors.", expectedCount, len(errors))
	}
}
