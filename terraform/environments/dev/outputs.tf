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

output "ses_email_identity" {
  description = "SES送信元メールアドレス"
  value       = var.ses_sender_email
}

output "ses_configuration_set_name" {
  description = "SES Configuration Set名"
  value       = module.ses.configuration_set_name
}

output "frontend_s3_bucket" {
  description = "フロントエンド用S3バケット名"
  value       = module.frontend.s3_bucket_name
}

output "frontend_cloudfront_url" {
  description = "フロントエンドアクセスURL"
  value       = module.frontend.cloudfront_url
}

output "frontend_cloudfront_domain" {
  description = "CloudFrontドメイン名"
  value       = module.frontend.cloudfront_domain_name
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront Distribution ID（キャッシュ無効化用）"
  value       = module.frontend.cloudfront_distribution_id
}

output "github_actions_role_arn" {
  description = "GitHub Actions用IAMロールARN"
  value       = module.iam_github_actions.role_arn
}

output "github_actions_role_name" {
  description = "GitHub Actions用IAMロール名"
  value       = module.iam_github_actions.role_name
}
