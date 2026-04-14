# DynamoDBモジュールの出力定義

output "reservations_table_name" {
  description = "予約テーブル名"
  value       = aws_dynamodb_table.reservations.name
}

output "reservations_table_arn" {
  description = "予約テーブルARN"
  value       = aws_dynamodb_table.reservations.arn
}

output "users_table_name" {
  description = "ユーザーテーブル名"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ユーザーテーブルARN"
  value       = aws_dynamodb_table.users.arn
}

output "plans_table_name" {
  description = "プランテーブル名"
  value       = aws_dynamodb_table.plans.name
}

output "plans_table_arn" {
  description = "プランテーブルARN"
  value       = aws_dynamodb_table.plans.arn
}

output "options_table_name" {
  description = "オプションテーブル名"
  value       = aws_dynamodb_table.options.name
}

output "options_table_arn" {
  description = "オプションテーブルARN"
  value       = aws_dynamodb_table.options.arn
}

output "blocked_slots_table_name" {
  description = "ブロック枠テーブル名"
  value       = aws_dynamodb_table.blocked_slots.name
}

output "blocked_slots_table_arn" {
  description = "ブロック枠テーブルARN"
  value       = aws_dynamodb_table.blocked_slots.arn
}

output "inquiries_table_name" {
  description = "問い合わせテーブル名"
  value       = aws_dynamodb_table.inquiries.name
}

output "inquiries_table_arn" {
  description = "問い合わせテーブルARN"
  value       = aws_dynamodb_table.inquiries.arn
}

output "notifications_table_name" {
  description = "通知テーブル名"
  value       = aws_dynamodb_table.notifications.name
}

output "notifications_table_arn" {
  description = "通知テーブルARN"
  value       = aws_dynamodb_table.notifications.arn
}

output "studios_table_name" {
  description = "スタジオテーブル名"
  value       = aws_dynamodb_table.studios.name
}

output "studios_table_arn" {
  description = "スタジオテーブルARN"
  value       = aws_dynamodb_table.studios.arn
}

# すべてのテーブル名をマップで出力
output "table_names" {
  description = "全テーブル名のマップ"
  value = {
    reservations  = aws_dynamodb_table.reservations.name
    users         = aws_dynamodb_table.users.name
    plans         = aws_dynamodb_table.plans.name
    options       = aws_dynamodb_table.options.name
    blocked_slots = aws_dynamodb_table.blocked_slots.name
    inquiries     = aws_dynamodb_table.inquiries.name
    notifications = aws_dynamodb_table.notifications.name
    studios       = aws_dynamodb_table.studios.name
  }
}

# すべてのテーブルARNをマップで出力
output "table_arns" {
  description = "全テーブルARNのマップ"
  value = {
    reservations  = aws_dynamodb_table.reservations.arn
    users         = aws_dynamodb_table.users.arn
    plans         = aws_dynamodb_table.plans.arn
    options       = aws_dynamodb_table.options.arn
    blocked_slots = aws_dynamodb_table.blocked_slots.arn
    inquiries     = aws_dynamodb_table.inquiries.arn
    notifications = aws_dynamodb_table.notifications.arn
    studios       = aws_dynamodb_table.studios.arn
  }
}
