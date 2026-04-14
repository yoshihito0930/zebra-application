# EventBridgeモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "batch_tentative_reminder_lambda_arn" {
  description = "仮予約期限通知バッチLambda関数ARN"
  type        = string
}

variable "batch_tentative_reminder_function_name" {
  description = "仮予約期限通知バッチLambda関数名"
  type        = string
}

variable "batch_second_keep_promote_lambda_arn" {
  description = "第2キープ繰り上げバッチLambda関数ARN"
  type        = string
}

variable "batch_second_keep_promote_function_name" {
  description = "第2キープ繰り上げバッチLambda関数名"
  type        = string
}
