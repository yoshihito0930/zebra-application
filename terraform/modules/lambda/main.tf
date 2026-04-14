# Lambdaモジュール
# すべてのLambda関数とIAMロールを定義

# Lambda実行ロール
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.environment}-zebra-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
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

# CloudWatch Logsへの書き込み権限
resource "aws_iam_role_policy" "lambda_logging" {
  name = "${var.environment}-lambda-logging-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# DynamoDBへのアクセス権限
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.environment}-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          for arn in var.dynamodb_table_arns : arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query"
        ]
        Resource = [
          for arn in var.dynamodb_table_arns : "${arn}/index/*"
        ]
      }
    ]
  })
}

# Cognitoへのアクセス権限
resource "aws_iam_role_policy" "lambda_cognito" {
  name = "${var.environment}-lambda-cognito-policy"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser"
        ]
        Resource = var.cognito_user_pool_arn
      }
    ]
  })
}

# Lambda関数の共通設定
locals {
  lambda_runtime     = "provided.al2023"
  lambda_timeout     = 30
  lambda_memory_size = 256

  # 環境変数（全Lambda関数共通）
  common_env_vars = {
    ENVIRONMENT = var.environment
    LOG_LEVEL   = var.environment == "prod" ? "INFO" : "DEBUG"
  }
}

# ==================== 認証関連Lambda ====================

