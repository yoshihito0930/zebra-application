# SESモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
}

variable "sender_email" {
  description = "SES送信元メールアドレス"
  type        = string
}

variable "notification_email" {
  description = "SESバウンス・苦情通知を受け取るメールアドレス（オプショナル）"
  type        = string
  default     = ""
}
