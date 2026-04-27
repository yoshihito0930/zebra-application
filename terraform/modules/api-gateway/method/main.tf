# API Gatewayメソッドサブモジュール
# 各エンドポイントのメソッド、統合、レスポンスを定義

# メソッド
resource "aws_api_gateway_method" "main" {
  rest_api_id   = var.rest_api_id
  resource_id   = var.resource_id
  http_method   = var.http_method
  authorization = var.authorizer_id != null ? "COGNITO_USER_POOLS" : "NONE"
  authorizer_id = var.authorizer_id

  request_parameters = {
    "method.request.header.Content-Type" = false
  }
}

# Lambda統合
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.main.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.invoke_arn
}

# Lambda実行権限
resource "aws_lambda_permission" "api_gateway" {
  # Extract function name from invoke_arn
  # invoke_arn format: arn:aws:apigateway:region:lambda:path/2015-03-31/functions/arn:aws:lambda:region:account:function:FUNCTION_NAME/invocations
  statement_id  = "AllowAPIGatewayInvoke-${regex("function:([^/]+)", var.invoke_arn)[0]}"
  action        = "lambda:InvokeFunction"
  function_name = regex("function:([^/]+)", var.invoke_arn)[0]
  principal     = "apigateway.amazonaws.com"
  # execute-api ARN format: arn:aws:execute-api:region:account-id:api-id/*/*
  source_arn    = "${var.rest_api_exec_arn}/*/*"
}

# メソッドレスポンス
resource "aws_api_gateway_method_response" "main" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.main.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}
