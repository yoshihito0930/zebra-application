# API Gatewayモジュール
# REST APIとすべてのエンドポイントを定義

# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.environment}-zebra-api"
  description = "Zebra Application REST API for ${var.environment}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.environment}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"

  provider_arns = [var.cognito_user_pool_arn]
}

# ==================== リソース定義 ====================

# /auth
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

# /auth/signup
resource "aws_api_gateway_resource" "auth_signup" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "signup"
}

# /auth/login
resource "aws_api_gateway_resource" "auth_login" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "login"
}

# /users
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "users"
}

# /users/me
resource "aws_api_gateway_resource" "users_me" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.users.id
  path_part   = "me"
}

# /studios
resource "aws_api_gateway_resource" "studios" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "studios"
}

# /studios/{id}
resource "aws_api_gateway_resource" "studios_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.studios.id
  path_part   = "{id}"
}

# /studios/{id}/calendar
resource "aws_api_gateway_resource" "studios_id_calendar" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.studios_id.id
  path_part   = "calendar"
}

# /studios/{id}/plans
resource "aws_api_gateway_resource" "studios_id_plans" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.studios_id.id
  path_part   = "plans"
}

# /studios/{id}/options
resource "aws_api_gateway_resource" "studios_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.studios_id.id
  path_part   = "options"
}

# /reservations
resource "aws_api_gateway_resource" "reservations" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "reservations"
}

# /reservations/{id}
resource "aws_api_gateway_resource" "reservations_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reservations.id
  path_part   = "{id}"
}

# /reservations/{id}/approve
resource "aws_api_gateway_resource" "reservations_id_approve" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reservations_id.id
  path_part   = "approve"
}

# /reservations/{id}/reject
resource "aws_api_gateway_resource" "reservations_id_reject" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reservations_id.id
  path_part   = "reject"
}

# /reservations/{id}/promote
resource "aws_api_gateway_resource" "reservations_id_promote" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reservations_id.id
  path_part   = "promote"
}

# /reservations/{id}/cancel
resource "aws_api_gateway_resource" "reservations_id_cancel" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.reservations_id.id
  path_part   = "cancel"
}

# /plans
resource "aws_api_gateway_resource" "plans" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "plans"
}

# /plans/{id}
resource "aws_api_gateway_resource" "plans_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.plans.id
  path_part   = "{id}"
}

# /options
resource "aws_api_gateway_resource" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "options"
}

# /options/{id}
resource "aws_api_gateway_resource" "options_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.options.id
  path_part   = "{id}"
}

# /blocked-slots
resource "aws_api_gateway_resource" "blocked_slots" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "blocked-slots"
}

# /blocked-slots/{id}
resource "aws_api_gateway_resource" "blocked_slots_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.blocked_slots.id
  path_part   = "{id}"
}

# /inquiries
resource "aws_api_gateway_resource" "inquiries" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "inquiries"
}

# /inquiries/{id}
resource "aws_api_gateway_resource" "inquiries_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.inquiries.id
  path_part   = "{id}"
}

# /inquiries/{id}/reply
resource "aws_api_gateway_resource" "inquiries_id_reply" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.inquiries_id.id
  path_part   = "reply"
}

# /inquiries/{id}/close
resource "aws_api_gateway_resource" "inquiries_id_close" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.inquiries_id.id
  path_part   = "close"
}

# ==================== メソッドとLambda統合 ====================

