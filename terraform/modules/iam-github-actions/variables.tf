# GitHub Actions IAMロールモジュールの変数定義

variable "environment" {
  description = "環境名 (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment は 'dev' または 'prod' である必要があります"
  }
}

variable "github_repository" {
  description = "GitHubリポジトリ名（例: owner/repo-name）"
  type        = string
}

variable "frontend_s3_bucket_arn" {
  description = "フロントエンド用S3バケットARN"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront Distribution ARN"
  type        = string
}
