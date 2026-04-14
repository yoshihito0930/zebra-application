# Cognitoモジュール
# ユーザー認証のためのUser PoolとApp Clientを定義

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.environment}-zebra-users"

  # ユーザー名属性の設定（emailをユーザー名として使用）
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # パスワードポリシー
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # アカウント復旧設定
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # ユーザー属性スキーマ
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  # カスタム属性: studio_id (スタジオID)
  schema {
    name                = "studio_id"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 50
    }
  }

  # カスタム属性: role (customer, admin, staff)
  schema {
    name                = "role"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 20
    }
  }

  # カスタム属性: phone_number
  schema {
    name                = "phone_number"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 20
    }
  }

  # MFA設定（オプショナル）
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # ユーザープール削除保護（本番環境では有効化を推奨）
  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  tags = {
    Environment = var.environment
    Project     = "zebra-application"
    ManagedBy   = "terraform"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.environment}-zebra-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # 認証フロー設定
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # トークンの有効期限
  access_token_validity  = 60  # 60分
  id_token_validity      = 60  # 60分
  refresh_token_validity = 30  # 30日

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # OAuth設定（将来的にソーシャルログインを追加する場合）
  allowed_oauth_flows_user_pool_client = false

  # セキュリティ設定
  prevent_user_existence_errors = "ENABLED"

  # 読み取り/書き込み属性
  read_attributes = [
    "email",
    "email_verified",
    "name",
    "custom:studio_id",
    "custom:role",
    "custom:phone_number"
  ]

  write_attributes = [
    "email",
    "name",
    "custom:phone_number"
  ]
}

# Cognito User Pool Domain（ホストされたUIを使用する場合）
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.environment}-zebra-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ドメインの一意性を保証するためのランダム文字列
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}