# POST /auth/signup
resource "aws_lambda_function" "auth_signup" {
  filename         = "${var.lambda_artifacts_dir}/auth-signup.zip"
  function_name    = "${var.environment}-auth-signup"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/auth-signup.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = merge(local.common_env_vars, {
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    })
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# POST /auth/login
resource "aws_lambda_function" "auth_login" {
  filename         = "${var.lambda_artifacts_dir}/auth-login.zip"
  function_name    = "${var.environment}-auth-login"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/auth-login.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = merge(local.common_env_vars, {
      COGNITO_USER_POOL_ID     = var.cognito_user_pool_id
      COGNITO_USER_POOL_CLIENT = var.cognito_user_pool_client_id
    })
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /users/me
resource "aws_lambda_function" "users_me_get" {
  filename         = "${var.lambda_artifacts_dir}/users-me-get.zip"
  function_name    = "${var.environment}-users-me-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/users-me-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== カレンダー関連Lambda ====================

# GET /studios/{id}/calendar
resource "aws_lambda_function" "calendar_get" {
  filename         = "${var.lambda_artifacts_dir}/calendar-get.zip"
  function_name    = "${var.environment}-calendar-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/calendar-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== 予約関連Lambda ====================

# POST /reservations
resource "aws_lambda_function" "reservation_create" {
  filename         = "${var.lambda_artifacts_dir}/reservation-create.zip"
  function_name    = "${var.environment}-reservation-create"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-create.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /reservations
resource "aws_lambda_function" "reservation_list" {
  filename         = "${var.lambda_artifacts_dir}/reservation-list.zip"
  function_name    = "${var.environment}-reservation-list"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-list.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /reservations/{id}
resource "aws_lambda_function" "reservation_get" {
  filename         = "${var.lambda_artifacts_dir}/reservation-get.zip"
  function_name    = "${var.environment}-reservation-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /reservations/{id}/approve
resource "aws_lambda_function" "reservation_approve" {
  filename         = "${var.lambda_artifacts_dir}/reservation-approve.zip"
  function_name    = "${var.environment}-reservation-approve"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-approve.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /reservations/{id}/reject
resource "aws_lambda_function" "reservation_reject" {
  filename         = "${var.lambda_artifacts_dir}/reservation-reject.zip"
  function_name    = "${var.environment}-reservation-reject"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-reject.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /reservations/{id}/promote
resource "aws_lambda_function" "reservation_promote" {
  filename         = "${var.lambda_artifacts_dir}/reservation-promote.zip"
  function_name    = "${var.environment}-reservation-promote"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-promote.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /reservations/{id}/cancel
resource "aws_lambda_function" "reservation_cancel" {
  filename         = "${var.lambda_artifacts_dir}/reservation-cancel.zip"
  function_name    = "${var.environment}-reservation-cancel"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/reservation-cancel.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== プラン関連Lambda ====================

# GET /studios/{id}/plans
resource "aws_lambda_function" "plans_list" {
  filename         = "${var.lambda_artifacts_dir}/plans-list.zip"
  function_name    = "${var.environment}-plans-list"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/plans-list.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# POST /plans
resource "aws_lambda_function" "plan_create" {
  filename         = "${var.lambda_artifacts_dir}/plan-create.zip"
  function_name    = "${var.environment}-plan-create"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/plan-create.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /plans/{id}
resource "aws_lambda_function" "plan_get" {
  filename         = "${var.lambda_artifacts_dir}/plan-get.zip"
  function_name    = "${var.environment}-plan-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/plan-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /plans/{id}
resource "aws_lambda_function" "plan_update" {
  filename         = "${var.lambda_artifacts_dir}/plan-update.zip"
  function_name    = "${var.environment}-plan-update"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/plan-update.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# DELETE /plans/{id}
resource "aws_lambda_function" "plan_delete" {
  filename         = "${var.lambda_artifacts_dir}/plan-delete.zip"
  function_name    = "${var.environment}-plan-delete"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/plan-delete.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== オプション関連Lambda ====================

# GET /studios/{id}/options
resource "aws_lambda_function" "options_list" {
  filename         = "${var.lambda_artifacts_dir}/options-list.zip"
  function_name    = "${var.environment}-options-list"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/options-list.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# POST /options
resource "aws_lambda_function" "option_create" {
  filename         = "${var.lambda_artifacts_dir}/option-create.zip"
  function_name    = "${var.environment}-option-create"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/option-create.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /options/{id}
resource "aws_lambda_function" "option_get" {
  filename         = "${var.lambda_artifacts_dir}/option-get.zip"
  function_name    = "${var.environment}-option-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/option-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /options/{id}
resource "aws_lambda_function" "option_update" {
  filename         = "${var.lambda_artifacts_dir}/option-update.zip"
  function_name    = "${var.environment}-option-update"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/option-update.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# DELETE /options/{id}
resource "aws_lambda_function" "option_delete" {
  filename         = "${var.lambda_artifacts_dir}/option-delete.zip"
  function_name    = "${var.environment}-option-delete"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/option-delete.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== ブロック枠関連Lambda ====================

# GET /blocked-slots
resource "aws_lambda_function" "blocked_slots_list" {
  filename         = "${var.lambda_artifacts_dir}/blocked-slots-list.zip"
  function_name    = "${var.environment}-blocked-slots-list"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/blocked-slots-list.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# POST /blocked-slots
resource "aws_lambda_function" "blocked_slot_create" {
  filename         = "${var.lambda_artifacts_dir}/blocked-slots-create.zip"
  function_name    = "${var.environment}-blocked-slot-create"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/blocked-slots-create.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# DELETE /blocked-slots/{id}
resource "aws_lambda_function" "blocked_slot_delete" {
  filename         = "${var.lambda_artifacts_dir}/blocked-slots-delete.zip"
  function_name    = "${var.environment}-blocked-slot-delete"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/blocked-slots-delete.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== 問い合わせ関連Lambda ====================

# POST /inquiries
resource "aws_lambda_function" "inquiry_create" {
  filename         = "${var.lambda_artifacts_dir}/inquiry-create.zip"
  function_name    = "${var.environment}-inquiry-create"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/inquiry-create.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /inquiries
resource "aws_lambda_function" "inquiry_list" {
  filename         = "${var.lambda_artifacts_dir}/inquiry-list.zip"
  function_name    = "${var.environment}-inquiry-list"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/inquiry-list.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# GET /inquiries/{id}
resource "aws_lambda_function" "inquiry_get" {
  filename         = "${var.lambda_artifacts_dir}/inquiry-get.zip"
  function_name    = "${var.environment}-inquiry-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/inquiry-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /inquiries/{id}/reply
resource "aws_lambda_function" "inquiry_reply" {
  filename         = "${var.lambda_artifacts_dir}/inquiry-reply.zip"
  function_name    = "${var.environment}-inquiry-reply"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/inquiry-reply.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /inquiries/{id}/close
resource "aws_lambda_function" "inquiry_close" {
  filename         = "${var.lambda_artifacts_dir}/inquiry-close.zip"
  function_name    = "${var.environment}-inquiry-close"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/inquiry-close.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== スタジオ関連Lambda ====================

# GET /studios/{id}
resource "aws_lambda_function" "studio_get" {
  filename         = "${var.lambda_artifacts_dir}/studio-get.zip"
  function_name    = "${var.environment}-studio-get"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/studio-get.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# PATCH /studios/{id}
resource "aws_lambda_function" "studio_update" {
  filename         = "${var.lambda_artifacts_dir}/studio-update.zip"
  function_name    = "${var.environment}-studio-update"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/studio-update.zip")
  runtime          = local.lambda_runtime
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# ==================== バッチ処理Lambda ====================

# 仮予約期限通知バッチ
resource "aws_lambda_function" "batch_tentative_reminder" {
  filename         = "${var.lambda_artifacts_dir}/batch-tentative-reminder.zip"
  function_name    = "${var.environment}-batch-tentative-reminder"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/batch-tentative-reminder.zip")
  runtime          = local.lambda_runtime
  timeout          = 300 # 5分
  memory_size      = 512

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# 第2キープ繰り上げバッチ
resource "aws_lambda_function" "batch_second_keep_promote" {
  filename         = "${var.lambda_artifacts_dir}/batch-second-keep-promote.zip"
  function_name    = "${var.environment}-batch-second-keep-promote"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "bootstrap"
  source_code_hash = filebase64sha256("${var.lambda_artifacts_dir}/batch-second-keep-promote.zip")
  runtime          = local.lambda_runtime
  timeout          = 300 # 5分
  memory_size      = 512

  environment {
    variables = local.common_env_vars
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}
