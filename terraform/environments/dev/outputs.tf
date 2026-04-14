# Dev環境の出力定義

output "api_gateway_invoke_url" {
  description = "API Gateway呼び出しURL"
  value       = module.api_gateway.invoke_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool ドメイン"
  value       = module.cognito.user_pool_domain
}

output "dynamodb_table_names" {
  description = "DynamoDBテーブル名一覧"
  value       = module.dynamodb.table_names
}

output "sns_alarm_topic_arn" {
  description = "SNSアラームトピックARN"
  value       = module.cloudwatch.sns_topic_arn
}

output "lambda_functions" {
  description = "Lambda関数名一覧"
  value       = module.lambda.all_lambda_functions
}
