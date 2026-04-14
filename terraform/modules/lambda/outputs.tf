# Lambdaモジュールの出力定義

# Lambda実行ロール
output "lambda_execution_role_arn" {
  description = "Lambda実行ロールのARN"
  value       = aws_iam_role.lambda_execution_role.arn
}

# 認証関連Lambda
output "auth_signup_function_name" {
  description = "サインアップLambda関数名"
  value       = aws_lambda_function.auth_signup.function_name
}

output "auth_signup_invoke_arn" {
  description = "サインアップLambda呼び出しARN"
  value       = aws_lambda_function.auth_signup.invoke_arn
}

output "auth_login_function_name" {
  description = "ログインLambda関数名"
  value       = aws_lambda_function.auth_login.function_name
}

output "auth_login_invoke_arn" {
  description = "ログインLambda呼び出しARN"
  value       = aws_lambda_function.auth_login.invoke_arn
}

output "users_me_get_function_name" {
  description = "ユーザー情報取得Lambda関数名"
  value       = aws_lambda_function.users_me_get.function_name
}

output "users_me_get_invoke_arn" {
  description = "ユーザー情報取得Lambda呼び出しARN"
  value       = aws_lambda_function.users_me_get.invoke_arn
}

# カレンダー関連Lambda
output "calendar_get_function_name" {
  description = "カレンダー取得Lambda関数名"
  value       = aws_lambda_function.calendar_get.function_name
}

output "calendar_get_invoke_arn" {
  description = "カレンダー取得Lambda呼び出しARN"
  value       = aws_lambda_function.calendar_get.invoke_arn
}

# 予約関連Lambda
output "reservation_create_function_name" {
  description = "予約作成Lambda関数名"
  value       = aws_lambda_function.reservation_create.function_name
}

output "reservation_create_invoke_arn" {
  description = "予約作成Lambda呼び出しARN"
  value       = aws_lambda_function.reservation_create.invoke_arn
}

output "reservation_list_function_name" {
  description = "予約一覧Lambda関数名"
  value       = aws_lambda_function.reservation_list.function_name
}

output "reservation_list_invoke_arn" {
  description = "予約一覧Lambda呼び出しARN"
  value       = aws_lambda_function.reservation_list.invoke_arn
}

output "reservation_get_function_name" {
  description = "予約詳細Lambda関数名"
  value       = aws_lambda_function.reservation_get.function_name
}

output "reservation_get_invoke_arn" {
  description = "予約詳細Lambda呼び出しARN"
  value       = aws_lambda_function.reservation_get.invoke_arn
}

output "reservation_approve_function_name" {
  description = "予約承認Lambda関数名"
  value       = aws_lambda_function.reservation_approve.function_name
}

output "reservation_approve_invoke_arn" {
  description = "予約承認Lambda呼び出しARN"
  value       = aws_lambda_function.reservation_approve.invoke_arn
}

output "reservation_reject_function_name" {
  description = "予約却下Lambda関数名"
  value       = aws_lambda_function.reservation_reject.function_name
}

output "reservation_reject_invoke_arn" {
  description = "予約却下Lambda呼び出しARN"
  value       = aws_lambda_function.reservation_reject.invoke_arn
}

output "reservation_promote_function_name" {
  description = "予約繰り上げLambda関数名"
  value       = aws_lambda_function.reservation_promote.function_name
}

output "reservation_promote_invoke_arn" {
  description = "予約繰り上げLambda呼び出しARN"
  value       = aws_lambda_function.reservation_promote.invoke_arn
}

output "reservation_cancel_function_name" {
  description = "予約キャンセルLambda関数名"
  value       = aws_lambda_function.reservation_cancel.function_name
}

output "reservation_cancel_invoke_arn" {
  description = "予約キャンセルLambda呼び出しARN"
  value       = aws_lambda_function.reservation_cancel.invoke_arn
}

# プラン関連Lambda
output "plans_list_function_name" {
  description = "プラン一覧Lambda関数名"
  value       = aws_lambda_function.plans_list.function_name
}

output "plans_list_invoke_arn" {
  description = "プラン一覧Lambda呼び出しARN"
  value       = aws_lambda_function.plans_list.invoke_arn
}

output "plan_create_function_name" {
  description = "プラン作成Lambda関数名"
  value       = aws_lambda_function.plan_create.function_name
}

output "plan_create_invoke_arn" {
  description = "プラン作成Lambda呼び出しARN"
  value       = aws_lambda_function.plan_create.invoke_arn
}

output "plan_get_function_name" {
  description = "プラン詳細Lambda関数名"
  value       = aws_lambda_function.plan_get.function_name
}

