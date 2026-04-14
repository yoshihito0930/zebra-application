# API Gatewayモジュールの出力定義

output "rest_api_id" {
  description = "REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "rest_api_execution_arn" {
  description = "REST API実行ARN"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "stage_name" {
  description = "ステージ名"
  value       = aws_api_gateway_stage.main.stage_name
}

output "invoke_url" {
  description = "API Gateway呼び出しURL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "deployment_id" {
  description = "デプロイメントID"
  value       = aws_api_gateway_deployment.main.id
}
