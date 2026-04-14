# Cognitoモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}
