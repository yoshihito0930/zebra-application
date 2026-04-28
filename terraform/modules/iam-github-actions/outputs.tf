# GitHub Actions IAMロールモジュールの出力

output "role_arn" {
  description = "GitHub Actions用IAMロールARN"
  value       = aws_iam_role.github_actions.arn
}

output "role_name" {
  description = "GitHub Actions用IAMロール名"
  value       = aws_iam_role.github_actions.name
}

output "oidc_provider_arn" {
  description = "GitHub OIDC Provider ARN"
  value       = aws_iam_openid_connect_provider.github_actions.arn
}
