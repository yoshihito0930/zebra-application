# EventBridgeモジュールの出力定義

output "tentative_reminder_rule_arn" {
  description = "仮予約期限通知バッチルールARN"
  value       = aws_cloudwatch_event_rule.tentative_reminder.arn
}

output "second_keep_promote_rule_arn" {
  description = "第2キープ繰り上げバッチルールARN"
  value       = aws_cloudwatch_event_rule.second_keep_promote.arn
}
