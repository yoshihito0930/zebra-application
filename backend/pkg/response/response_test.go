package response

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// TestSuccess は Success() 関数をテスト
func TestSuccess(t *testing.T) {
	// テストケース: 成功レスポンスが正しく生成されるか

	// 1. テストデータ準備
	body := map[string]string{
		"reservation_id": "rsv_001",
		"status":         "confirmed",
	}

	// 2. Success関数を実行
	resp := Success(http.StatusOK, body)

	// 3. ステータスコードの確認
	if resp.StatusCode != http.StatusOK {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusOK)
	}

	// 4. Content-Typeヘッダーの確認
	if resp.Headers["Content-Type"] != "application/json" {
		t.Errorf("Content-Type = %v, want application/json", resp.Headers["Content-Type"])
	}

	// 5. レスポンスボディのJSON形式確認
	var result map[string]string
	if err := json.Unmarshal([]byte(resp.Body), &result); err != nil {
		t.Fatalf("Failed to unmarshal response body: %v", err)
	}

	// 6. レスポンス内容の確認
	if result["reservation_id"] != "rsv_001" {
		t.Errorf("reservation_id = %v, want rsv_001", result["reservation_id"])
	}
	if result["status"] != "confirmed" {
		t.Errorf("status = %v, want confirmed", result["status"])
	}
}

// TestError は Error() 関数をテスト
func TestError(t *testing.T) {
	// テストケース: エラーレスポンスが正しいフォーマットで返されるか

	// 1. エラーを準備
	apiErr := apierror.ErrReservationConflict

	// 2. Error関数を実行
	resp := Error(apiErr)

	// 3. ステータスコードの確認
	if resp.StatusCode != http.StatusConflict {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusConflict)
	}

	// 4. Content-Typeヘッダーの確認
	if resp.Headers["Content-Type"] != "application/json" {
		t.Errorf("Content-Type = %v, want application/json", resp.Headers["Content-Type"])
	}

	// 5. レスポンスボディの構造確認
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(resp.Body), &result); err != nil {
		t.Fatalf("Failed to unmarshal response body: %v", err)
	}

	// 6. "error" キーが存在するか確認（docs/api-design.mdのエラー形式に準拠）
	if _, ok := result["error"]; !ok {
		t.Error("Response should contain 'error' key")
	}

	// 7. エラーコードとメッセージの確認
	errorObj := result["error"].(map[string]interface{})
	if errorObj["code"] != apiErr.Code {
		t.Errorf("error.code = %v, want %v", errorObj["code"], apiErr.Code)
	}
	if errorObj["message"] != apiErr.Message {
		t.Errorf("error.message = %v, want %v", errorObj["message"], apiErr.Message)
	}
}

// TestError_WithDetails はバリデーションエラーの詳細が正しく含まれるかテスト
func TestError_WithDetails(t *testing.T) {
	// テストケース: バリデーションエラーの詳細がレスポンスに含まれるか

	// 1. 詳細付きエラーを準備
	details := []apierror.ValidationErrorDetail{
		{Field: "date", Message: "今日以降の日付を指定してください"},
		{Field: "start_time", Message: "営業時間内の時刻を指定してください"},
	}
	apiErr := apierror.ErrValidation.WithDetails(details)

	// 2. Error関数を実行
	resp := Error(apiErr)

	// 3. レスポンスをパース
	var result map[string]interface{}
	json.Unmarshal([]byte(resp.Body), &result)

	// 4. detailsが含まれているか確認
	errorObj := result["error"].(map[string]interface{})
	if _, ok := errorObj["details"]; !ok {
		t.Error("Error response should contain 'details' field")
	}

	// 5. details配列の内容を確認
	detailsArray := errorObj["details"].([]interface{})
	if len(detailsArray) != 2 {
		t.Errorf("Details length = %d, want 2", len(detailsArray))
	}

	firstDetail := detailsArray[0].(map[string]interface{})
	if firstDetail["field"] != "date" {
		t.Errorf("details[0].field = %v, want date", firstDetail["field"])
	}
}

// TestSuccessWithCORS は CORS ヘッダーが正しく追加されるかテスト
func TestSuccessWithCORS(t *testing.T) {
	// テストケース: CORSヘッダーが正しく設定されるか

	// 1. テストデータ準備
	body := map[string]string{"message": "success"}

	// 2. SuccessWithCORS関数を実行
	resp := SuccessWithCORS(http.StatusOK, body)

	// 3. CORSヘッダーの確認
	expectedHeaders := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}

	for key, expected := range expectedHeaders {
		if resp.Headers[key] != expected {
			t.Errorf("Header %s = %v, want %v", key, resp.Headers[key], expected)
		}
	}

	// 4. Content-Typeヘッダーも残っているか確認
	if resp.Headers["Content-Type"] != "application/json" {
		t.Errorf("Content-Type header should still be present")
	}
}

