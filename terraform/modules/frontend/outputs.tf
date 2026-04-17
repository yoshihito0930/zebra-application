# フロントエンドモジュールの出力

output "s3_bucket_name" {
  description = "フロントエンド用S3バケット名"
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "フロントエンド用S3バケットARN"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront Distribution ドメイン名"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "CloudFront Distribution URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
