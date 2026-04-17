# SESモジュールの出力

output "email_identity_arn" {
  description = "SES Email IdentityのARN"
  value       = aws_ses_email_identity.sender.arn
}

output "configuration_set_name" {
  description = "SES Configuration Set名"
  value       = aws_ses_configuration_set.main.name
}

output "sns_topic_arn" {
  description = "SES通知用SNSトピックARN"
  value       = aws_sns_topic.ses_notifications.arn
}
