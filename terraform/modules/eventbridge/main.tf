# EventBridgeモジュール
# バッチ処理のスケジュールルールを定義

# ==================== EventBridge Rules ====================

# 仮予約期限通知バッチ（日次 午前4時実行）
resource "aws_cloudwatch_event_rule" "tentative_reminder" {
  name                = "${var.environment}-tentative-reminder-batch"
  description         = "仮予約期限通知バッチを日次で実行"
  schedule_expression = "cron(0 19 * * ? *)" # UTC 19:00 = JST 04:00

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# 第2キープ繰り上げバッチ（日次 午前5時実行）
resource "aws_cloudwatch_event_rule" "second_keep_promote" {
  name                = "${var.environment}-second-keep-promote-batch"
  description         = "第2キープ繰り上げバッチを日次で実行"
  schedule_expression = "cron(0 20 * * ? *)" # UTC 20:00 = JST 05:00

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== EventBridge Targets ====================

# 仮予約期限通知バッチのターゲット
resource "aws_cloudwatch_event_target" "tentative_reminder" {
  rule      = aws_cloudwatch_event_rule.tentative_reminder.name
  target_id = "TentativeReminderLambda"
  arn       = var.batch_tentative_reminder_lambda_arn
}

# 第2キープ繰り上げバッチのターゲット
resource "aws_cloudwatch_event_target" "second_keep_promote" {
  rule      = aws_cloudwatch_event_rule.second_keep_promote.name
  target_id = "SecondKeepPromoteLambda"
  arn       = var.batch_second_keep_promote_lambda_arn
}

# ==================== Lambda Permissions ====================

# EventBridgeから仮予約期限通知バッチLambdaを実行する権限
resource "aws_lambda_permission" "tentative_reminder" {
  statement_id  = "AllowEventBridgeInvoke-${var.environment}-tentative-reminder"
  action        = "lambda:InvokeFunction"
  function_name = var.batch_tentative_reminder_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.tentative_reminder.arn
}

# EventBridgeから第2キープ繰り上げバッチLambdaを実行する権限
resource "aws_lambda_permission" "second_keep_promote" {
  statement_id  = "AllowEventBridgeInvoke-${var.environment}-second-keep-promote"
  action        = "lambda:InvokeFunction"
  function_name = var.batch_second_keep_promote_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.second_keep_promote.arn
}
