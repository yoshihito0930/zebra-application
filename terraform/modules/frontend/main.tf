# フロントエンド配信用のS3 + CloudFront設定

# S3バケット（フロントエンドファイル用）
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.environment}-zebra-frontend"

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# S3バケットのパブリックアクセスブロック設定
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront用のOAI（Origin Access Identity）
resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "${var.environment} Zebra Frontend OAI"
}

# S3バケットポリシー（CloudFrontからのアクセスのみ許可）
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} Zebra Frontend Distribution"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # SPA用のカスタムエラーレスポンス（404を index.htmlにリダイレクト）
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # カスタムドメインを使用しない場合（デフォルト）
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # ========================================
  # カスタムドメイン設定（将来用）
  # ========================================
  # カスタムドメインを使用する場合は以下をコメント解除し、上記のviewer_certificateをコメントアウトしてください
  #
  # 前提条件:
  # 1. Route53でホストゾーンを作成済み
  # 2. ACM証明書を us-east-1 リージョンで発行済み（CloudFront用）
  # 3. variables.tfに以下の変数を追加:
  #    - var.custom_domain (例: "app.studio-zebra.com")
  #    - var.acm_certificate_arn (ACM証明書ARN)
  #
  # aliases = [var.custom_domain]
  #
  # viewer_certificate {
  #   acm_certificate_arn      = var.acm_certificate_arn
  #   ssl_support_method       = "sni-only"
  #   minimum_protocol_version = "TLSv1.2_2021"
  # }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ========================================
# Route53レコード設定（カスタムドメイン用）
# ========================================
# カスタムドメインを使用する場合は以下をコメント解除してください
#
# data "aws_route53_zone" "main" {
#   name         = var.route53_zone_name  # 例: "studio-zebra.com"
#   private_zone = false
# }
#
# resource "aws_route53_record" "frontend" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = var.custom_domain  # 例: "app.studio-zebra.com"
#   type    = "A"
#
#   alias {
#     name                   = aws_cloudfront_distribution.frontend.domain_name
#     zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
#     evaluate_target_health = false
#   }
# }
