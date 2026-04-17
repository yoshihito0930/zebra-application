# SESモジュール
# Amazon SES（Simple Email Service）の設定

# SES Email Identity（メールアドレス検証）
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# SES Configuration Set（送信統計・イベント追跡用）
resource "aws_ses_configuration_set" "main" {
  name = "${var.environment}-zebra-ses-config"

  # 送信イベントのCloudWatch Logs送信設定
  delivery_options {
    tls_policy = "Require"
  }
}

# CloudWatch Logs送信先（送信イベント）
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "${var.environment}-cloudwatch-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["send", "reject", "bounce", "complaint", "delivery", "open", "click"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:configuration-set"
    value_source   = "messageTag"
  }
}

# SNSトピック（バウンス・苦情通知用）
resource "aws_sns_topic" "ses_notifications" {
  name = "${var.environment}-ses-notifications"

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# SNSトピックサブスクリプション（メール通知）
resource "aws_sns_topic_subscription" "ses_notifications_email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.ses_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# SESアイデンティティ通知設定（バウンス）
resource "aws_ses_identity_notification_topic" "bounce" {
  topic_arn                = aws_sns_topic.ses_notifications.arn
  notification_type        = "Bounce"
  identity                 = aws_ses_email_identity.sender.email
  include_original_headers = true
}

# SESアイデンティティ通知設定（苦情）
resource "aws_ses_identity_notification_topic" "complaint" {
  topic_arn                = aws_sns_topic.ses_notifications.arn
  notification_type        = "Complaint"
  identity                 = aws_ses_email_identity.sender.email
  include_original_headers = true
}
