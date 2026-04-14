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
  statement_id  = "AllowAPIGatewayInvoke-${var.environment}-${replace(var.invoke_arn, "/[^a-zA-Z0-9]/", "-")}"
  action        = "lambda:InvokeFunction"
  function_name = split(":", var.invoke_arn)[6]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_id}/*/*"
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