# Lambda統合を作成するモジュール（再利用可能）
module "lambda_integration" {
  for_each = {
    # 認証
    "auth_signup"      = { resource = aws_api_gateway_resource.auth_signup.id, method = "POST", invoke_arn = var.lambda_functions.auth_signup.invoke_arn, auth = false }
    "auth_login"       = { resource = aws_api_gateway_resource.auth_login.id, method = "POST", invoke_arn = var.lambda_functions.auth_login.invoke_arn, auth = false }
    "users_me_get"     = { resource = aws_api_gateway_resource.users_me.id, method = "GET", invoke_arn = var.lambda_functions.users_me_get.invoke_arn, auth = true }
    # カレンダー
    "calendar_get"     = { resource = aws_api_gateway_resource.studios_id_calendar.id, method = "GET", invoke_arn = var.lambda_functions.calendar_get.invoke_arn, auth = false }
    # 予約
    "reservation_create"  = { resource = aws_api_gateway_resource.reservations.id, method = "POST", invoke_arn = var.lambda_functions.reservation_create.invoke_arn, auth = true }
    "reservation_list"    = { resource = aws_api_gateway_resource.reservations.id, method = "GET", invoke_arn = var.lambda_functions.reservation_list.invoke_arn, auth = true }
    "reservation_get"     = { resource = aws_api_gateway_resource.reservations_id.id, method = "GET", invoke_arn = var.lambda_functions.reservation_get.invoke_arn, auth = true }
    "reservation_approve" = { resource = aws_api_gateway_resource.reservations_id_approve.id, method = "PATCH", invoke_arn = var.lambda_functions.reservation_approve.invoke_arn, auth = true }
    "reservation_reject"  = { resource = aws_api_gateway_resource.reservations_id_reject.id, method = "PATCH", invoke_arn = var.lambda_functions.reservation_reject.invoke_arn, auth = true }
    "reservation_promote" = { resource = aws_api_gateway_resource.reservations_id_promote.id, method = "PATCH", invoke_arn = var.lambda_functions.reservation_promote.invoke_arn, auth = true }
    "reservation_cancel"  = { resource = aws_api_gateway_resource.reservations_id_cancel.id, method = "PATCH", invoke_arn = var.lambda_functions.reservation_cancel.invoke_arn, auth = true }
    # プラン
    "plans_list"   = { resource = aws_api_gateway_resource.studios_id_plans.id, method = "GET", invoke_arn = var.lambda_functions.plans_list.invoke_arn, auth = false }
    "plan_create"  = { resource = aws_api_gateway_resource.plans.id, method = "POST", invoke_arn = var.lambda_functions.plan_create.invoke_arn, auth = true }
    "plan_get"     = { resource = aws_api_gateway_resource.plans_id.id, method = "GET", invoke_arn = var.lambda_functions.plan_get.invoke_arn, auth = false }
    "plan_update"  = { resource = aws_api_gateway_resource.plans_id.id, method = "PATCH", invoke_arn = var.lambda_functions.plan_update.invoke_arn, auth = true }
    "plan_delete"  = { resource = aws_api_gateway_resource.plans_id.id, method = "DELETE", invoke_arn = var.lambda_functions.plan_delete.invoke_arn, auth = true }
    # オプション
    "options_list"  = { resource = aws_api_gateway_resource.studios_id_options.id, method = "GET", invoke_arn = var.lambda_functions.options_list.invoke_arn, auth = false }
    "option_create" = { resource = aws_api_gateway_resource.options.id, method = "POST", invoke_arn = var.lambda_functions.option_create.invoke_arn, auth = true }
    "option_get"    = { resource = aws_api_gateway_resource.options_id.id, method = "GET", invoke_arn = var.lambda_functions.option_get.invoke_arn, auth = false }
    "option_update" = { resource = aws_api_gateway_resource.options_id.id, method = "PATCH", invoke_arn = var.lambda_functions.option_update.invoke_arn, auth = true }
    "option_delete" = { resource = aws_api_gateway_resource.options_id.id, method = "DELETE", invoke_arn = var.lambda_functions.option_delete.invoke_arn, auth = true }
    # ブロック枠
    "blocked_slots_list"   = { resource = aws_api_gateway_resource.blocked_slots.id, method = "GET", invoke_arn = var.lambda_functions.blocked_slots_list.invoke_arn, auth = false }
    "blocked_slot_create"  = { resource = aws_api_gateway_resource.blocked_slots.id, method = "POST", invoke_arn = var.lambda_functions.blocked_slot_create.invoke_arn, auth = true }
    "blocked_slot_delete"  = { resource = aws_api_gateway_resource.blocked_slots_id.id, method = "DELETE", invoke_arn = var.lambda_functions.blocked_slot_delete.invoke_arn, auth = true }
    # 問い合わせ
    "inquiry_create" = { resource = aws_api_gateway_resource.inquiries.id, method = "POST", invoke_arn = var.lambda_functions.inquiry_create.invoke_arn, auth = true }
    "inquiry_list"   = { resource = aws_api_gateway_resource.inquiries.id, method = "GET", invoke_arn = var.lambda_functions.inquiry_list.invoke_arn, auth = true }
    "inquiry_get"    = { resource = aws_api_gateway_resource.inquiries_id.id, method = "GET", invoke_arn = var.lambda_functions.inquiry_get.invoke_arn, auth = true }
    "inquiry_reply"  = { resource = aws_api_gateway_resource.inquiries_id_reply.id, method = "PATCH", invoke_arn = var.lambda_functions.inquiry_reply.invoke_arn, auth = true }
    "inquiry_close"  = { resource = aws_api_gateway_resource.inquiries_id_close.id, method = "PATCH", invoke_arn = var.lambda_functions.inquiry_close.invoke_arn, auth = true }
    # スタジオ
    "studio_get"    = { resource = aws_api_gateway_resource.studios_id.id, method = "GET", invoke_arn = var.lambda_functions.studio_get.invoke_arn, auth = false }
    "studio_update" = { resource = aws_api_gateway_resource.studios_id.id, method = "PATCH", invoke_arn = var.lambda_functions.studio_update.invoke_arn, auth = true }
  }

  source = "./method"

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value.resource
  http_method   = each.value.method
  invoke_arn    = each.value.invoke_arn
  authorizer_id = each.value.auth ? aws_api_gateway_authorizer.cognito.id : null
  environment   = var.environment
}

# デプロイメント
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  # すべてのメソッドに依存
  depends_on = [module.lambda_integration]

  # デプロイメントを強制的に更新
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.main.body,
      module.lambda_integration,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ステージ
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  # ログ設定
  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  # メトリクス有効化
  xray_tracing_enabled = true

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# メソッド設定（スロットリング）
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled    = true
    logging_level      = var.environment == "prod" ? "INFO" : "INFO"
    data_trace_enabled = var.environment != "prod"

    # スロットリング設定
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
}

# API Gatewayアカウント設定（CloudWatch Logsロール）
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = var.api_gateway_cloudwatch_role_arn
}

# CORS設定のためのOPTIONSメソッド（すべてのリソースに適用）
# 簡略化のため、主要なリソースのみ設定
resource "aws_api_gateway_method" "options" {
  for_each = toset([
    aws_api_gateway_resource.auth_signup.id,
    aws_api_gateway_resource.auth_login.id,
    aws_api_gateway_resource.users_me.id,
    aws_api_gateway_resource.studios_id_calendar.id,
    aws_api_gateway_resource.reservations.id,
    aws_api_gateway_resource.reservations_id.id,
    aws_api_gateway_resource.plans.id,
    aws_api_gateway_resource.options.id,
    aws_api_gateway_resource.blocked_slots.id,
    aws_api_gateway_resource.inquiries.id,
  ])

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  for_each = aws_api_gateway_method.options

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options" {
  for_each = aws_api_gateway_method.options

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = aws_api_gateway_method.options

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = aws_api_gateway_method_response.options[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
