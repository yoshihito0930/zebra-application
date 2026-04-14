# Dev環境の変数定義

variable "environment" {
  description = "環境名"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "lambda_artifacts_dir" {
  description = "Lambda関数のzipファイルが格納されているディレクトリ"
  type        = string
  default     = "../../../build/lambda"
}

variable "alarm_email" {
  description = "アラーム通知先メールアドレス"
  type        = string
  default     = ""
}
