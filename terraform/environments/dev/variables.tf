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

variable "ses_sender_email" {
  description = "SES送信元メールアドレス（ゲスト予約通知用）"
  type        = string
  default     = "noreply@studio-zebra.com"
}

variable "guest_reservation_url" {
  description = "ゲスト予約確認ページのベースURL"
  type        = string
  default     = "https://dev.studio-zebra.com/reservations/guest"
}

variable "cloudfront_price_class" {
  description = "CloudFront の価格クラス"
  type        = string
  default     = "PriceClass_200"
}
