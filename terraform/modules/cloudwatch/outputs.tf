# CloudWatchモジュールの出力定義

output "api_gateway_log_group_arn" {
  description = "API GatewayロググループARN"
  value       = aws_cloudwatch_log_group.api_gateway.arn
}

output "api_gateway_cloudwatch_role_arn" {
  description = "API Gateway CloudWatchロールARN"
  value       = aws_iam_role.api_gateway_cloudwatch.arn
}

output "sns_topic_arn" {
  description = "アラーム通知SNSトピックARN"
  value       = aws_sns_topic.alarms.arn
}

output "lambda_log_group_arns" {
  description = "Lambda関数ロググループARNのマップ"
  value = {
    for name, log_group in aws_cloudwatch_log_group.lambda : name => log_group.arn
  }
}