output "plan_get_invoke_arn" {
  description = "プラン詳細Lambda呼び出しARN"
  value       = aws_lambda_function.plan_get.invoke_arn
}

output "plan_update_function_name" {
  description = "プラン更新Lambda関数名"
  value       = aws_lambda_function.plan_update.function_name
}

output "plan_update_invoke_arn" {
  description = "プラン更新Lambda呼び出しARN"
  value       = aws_lambda_function.plan_update.invoke_arn
}

output "plan_delete_function_name" {
  description = "プラン削除Lambda関数名"
  value       = aws_lambda_function.plan_delete.function_name
}

output "plan_delete_invoke_arn" {
  description = "プラン削除Lambda呼び出しARN"
  value       = aws_lambda_function.plan_delete.invoke_arn
}

# オプション関連Lambda
output "options_list_function_name" {
  description = "オプション一覧Lambda関数名"
  value       = aws_lambda_function.options_list.function_name
}

output "options_list_invoke_arn" {
  description = "オプション一覧Lambda呼び出しARN"
  value       = aws_lambda_function.options_list.invoke_arn
}

output "option_create_function_name" {
  description = "オプション作成Lambda関数名"
  value       = aws_lambda_function.option_create.function_name
}

output "option_create_invoke_arn" {
  description = "オプション作成Lambda呼び出しARN"
  value       = aws_lambda_function.option_create.invoke_arn
}

output "option_get_function_name" {
  description = "オプション詳細Lambda関数名"
  value       = aws_lambda_function.option_get.function_name
}

output "option_get_invoke_arn" {
  description = "オプション詳細Lambda呼び出しARN"
  value       = aws_lambda_function.option_get.invoke_arn
}

output "option_update_function_name" {
  description = "オプション更新Lambda関数名"
  value       = aws_lambda_function.option_update.function_name
}

output "option_update_invoke_arn" {
  description = "オプション更新Lambda呼び出しARN"
  value       = aws_lambda_function.option_update.invoke_arn
}

output "option_delete_function_name" {
  description = "オプション削除Lambda関数名"
  value       = aws_lambda_function.option_delete.function_name
}

output "option_delete_invoke_arn" {
  description = "オプション削除Lambda呼び出しARN"
  value       = aws_lambda_function.option_delete.invoke_arn
}

# ブロック枠関連Lambda
output "blocked_slots_list_function_name" {
  description = "ブロック枠一覧Lambda関数名"
  value       = aws_lambda_function.blocked_slots_list.function_name
}

output "blocked_slots_list_invoke_arn" {
  description = "ブロック枠一覧Lambda呼び出しARN"
  value       = aws_lambda_function.blocked_slots_list.invoke_arn
}

output "blocked_slot_create_function_name" {
  description = "ブロック枠作成Lambda関数名"
  value       = aws_lambda_function.blocked_slot_create.function_name
}

output "blocked_slot_create_invoke_arn" {
  description = "ブロック枠作成Lambda呼び出しARN"
  value       = aws_lambda_function.blocked_slot_create.invoke_arn
}

output "blocked_slot_delete_function_name" {
  description = "ブロック枠削除Lambda関数名"
  value       = aws_lambda_function.blocked_slot_delete.function_name
}

output "blocked_slot_delete_invoke_arn" {
  description = "ブロック枠削除Lambda呼び出しARN"
  value       = aws_lambda_function.blocked_slot_delete.invoke_arn
}

# 問い合わせ関連Lambda
output "inquiry_create_function_name" {
  description = "問い合わせ作成Lambda関数名"
  value       = aws_lambda_function.inquiry_create.function_name
}

output "inquiry_create_invoke_arn" {
  description = "問い合わせ作成Lambda呼び出しARN"
  value       = aws_lambda_function.inquiry_create.invoke_arn
}

output "inquiry_list_function_name" {
  description = "問い合わせ一覧Lambda関数名"
  value       = aws_lambda_function.inquiry_list.function_name
}

output "inquiry_list_invoke_arn" {
  description = "問い合わせ一覧Lambda呼び出しARN"
  value       = aws_lambda_function.inquiry_list.invoke_arn
}

output "inquiry_get_function_name" {
  description = "問い合わせ詳細Lambda関数名"
  value       = aws_lambda_function.inquiry_get.function_name
}

output "inquiry_get_invoke_arn" {
  description = "問い合わせ詳細Lambda呼び出しARN"
  value       = aws_lambda_function.inquiry_get.invoke_arn
}

