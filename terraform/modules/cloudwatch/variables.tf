# CloudWatchモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "lambda_function_names" {
  description = "Lambda関数名のマップ"
  type = object({
    auth_signup               = string
    auth_login                = string
    reservation_create        = string
    reservation_approve       = string
    batch_tentative_reminder  = string
    batch_second_keep_promote = string
  })
}

variable "dynamodb_table_names" {
  description = "DynamoDBテーブル名のマップ"
  type = object({
    reservations = string
    users        = string
  })
}

variable "alarm_email" {
  description = "アラーム通知先メールアドレス"
  type        = string
  default     = ""
}
