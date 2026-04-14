# CloudWatchモジュール
# ログ、アラーム、SNSトピックを定義

# ==================== CloudWatch Logs ====================

# API Gatewayアクセスログ用ロググループ
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${var.environment}-zebra-api"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# Lambda関数用ロググループ（各関数ごと）
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = var.lambda_function_names

  name              = "/aws/lambda/${each.value}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# API GatewayがCloudWatch Logsに書き込むためのIAMロール
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.environment}-api-gateway-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
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

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# ==================== SNS トピック ====================

# アラーム通知用SNSトピック
resource "aws_sns_topic" "alarms" {
  name = "${var.environment}-zebra-alarms"

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# SNSトピックのサブスクリプション（メール通知）
resource "aws_sns_topic_subscription" "alarm_email" {
  count = var.alarm_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ==================== CloudWatch Alarms ====================

# API Gateway 4xxエラー率アラーム
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx" {
  alarm_name          = "${var.environment}-api-gateway-4xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "API Gatewayの4xxエラー数が閾値を超えました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiName = "${var.environment}-zebra-api"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# API Gateway 5xxエラー率アラーム
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "${var.environment}-api-gateway-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "API Gatewayの5xxエラー数が閾値を超えました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiName = "${var.environment}-zebra-api"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# API Gatewayレイテンシーアラーム
resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  alarm_name          = "${var.environment}-api-gateway-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000" # 5秒
  alarm_description   = "API Gatewayのレイテンシーが閾値を超えました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ApiName = "${var.environment}-zebra-api"
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# Lambdaエラー率アラーム（主要な関数のみ）
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = toset([
    var.lambda_function_names.reservation_create,
    var.lambda_function_names.reservation_approve,
    var.lambda_function_names.auth_signup,
    var.lambda_function_names.auth_login,
  ])

  alarm_name          = "${var.environment}-lambda-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Lambda関数 ${each.key} のエラー数が閾値を超えました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = each.key
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# Lambda実行時間アラーム（主要な関数のみ）
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = toset([
    var.lambda_function_names.reservation_create,
    var.lambda_function_names.batch_tentative_reminder,
    var.lambda_function_names.batch_second_keep_promote,
  ])

  alarm_name          = "${var.environment}-lambda-${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "prod" ? "10000" : "20000" # ms
  alarm_description   = "Lambda関数 ${each.key} の実行時間が閾値を超えました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = each.key
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# DynamoDBスロットリングアラーム（主要テーブル）
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  for_each = toset([
    var.dynamodb_table_names.reservations,
    var.dynamodb_table_names.users,
  ])

  alarm_name          = "${var.environment}-dynamodb-${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "DynamoDBテーブル ${each.key} のスロットリングが発生しました"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = each.key
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}
