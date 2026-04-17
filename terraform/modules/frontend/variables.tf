# フロントエンドモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "cloudfront_price_class" {
  description = "CloudFront の価格クラス"
  type        = string
  default     = "PriceClass_200" # アジア・北米・ヨーロッパ
}