// TestErrorWithCORS はエラーレスポンスにCORSヘッダーが追加されるかテスト
func TestErrorWithCORS(t *testing.T) {
	// テストケース: エラーレスポンスにもCORSヘッダーが正しく設定されるか

	apiErr := apierror.ErrAuthTokenMissing
	resp := ErrorWithCORS(apiErr)

	// CORSヘッダーの確認
	if resp.Headers["Access-Control-Allow-Origin"] != "*" {
		t.Error("CORS headers should be present in error response")
	}

	// ステータスコードが正しいか確認
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusUnauthorized)
	}
}

// TestCreated は Created() 関数をテスト
func TestCreated(t *testing.T) {
	// テストケース: 201 Createdレスポンスが正しく生成されるか

	body := map[string]string{"id": "new_001"}
	resp := Created(body)

	// ステータスコードの確認
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusCreated)
	}

	// ボディが正しくJSON化されているか確認
	var result map[string]string
	json.Unmarshal([]byte(resp.Body), &result)
	if result["id"] != "new_001" {
		t.Errorf("id = %v, want new_001", result["id"])
	}
}

// TestCreatedWithCORS は CreatedWithCORS() 関数をテスト
func TestCreatedWithCORS(t *testing.T) {
	body := map[string]string{"id": "new_001"}
	resp := CreatedWithCORS(body)

	// ステータスコードとCORSヘッダーの確認
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusCreated)
	}
	if resp.Headers["Access-Control-Allow-Origin"] != "*" {
		t.Error("CORS headers should be present")
	}
}

// TestNoContent は NoContent() 関数をテスト
func TestNoContent(t *testing.T) {
	// テストケース: 204 No Contentレスポンスが正しく生成されるか

	resp := NoContent()

	// ステータスコードの確認
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusNoContent)
	}

	// ボディが空であることを確認
	if resp.Body != "" {
		t.Errorf("Body should be empty, got %v", resp.Body)
	}

	// Content-Typeヘッダーが設定されているか確認
	if resp.Headers["Content-Type"] != "application/json" {
		t.Error("Content-Type header should be set")
	}
}

// TestNoContentWithCORS は NoContentWithCORS() 関数をテスト
func TestNoContentWithCORS(t *testing.T) {
	resp := NoContentWithCORS()

	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusNoContent)
	}
	if resp.Headers["Access-Control-Allow-Origin"] != "*" {
		t.Error("CORS headers should be present")
	}
}

// TestOK は OK() 関数をテスト
func TestOK(t *testing.T) {
	// テストケース: OK()関数が200ステータスコードを返すか

	body := map[string]string{"result": "ok"}
	resp := OK(body)

	if resp.StatusCode != http.StatusOK {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusOK)
	}

	var result map[string]string
	json.Unmarshal([]byte(resp.Body), &result)
	if result["result"] != "ok" {
		t.Errorf("result = %v, want ok", result["result"])
	}
}

// TestOKWithCORS は OKWithCORS() 関数をテスト
func TestOKWithCORS(t *testing.T) {
	body := map[string]string{"result": "ok"}
	resp := OKWithCORS(body)

	if resp.StatusCode != http.StatusOK {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusOK)
	}
	if resp.Headers["Access-Control-Allow-Origin"] != "*" {
		t.Error("CORS headers should be present")
	}
}

// TestSuccess_InvalidJSON は JSON化できないデータを渡した場合のエラーハンドリングをテスト
func TestSuccess_InvalidJSON(t *testing.T) {
	// テストケース: JSON化できないデータを渡した場合、500エラーが返るか

	// チャネルはJSON化できない型の例
	invalidBody := make(chan int)

	resp := Success(http.StatusOK, invalidBody)

	// 500エラーが返ることを期待
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %v, want %v", resp.StatusCode, http.StatusInternalServerError)
	}

	// エラーレスポンスの形式を確認
	var result map[string]interface{}
	json.Unmarshal([]byte(resp.Body), &result)
	if _, ok := result["error"]; !ok {
		t.Error("Error response should contain 'error' key")
	}
}
