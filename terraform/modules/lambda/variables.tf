# Lambdaモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "lambda_artifacts_dir" {
  description = "Lambda関数のzipファイルが格納されているディレクトリ"
  type        = string
}

variable "dynamodb_table_arns" {
  description = "DynamoDBテーブルのARNリスト"
  type        = list(string)
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  type        = string
}

variable "cognito_user_pool_client_secret" {
  description = "Cognito User Pool Client Secret"
  type        = string
  sensitive   = true
}

variable "ses_sender_email" {
  description = "SES送信元メールアドレス（ゲスト予約通知用）"
  type        = string
  default     = "noreply@studio-zebra.com"
}

variable "guest_reservation_url" {
  description = "ゲスト予約確認ページのベースURL"
  type        = string
  default     = "https://studio-zebra.com/reservations/guest"
}

variable "dynamodb_table_names" {
  description = "DynamoDBテーブル名のマップ"
  type        = map(string)
}
