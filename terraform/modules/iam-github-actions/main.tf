# GitHub Actions用のIAMロール
# OIDC認証を使用してAWSにアクセス

# GitHub OIDC Provider
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  # GitHubのOIDC Providerのサムプリント（固定値）
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GitHub ActionsからAssumeできるIAMロール
resource "aws_iam_role" "github_actions" {
  name = "${var.environment}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # GitHubリポジトリを制限（セキュリティ対策）
            # 例: "repo:owner/repo-name:*"
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# フロントエンドデプロイ用のポリシー
resource "aws_iam_role_policy" "frontend_deploy" {
  name = "${var.environment}-frontend-deploy-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3バケットへの書き込み権限
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.frontend_s3_bucket_arn,
          "${var.frontend_s3_bucket_arn}/*"
        ]
      },
      # CloudFrontキャッシュ無効化権限
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = var.cloudfront_distribution_arn
      },
      # Terraform state読み取り権限（output取得用）
      # 注意: terraform outputを使わずにGitHub SecretsでTerraform outputを管理する場合は不要
      # {
      #   Effect = "Allow"
      #   Action = [
      #     "s3:GetObject",
      #     "s3:ListBucket"
      #   ]
      #   Resource = [
      #     "arn:aws:s3:::zebra-terraform-state-${var.environment}",
      #     "arn:aws:s3:::zebra-terraform-state-${var.environment}/*"
      #   ]
      # }
    ]
  })
}
