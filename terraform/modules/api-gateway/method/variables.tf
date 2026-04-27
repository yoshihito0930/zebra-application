# メソッドサブモジュールの変数定義

variable "rest_api_id" {
  description = "REST API ID"
  type        = string
}

variable "rest_api_exec_arn" {
  description = "REST API Execution ARN"
  type        = string
}

variable "resource_id" {
  description = "リソースID"
  type        = string
}

variable "http_method" {
  description = "HTTPメソッド (GET, POST, PATCH, DELETE)"
  type        = string
}

variable "invoke_arn" {
  description = "Lambda関数の呼び出しARN"
  type        = string
}

variable "authorizer_id" {
  description = "Cognito AuthorizerのID (認証不要の場合はnull)"
  type        = string
  default     = null
}

variable "environment" {
  description = "環境名"
  type        = string
}
