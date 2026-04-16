# Dev環境のメイン設定ファイル

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # バックエンド設定（S3 + DynamoDBでステート管理）
  # 初回はコメントアウトして terraform init 実行後、有効化してください
  # backend "s3" {
  #   bucket         = "zebra-terraform-state-dev"
  #   key            = "dev/terraform.tfstate"
  #   region         = "ap-northeast-1"
  #   dynamodb_table = "zebra-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "zebra-application"
      ManagedBy   = "terraform"
    }
  }
}

# ==================== モジュール呼び出し ====================

# DynamoDBテーブル
module "dynamodb" {
  source = "../../modules/dynamodb"

  environment = var.environment
}

# Cognito
module "cognito" {
  source = "../../modules/cognito"

  environment = var.environment
}

# CloudWatch（Lambdaより先に作成）
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment = var.environment

  lambda_function_names = {
    auth_signup               = "${var.environment}-auth-signup"
    auth_login                = "${var.environment}-auth-login"
    reservation_create        = "${var.environment}-reservation-create"
    reservation_approve       = "${var.environment}-reservation-approve"
    batch_tentative_reminder  = "${var.environment}-batch-tentative-reminder"
    batch_second_keep_promote = "${var.environment}-batch-second-keep-promote"
  }

  dynamodb_table_names = {
    reservations = module.dynamodb.reservations_table_name
    users        = module.dynamodb.users_table_name
  }

  alarm_email = var.alarm_email
}

# Lambda関数
module "lambda" {
  source = "../../modules/lambda"

  environment           = var.environment
  lambda_artifacts_dir  = var.lambda_artifacts_dir
  dynamodb_table_arns   = values(module.dynamodb.table_arns)
  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_user_pool_arn = module.cognito.user_pool_arn
  cognito_user_pool_client_id = module.cognito.user_pool_client_id

  depends_on = [module.cloudwatch]
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api-gateway"

  environment           = var.environment
  cognito_user_pool_arn = module.cognito.user_pool_arn

  lambda_functions = {
    auth_signup = {
      invoke_arn = module.lambda.auth_signup_invoke_arn
    }
    auth_login = {
      invoke_arn = module.lambda.auth_login_invoke_arn
    }
    users_me_get = {
      invoke_arn = module.lambda.users_me_get_invoke_arn
    }
    calendar_get = {
      invoke_arn = module.lambda.calendar_get_invoke_arn
    }
    reservation_create = {
      invoke_arn = module.lambda.reservation_create_invoke_arn
    }
    reservation_list = {
      invoke_arn = module.lambda.reservation_list_invoke_arn
    }
    reservation_get = {
      invoke_arn = module.lambda.reservation_get_invoke_arn
    }
    reservation_approve = {
      invoke_arn = module.lambda.reservation_approve_invoke_arn
    }
    reservation_reject = {
      invoke_arn = module.lambda.reservation_reject_invoke_arn
    }
    reservation_promote = {
      invoke_arn = module.lambda.reservation_promote_invoke_arn
    }
    reservation_cancel = {
      invoke_arn = module.lambda.reservation_cancel_invoke_arn
    }
    plans_list = {
      invoke_arn = module.lambda.plans_list_invoke_arn
    }
    plan_create = {
      invoke_arn = module.lambda.plan_create_invoke_arn
    }
    plan_get = {
      invoke_arn = module.lambda.plan_get_invoke_arn
    }
    plan_update = {
      invoke_arn = module.lambda.plan_update_invoke_arn
    }
    plan_delete = {
      invoke_arn = module.lambda.plan_delete_invoke_arn
    }
    options_list = {
      invoke_arn = module.lambda.options_list_invoke_arn
    }
    option_create = {
      invoke_arn = module.lambda.option_create_invoke_arn
    }
    option_get = {
      invoke_arn = module.lambda.option_get_invoke_arn
    }
    option_update = {
      invoke_arn = module.lambda.option_update_invoke_arn
    }
    option_delete = {
      invoke_arn = module.lambda.option_delete_invoke_arn
    }
    blocked_slots_list = {
      invoke_arn = module.lambda.blocked_slots_list_invoke_arn
    }
    blocked_slot_create = {
      invoke_arn = module.lambda.blocked_slot_create_invoke_arn
    }
    blocked_slot_delete = {
      invoke_arn = module.lambda.blocked_slot_delete_invoke_arn
    }
    inquiry_create = {
      invoke_arn = module.lambda.inquiry_create_invoke_arn
    }
    inquiry_list = {
      invoke_arn = module.lambda.inquiry_list_invoke_arn
    }
    inquiry_get = {
      invoke_arn = module.lambda.inquiry_get_invoke_arn
    }
    inquiry_reply = {
      invoke_arn = module.lambda.inquiry_reply_invoke_arn
    }
    inquiry_close = {
      invoke_arn = module.lambda.inquiry_close_invoke_arn
    }
    studio_get = {
      invoke_arn = module.lambda.studio_get_invoke_arn
    }
    studio_update = {
      invoke_arn = module.lambda.studio_update_invoke_arn
    }
    # ゲスト予約（2026-04-16追加）
    reservation_guest_get = {
      invoke_arn = module.lambda.reservation_guest_get_invoke_arn
    }
    reservation_guest_cancel = {
      invoke_arn = module.lambda.reservation_guest_cancel_invoke_arn
    }
    reservation_guest_promote = {
      invoke_arn = module.lambda.reservation_guest_promote_invoke_arn
    }
  }

  cloudwatch_log_group_arn          = module.cloudwatch.api_gateway_log_group_arn
  api_gateway_cloudwatch_role_arn   = module.cloudwatch.api_gateway_cloudwatch_role_arn
}

# EventBridge
module "eventbridge" {
  source = "../../modules/eventbridge"

  environment = var.environment

  batch_tentative_reminder_lambda_arn     = module.lambda.batch_tentative_reminder_function_arn
  batch_tentative_reminder_function_name  = module.lambda.batch_tentative_reminder_function_name
  batch_second_keep_promote_lambda_arn    = module.lambda.batch_second_keep_promote_function_arn
  batch_second_keep_promote_function_name = module.lambda.batch_second_keep_promote_function_name
}
