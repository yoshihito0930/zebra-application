package response

import (
	"encoding/json"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// Success は成功レスポンスを返す
// statusCode: HTTPステータスコード（200, 201など）
// body: レスポンスボディ（構造体やmapなど、JSON化可能な任意の型）
func Success(statusCode int, body interface{}) events.APIGatewayProxyResponse {
	// bodyをJSON形式にマーシャル（変換）
	jsonBody, err := json.Marshal(body)
	if err != nil {
		// JSON化に失敗した場合は500エラーを返す
		// 通常、この分岐に入ることはない（構造体が正しければJSON化できる）
		return Error(apierror.ErrInternalServer)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Body:       string(jsonBody),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

// Error はエラーレスポンスを返す
// err: APIErrorインスタンス
func Error(err *apierror.APIError) events.APIGatewayProxyResponse {
	// エラーレスポンスの形式: { "error": { "code": "...", "message": "...", "details": [...] } }
	// docs/api-design.md の「エラー定義」セクションに準拠
	errorResponse := map[string]interface{}{
		"error": err,
	}

	jsonBody, _ := json.Marshal(errorResponse)

	return events.APIGatewayProxyResponse{
		StatusCode: err.StatusCode,
		Body:       string(jsonBody),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

// SuccessWithCORS はCORSヘッダー付きの成功レスポンスを返す
// フロントエンドが別ドメインから呼び出す場合に使用
func SuccessWithCORS(statusCode int, body interface{}) events.APIGatewayProxyResponse {
	resp := Success(statusCode, body)
	addCORSHeaders(&resp)
	return resp
}

// ErrorWithCORS はCORSヘッダー付きのエラーレスポンスを返す
func ErrorWithCORS(err *apierror.APIError) events.APIGatewayProxyResponse {
	resp := Error(err)
	addCORSHeaders(&resp)
	return resp
}

// addCORSHeaders はレスポンスにCORSヘッダーを追加する内部関数
func addCORSHeaders(resp *events.APIGatewayProxyResponse) {
	resp.Headers["Access-Control-Allow-Origin"] = "*"
	resp.Headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
	resp.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
}

// Created は201 Createdレスポンスを返す
// POST リクエストでリソースが正常に作成された場合に使用
func Created(body interface{}) events.APIGatewayProxyResponse {
	return Success(http.StatusCreated, body)
}

// CreatedWithCORS はCORSヘッダー付きの201 Createdレスポンスを返す
func CreatedWithCORS(body interface{}) events.APIGatewayProxyResponse {
	return SuccessWithCORS(http.StatusCreated, body)
}

// NoContent は204 No Contentレスポンスを返す
// DELETE リクエストが正常に処理され、レスポンスボディが不要な場合に使用
func NoContent() events.APIGatewayProxyResponse {
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusNoContent,
		Body:       "",
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

// NoContentWithCORS はCORSヘッダー付きの204 No Contentレスポンスを返す
func NoContentWithCORS() events.APIGatewayProxyResponse {
	resp := NoContent()
	addCORSHeaders(&resp)
	return resp
}

// OK は200 OKレスポンスを返す（Successのエイリアス）
// 可読性を高めるためのヘルパー関数
func OK(body interface{}) events.APIGatewayProxyResponse {
	return Success(http.StatusOK, body)
}

// OKWithCORS はCORSヘッダー付きの200 OKレスポンスを返す
func OKWithCORS(body interface{}) events.APIGatewayProxyResponse {
	return SuccessWithCORS(http.StatusOK, body)
}
