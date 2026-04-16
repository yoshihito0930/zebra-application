# DynamoDBテーブルモジュール
# Zebra ApplicationのすべてのDynamoDBテーブルとGSIを定義

# 予約テーブル
resource "aws_dynamodb_table" "reservations" {
  name           = "${var.environment}-reservations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "date_reservation_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "date_reservation_id"
    type = "S"
  }

  # GSI1: studio_id#status + date_reservation_id (ステータス別予約一覧)
  attribute {
    name = "studio_id_status"
    type = "S"
  }

  # GSI2: user_id + date_reservation_id (ユーザー別予約一覧)
  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI3: reservation_id (ID検索)
  attribute {
    name = "reservation_id"
    type = "S"
  }

  # GSI4: linked_reservation_id + date_reservation_id (第2キープ検索)
  attribute {
    name = "linked_reservation_id"
    type = "S"
  }

  # GSI5: guest_token (ゲストトークン検索、2026-04-16追加)
  attribute {
    name = "guest_token"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "studio_id_status"
    range_key       = "date_reservation_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI2"
    hash_key        = "user_id"
    range_key       = "date_reservation_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI3"
    hash_key        = "reservation_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI4"
    hash_key        = "linked_reservation_id"
    range_key       = "date_reservation_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI5"
    hash_key        = "guest_token"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ユーザーテーブル
resource "aws_dynamodb_table" "users" {
  name           = "${var.environment}-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI1: email (メールアドレス検索)
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# 料金プランテーブル
resource "aws_dynamodb_table" "plans" {
  name           = "${var.environment}-plans"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "plan_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "plan_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# オプションテーブル
resource "aws_dynamodb_table" "options" {
  name           = "${var.environment}-options"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "option_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "option_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ブロック枠テーブル
resource "aws_dynamodb_table" "blocked_slots" {
  name           = "${var.environment}-blocked-slots"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "date_blocked_slot_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "date_blocked_slot_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# 問い合わせテーブル
resource "aws_dynamodb_table" "inquiries" {
  name           = "${var.environment}-inquiries"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "inquiry_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "inquiry_id"
    type = "S"
  }

  # GSI1: studio_id#status + created_at (ステータス別問い合わせ一覧)
  attribute {
    name = "studio_id_status"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI2: user_id + created_at (ユーザー別問い合わせ一覧)
  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "studio_id_status"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI2"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# 通知テーブル
resource "aws_dynamodb_table" "notifications" {
  name           = "${var.environment}-notifications"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"
  range_key      = "scheduled_at_notification_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  attribute {
    name = "scheduled_at_notification_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# スタジオテーブル
resource "aws_dynamodb_table" "studios" {
  name           = "${var.environment}-studios"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "studio_id"

  attribute {
    name = "studio_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}