output "inquiry_reply_function_name" {
  description = "問い合わせ回答Lambda関数名"
  value       = aws_lambda_function.inquiry_reply.function_name
}

output "inquiry_reply_invoke_arn" {
  description = "問い合わせ回答Lambda呼び出しARN"
  value       = aws_lambda_function.inquiry_reply.invoke_arn
}

output "inquiry_close_function_name" {
  description = "問い合わせクローズLambda関数名"
  value       = aws_lambda_function.inquiry_close.function_name
}

output "inquiry_close_invoke_arn" {
  description = "問い合わせクローズLambda呼び出しARN"
  value       = aws_lambda_function.inquiry_close.invoke_arn
}

# スタジオ関連Lambda
output "studio_get_function_name" {
  description = "スタジオ情報取得Lambda関数名"
  value       = aws_lambda_function.studio_get.function_name
}

output "studio_get_invoke_arn" {
  description = "スタジオ情報取得Lambda呼び出しARN"
  value       = aws_lambda_function.studio_get.invoke_arn
}

output "studio_update_function_name" {
  description = "スタジオ情報更新Lambda関数名"
  value       = aws_lambda_function.studio_update.function_name
}

output "studio_update_invoke_arn" {
  description = "スタジオ情報更新Lambda呼び出しARN"
  value       = aws_lambda_function.studio_update.invoke_arn
}

# バッチ処理Lambda
output "batch_tentative_reminder_function_name" {
  description = "仮予約期限通知バッチLambda関数名"
  value       = aws_lambda_function.batch_tentative_reminder.function_name
}

output "batch_tentative_reminder_function_arn" {
  description = "仮予約期限通知バッチLambda ARN"
  value       = aws_lambda_function.batch_tentative_reminder.arn
}

output "batch_second_keep_promote_function_name" {
  description = "第2キープ繰り上げバッチLambda関数名"
  value       = aws_lambda_function.batch_second_keep_promote.function_name
}

output "batch_second_keep_promote_function_arn" {
  description = "第2キープ繰り上げバッチLambda ARN"
  value       = aws_lambda_function.batch_second_keep_promote.arn
}

# すべてのLambda関数名をマップで出力
output "all_lambda_functions" {
  description = "すべてのLambda関数名のマップ"
  value = {
    auth_signup               = aws_lambda_function.auth_signup.function_name
    auth_login                = aws_lambda_function.auth_login.function_name
    users_me_get              = aws_lambda_function.users_me_get.function_name
    calendar_get              = aws_lambda_function.calendar_get.function_name
    reservation_create        = aws_lambda_function.reservation_create.function_name
    reservation_list          = aws_lambda_function.reservation_list.function_name
    reservation_get           = aws_lambda_function.reservation_get.function_name
    reservation_approve       = aws_lambda_function.reservation_approve.function_name
    reservation_reject        = aws_lambda_function.reservation_reject.function_name
    reservation_promote       = aws_lambda_function.reservation_promote.function_name
    reservation_cancel        = aws_lambda_function.reservation_cancel.function_name
    plans_list                = aws_lambda_function.plans_list.function_name
    plan_create               = aws_lambda_function.plan_create.function_name
    plan_get                  = aws_lambda_function.plan_get.function_name
    plan_update               = aws_lambda_function.plan_update.function_name
    plan_delete               = aws_lambda_function.plan_delete.function_name
    options_list              = aws_lambda_function.options_list.function_name
    option_create             = aws_lambda_function.option_create.function_name
    option_get                = aws_lambda_function.option_get.function_name
    option_update             = aws_lambda_function.option_update.function_name
    option_delete             = aws_lambda_function.option_delete.function_name
    blocked_slots_list        = aws_lambda_function.blocked_slots_list.function_name
    blocked_slot_create       = aws_lambda_function.blocked_slot_create.function_name
    blocked_slot_delete       = aws_lambda_function.blocked_slot_delete.function_name
    inquiry_create            = aws_lambda_function.inquiry_create.function_name
    inquiry_list              = aws_lambda_function.inquiry_list.function_name
    inquiry_get               = aws_lambda_function.inquiry_get.function_name
    inquiry_reply             = aws_lambda_function.inquiry_reply.function_name
    inquiry_close             = aws_lambda_function.inquiry_close.function_name
    studio_get                = aws_lambda_function.studio_get.function_name
    studio_update             = aws_lambda_function.studio_update.function_name
    batch_tentative_reminder  = aws_lambda_function.batch_tentative_reminder.function_name
    batch_second_keep_promote = aws_lambda_function.batch_second_keep_promote.function_name
  }
}
