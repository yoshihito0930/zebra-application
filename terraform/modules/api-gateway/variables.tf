# API Gatewayモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "lambda_functions" {
  description = "Lambda関数のマップ (name -> {invoke_arn})"
  type = object({
    auth_signup = object({
      invoke_arn = string
    })
    auth_login = object({
      invoke_arn = string
    })
    users_me_get = object({
      invoke_arn = string
    })
    calendar_get = object({
      invoke_arn = string
    })
    reservation_create = object({
      invoke_arn = string
    })
    reservation_list = object({
      invoke_arn = string
    })
    reservation_get = object({
      invoke_arn = string
    })
    reservation_approve = object({
      invoke_arn = string
    })
    reservation_reject = object({
      invoke_arn = string
    })
    reservation_promote = object({
      invoke_arn = string
    })
    reservation_cancel = object({
      invoke_arn = string
    })
    plans_list = object({
      invoke_arn = string
    })
    plan_create = object({
      invoke_arn = string
    })
    plan_get = object({
      invoke_arn = string
    })
    plan_update = object({
      invoke_arn = string
    })
    plan_delete = object({
      invoke_arn = string
    })
    options_list = object({
      invoke_arn = string
    })
    option_create = object({
      invoke_arn = string
    })
    option_get = object({
      invoke_arn = string
    })
    option_update = object({
      invoke_arn = string
    })
    option_delete = object({
      invoke_arn = string
    })
    blocked_slots_list = object({
      invoke_arn = string
    })
    blocked_slot_create = object({
      invoke_arn = string
    })
    blocked_slot_delete = object({
      invoke_arn = string
    })
    inquiry_create = object({
      invoke_arn = string
    })
    inquiry_list = object({
      invoke_arn = string
    })
    inquiry_get = object({
      invoke_arn = string
    })
    inquiry_reply = object({
      invoke_arn = string
    })
    inquiry_close = object({
      invoke_arn = string
    })
    studio_get = object({
      invoke_arn = string
    })
    studio_update = object({
      invoke_arn = string
    })
    # ゲスト予約（2026-04-16追加）
    reservation_guest_get = object({
      invoke_arn = string
    })
    reservation_guest_cancel = object({
      invoke_arn = string
    })
    reservation_guest_promote = object({
      invoke_arn = string
    })
  })
}

variable "cloudwatch_log_group_arn" {
  description = "CloudWatch Log Group ARN (API Gatewayアクセスログ用)"
  type        = string
}

variable "api_gateway_cloudwatch_role_arn" {
  description = "API GatewayがCloudWatch Logsに書き込むためのIAMロールARN"
  type        = string
}
