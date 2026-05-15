#!/usr/bin/env bash
#
# cleanup-e2e-data.sh
#
# E2E テスト由来の予約・プラン・オプションを DynamoDB から物理削除する。
# デフォルトは dry-run。--execute を明示しない限り削除は行わない。
#
# 識別条件:
#   - plans:        plan_name が "E2E" で始まる
#   - options:      option_name が "E2E" で始まる
#   - reservations: photographer_name または shooting_details に "E2E" を含む
#
# シード（plan_001/002, option_001/002）は二重ガードで保護される。

set -uo pipefail

# ===================================================================
# 設定（E2E 命名規則が変わったらここを書き換える）
# ===================================================================
E2E_PLAN_NAME_PREFIX="E2E"
E2E_OPTION_NAME_PREFIX="E2E"
E2E_RESERVATION_MATCH_SUBSTRING="E2E"

SEED_PLAN_IDS=("plan_001" "plan_002")
SEED_OPTION_IDS=("option_001" "option_002")

DEFAULT_ENVIRONMENT="${ENVIRONMENT:-dev}"
DEFAULT_REGION="ap-northeast-1"

# ===================================================================
# グローバル変数（parse_args でセット）
# ===================================================================
ENV_NAME=""
REGION=""
MODE="dry-run"     # dry-run | execute | verify-only
SKIP_CONFIRM="false"

PLANS_TABLE=""
OPTIONS_TABLE=""
RESERVATIONS_TABLE=""

# カラー（NO_COLOR があれば無効化）
if [[ -t 1 && -z "${NO_COLOR:-}" ]] && command -v tput >/dev/null 2>&1; then
  C_RESET="$(tput sgr0)"
  C_BOLD="$(tput bold)"
  C_RED="$(tput setaf 1)"
  C_GREEN="$(tput setaf 2)"
  C_YELLOW="$(tput setaf 3)"
  C_CYAN="$(tput setaf 6)"
else
  C_RESET="" C_BOLD="" C_RED="" C_GREEN="" C_YELLOW="" C_CYAN=""
fi

log()   { printf "%s\n" "$*"; }
info()  { printf "%s%s%s\n" "$C_CYAN" "$*" "$C_RESET"; }
warn()  { printf "%s[WARN]%s %s\n" "$C_YELLOW" "$C_RESET" "$*" >&2; }
err()   { printf "%s[ERROR]%s %s\n" "$C_RED" "$C_RESET" "$*" >&2; }
ok()    { printf "%s%s%s\n" "$C_GREEN" "$*" "$C_RESET"; }
hdr()   { printf "\n%s==========================================%s\n%s%s%s\n%s==========================================%s\n" \
            "$C_BOLD" "$C_RESET" "$C_BOLD" "$*" "$C_RESET" "$C_BOLD" "$C_RESET"; }

# ===================================================================
# ヘルプ
# ===================================================================
usage() {
  cat <<'EOF'
Usage: cleanup-e2e-data.sh [OPTIONS]

E2E テスト由来の予約・プラン・オプションを DynamoDB から物理削除する。

OPTIONS:
  --env <dev|prod>     対象環境 (default: dev、環境変数 ENVIRONMENT があれば優先)
  --dry-run            削除対象を表示するだけで実行しない (デフォルト)
  --execute            実削除を実行する（明示的に指定が必要）
  --yes                最終確認プロンプトをスキップ（--execute と併用時のみ）
  --region <region>    リージョン (default: ap-northeast-1)
  --verify-only        現在の件数と E2E 対象件数だけを表示
  -h, --help           このヘルプを表示

EXAMPLES:
  # 件数だけ確認
  ./scripts/cleanup-e2e-data.sh --verify-only

  # 削除対象をプレビュー（デフォルト動作）
  ./scripts/cleanup-e2e-data.sh

  # 実削除
  ./scripts/cleanup-e2e-data.sh --execute

  # CI 用（プロンプトなし）
  ./scripts/cleanup-e2e-data.sh --execute --yes
EOF
}

# ===================================================================
# 引数パース
# ===================================================================
parse_args() {
  ENV_NAME="$DEFAULT_ENVIRONMENT"
  REGION="$DEFAULT_REGION"
  MODE="dry-run"
  SKIP_CONFIRM="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        ENV_NAME="${2:?--env requires an argument}"; shift 2 ;;
      --region)
        REGION="${2:?--region requires an argument}"; shift 2 ;;
      --dry-run)
        MODE="dry-run"; shift ;;
      --execute)
        MODE="execute"; shift ;;
      --verify-only)
        MODE="verify-only"; shift ;;
      --yes)
        SKIP_CONFIRM="true"; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        err "Unknown argument: $1"; usage; exit 2 ;;
    esac
  done

  PLANS_TABLE="${ENV_NAME}-plans"
  OPTIONS_TABLE="${ENV_NAME}-options"
  RESERVATIONS_TABLE="${ENV_NAME}-reservations"
}

# ===================================================================
# 事前チェック
# ===================================================================
check_prerequisites() {
  command -v aws >/dev/null 2>&1 || { err "aws CLI が見つかりません"; exit 1; }
  command -v jq  >/dev/null 2>&1 || { err "jq が見つかりません"; exit 1; }

  local caller
  if ! caller=$(aws sts get-caller-identity --output json 2>&1); then
    err "AWS 認証に失敗しました: $caller"
    exit 1
  fi
  info "Caller: $(echo "$caller" | jq -r '.Arn')"
  info "Account: $(echo "$caller" | jq -r '.Account')"
  info "Region: $REGION"
  info "Environment: $ENV_NAME"
  info "Mode: $MODE"
}

# ===================================================================
# 環境確認（prod は強確認）
# ===================================================================
confirm_environment() {
  if [[ "$ENV_NAME" == "prod" ]]; then
    if [[ "$MODE" == "execute" ]]; then
      warn "本番環境 (prod) に対する実削除が要求されました。"
      printf "確認のため %sDELETE PROD%s と入力してください: " "$C_BOLD" "$C_RESET"
      local input
      read -r input
      if [[ "$input" != "DELETE PROD" ]]; then
        err "確認に失敗しました。中止します。"
        exit 1
      fi
    fi
  fi
}

# ===================================================================
# Scan（ページング対応）
# テーブル名と FilterExpression / 属性値 / projection を受け取り、
# Items 配列の JSON を stdout に出力する
# ===================================================================
scan_with_pagination() {
  local table="$1"
  local filter_expr="$2"
  local attr_values="$3"
  local projection="$4"
  local attr_names="${5:-}"

  local all_items='[]'
  local start_key=""

  while :; do
    local cmd=(aws dynamodb scan
      --region "$REGION"
      --table-name "$table"
      --projection-expression "$projection"
      --output json
      --no-cli-pager)

    if [[ -n "$filter_expr" ]]; then
      cmd+=(--filter-expression "$filter_expr")
      cmd+=(--expression-attribute-values "$attr_values")
    fi
    if [[ -n "$attr_names" ]]; then
      cmd+=(--expression-attribute-names "$attr_names")
    fi
    if [[ -n "$start_key" ]]; then
      cmd+=(--exclusive-start-key "$start_key")
    fi

    local result
    if ! result=$("${cmd[@]}" 2>&1); then
      err "scan failed for $table: $result"
      return 1
    fi

    local items
    items=$(echo "$result" | jq -c '.Items // []')
    all_items=$(jq -c -n --argjson a "$all_items" --argjson b "$items" '$a + $b')

    local next_key
    next_key=$(echo "$result" | jq -c '.LastEvaluatedKey // empty')
    if [[ -z "$next_key" ]]; then
      break
    fi
    start_key="$next_key"
  done

  echo "$all_items"
}

# ===================================================================
# E2E プラン取得（TSV: studio_id\tplan_id\tplan_name）
# ===================================================================
scan_e2e_plans() {
  local items
  items=$(scan_with_pagination \
    "$PLANS_TABLE" \
    "begins_with(plan_name, :prefix)" \
    "{\":prefix\":{\"S\":\"$E2E_PLAN_NAME_PREFIX\"}}" \
    "studio_id, plan_id, plan_name") || return 1

  # seed ID を除外
  local seed_filter='. as $i | '
  local seed_jq=""
  for sid in "${SEED_PLAN_IDS[@]}"; do
    seed_jq+="select(.plan_id.S != \"$sid\") | "
  done

  echo "$items" | jq -r ".[] | $seed_jq [.studio_id.S, .plan_id.S, .plan_name.S] | @tsv"
}

# ===================================================================
# E2E オプション取得（TSV: studio_id\toption_id\toption_name）
# ===================================================================
scan_e2e_options() {
  local items
  items=$(scan_with_pagination \
    "$OPTIONS_TABLE" \
    "begins_with(option_name, :prefix)" \
    "{\":prefix\":{\"S\":\"$E2E_OPTION_NAME_PREFIX\"}}" \
    "studio_id, option_id, option_name") || return 1

  local seed_jq=""
  for sid in "${SEED_OPTION_IDS[@]}"; do
    seed_jq+="select(.option_id.S != \"$sid\") | "
  done

  echo "$items" | jq -r ".[] | $seed_jq [.studio_id.S, .option_id.S, .option_name.S] | @tsv"
}

# ===================================================================
# E2E 予約取得（TSV: studio_id\tdate_reservation_id\tphotographer_name\tshooting_details）
# ===================================================================
scan_e2e_reservations() {
  local items
  items=$(scan_with_pagination \
    "$RESERVATIONS_TABLE" \
    "contains(photographer_name, :kw) OR contains(shooting_details, :kw)" \
    "{\":kw\":{\"S\":\"$E2E_RESERVATION_MATCH_SUBSTRING\"}}" \
    "studio_id, date_reservation_id, photographer_name, shooting_details") || return 1

  echo "$items" | jq -r '
    .[] |
    [
      .studio_id.S,
      .date_reservation_id.S,
      (.photographer_name.S // ""),
      (.shooting_details.S // "")
    ] | @tsv'
}

# ===================================================================
# テーブル全件数取得
# ===================================================================
count_table() {
  local table="$1"
  aws dynamodb scan \
    --region "$REGION" \
    --table-name "$table" \
    --select COUNT \
    --output json \
    --no-cli-pager 2>/dev/null | jq -r '.Count // 0'
}

# ===================================================================
# サンプル表示（TSV 先頭5件）
# ===================================================================
print_sample() {
  local title="$1"
  local tsv="$2"
  log "  Sample (first 5):"
  if [[ -z "$tsv" ]]; then
    log "    (none)"
    return
  fi
  echo "$tsv" | head -n 5 | awk -F'\t' '{
    line = "    "
    for (i = 1; i <= NF; i++) {
      v = $i
      if (length(v) > 50) v = substr(v, 1, 47) "..."
      line = line v "  "
    }
    print line
  }'
}

# ===================================================================
# 単一削除（リトライ最大3回、指数バックオフ）
# ===================================================================
delete_item_with_retry() {
  local table="$1"
  local key_json="$2"
  local attempt=0
  local sleep_sec=1
  local out

  while (( attempt < 3 )); do
    if out=$(aws dynamodb delete-item \
              --region "$REGION" \
              --table-name "$table" \
              --key "$key_json" \
              --output json \
              --no-cli-pager 2>&1); then
      return 0
    fi
    attempt=$((attempt + 1))
    warn "delete-item failed (attempt $attempt/3) on $table: $out"
    if (( attempt < 3 )); then
      sleep "$sleep_sec"
      sleep_sec=$((sleep_sec * 2))
    fi
  done
  return 1
}

# ===================================================================
# プラン削除
# ===================================================================
delete_plans() {
  local tsv="$1"
  local total
  total=$(echo -n "$tsv" | grep -c '' || true)
  if [[ -z "$tsv" || "$total" -eq 0 ]]; then
    log "  (nothing to delete)"
    return 0
  fi

  local i=0 ok_count=0 fail_count=0
  while IFS=$'\t' read -r studio_id plan_id _; do
    [[ -z "$studio_id" ]] && continue
    i=$((i + 1))
    local key
    key=$(jq -c -n --arg s "$studio_id" --arg p "$plan_id" \
            '{studio_id:{S:$s}, plan_id:{S:$p}}')
    if delete_item_with_retry "$PLANS_TABLE" "$key"; then
      ok_count=$((ok_count + 1))
    else
      fail_count=$((fail_count + 1))
    fi
    if (( i % 10 == 0 || i == total )); then
      log "  [$i/$total] processed"
    fi
  done <<< "$tsv"

  log "  Result: ok=$ok_count fail=$fail_count"
  return "$fail_count"
}

# ===================================================================
# オプション削除
# ===================================================================
delete_options() {
  local tsv="$1"
  local total
  total=$(echo -n "$tsv" | grep -c '' || true)
  if [[ -z "$tsv" || "$total" -eq 0 ]]; then
    log "  (nothing to delete)"
    return 0
  fi

  local i=0 ok_count=0 fail_count=0
  while IFS=$'\t' read -r studio_id option_id _; do
    [[ -z "$studio_id" ]] && continue
    i=$((i + 1))
    local key
    key=$(jq -c -n --arg s "$studio_id" --arg o "$option_id" \
            '{studio_id:{S:$s}, option_id:{S:$o}}')
    if delete_item_with_retry "$OPTIONS_TABLE" "$key"; then
      ok_count=$((ok_count + 1))
    else
      fail_count=$((fail_count + 1))
    fi
    if (( i % 10 == 0 || i == total )); then
      log "  [$i/$total] processed"
    fi
  done <<< "$tsv"

  log "  Result: ok=$ok_count fail=$fail_count"
  return "$fail_count"
}

# ===================================================================
# 予約削除
# ===================================================================
delete_reservations() {
  local tsv="$1"
  local total
  total=$(echo -n "$tsv" | grep -c '' || true)
  if [[ -z "$tsv" || "$total" -eq 0 ]]; then
    log "  (nothing to delete)"
    return 0
  fi

  local i=0 ok_count=0 fail_count=0
  while IFS=$'\t' read -r studio_id date_res_id _; do
    [[ -z "$studio_id" ]] && continue
    i=$((i + 1))
    local key
    key=$(jq -c -n --arg s "$studio_id" --arg d "$date_res_id" \
            '{studio_id:{S:$s}, date_reservation_id:{S:$d}}')
    if delete_item_with_retry "$RESERVATIONS_TABLE" "$key"; then
      ok_count=$((ok_count + 1))
    else
      fail_count=$((fail_count + 1))
    fi
    if (( i % 25 == 0 || i == total )); then
      log "  [$i/$total] processed"
    fi
  done <<< "$tsv"

  log "  Result: ok=$ok_count fail=$fail_count"
  return "$fail_count"
}

# ===================================================================
# 件数検証
# ===================================================================
verify_counts() {
  local label="$1"
  hdr "$label"

  local r_total r_e2e o_total o_e2e p_total p_e2e
  r_total=$(count_table "$RESERVATIONS_TABLE")
  o_total=$(count_table "$OPTIONS_TABLE")
  p_total=$(count_table "$PLANS_TABLE")

  r_e2e=$(scan_e2e_reservations | grep -c '' || true)
  o_e2e=$(scan_e2e_options | grep -c '' || true)
  p_e2e=$(scan_e2e_plans | grep -c '' || true)

  printf "  %-22s total=%4s  e2e=%4s\n" "$RESERVATIONS_TABLE" "$r_total" "$r_e2e"
  printf "  %-22s total=%4s  e2e=%4s\n" "$OPTIONS_TABLE"      "$o_total" "$o_e2e"
  printf "  %-22s total=%4s  e2e=%4s\n" "$PLANS_TABLE"        "$p_total" "$p_e2e"
}

# ===================================================================
# サニティチェック（候補が全件 = シードまで消える → 停止）
# ===================================================================
sanity_check() {
  local label="$1"
  local target_count="$2"
  local table_total="$3"
  if (( target_count > 0 && target_count == table_total )); then
    err "$label: 削除候補がテーブル全件と一致しています ($target_count / $table_total)。シードまで消える可能性があるため停止します。"
    exit 1
  fi
}

# ===================================================================
# main
# ===================================================================
main() {
  parse_args "$@"
  hdr "E2E Data Cleanup"
  check_prerequisites
  confirm_environment

  if [[ "$MODE" == "verify-only" ]]; then
    verify_counts "Current state"
    exit 0
  fi

  # スキャン
  hdr "Scanning tables"

  log "[1/3] Scanning $RESERVATIONS_TABLE for E2E records..."
  local res_tsv res_total res_count
  res_tsv=$(scan_e2e_reservations) || exit 1
  res_total=$(count_table "$RESERVATIONS_TABLE")
  res_count=$(echo -n "$res_tsv" | grep -c '' || true)
  log "  Total items in table : $res_total"
  log "  E2E candidates       : $res_count"
  print_sample "reservations" "$res_tsv"
  sanity_check "$RESERVATIONS_TABLE" "$res_count" "$res_total"

  log ""
  log "[2/3] Scanning $OPTIONS_TABLE for E2E records..."
  local opt_tsv opt_total opt_count
  opt_tsv=$(scan_e2e_options) || exit 1
  opt_total=$(count_table "$OPTIONS_TABLE")
  opt_count=$(echo -n "$opt_tsv" | grep -c '' || true)
  log "  Total items in table : $opt_total"
  log "  E2E candidates       : $opt_count"
  print_sample "options" "$opt_tsv"
  sanity_check "$OPTIONS_TABLE" "$opt_count" "$opt_total"

  log ""
  log "[3/3] Scanning $PLANS_TABLE for E2E records..."
  local plan_tsv plan_total plan_count
  plan_tsv=$(scan_e2e_plans) || exit 1
  plan_total=$(count_table "$PLANS_TABLE")
  plan_count=$(echo -n "$plan_tsv" | grep -c '' || true)
  log "  Total items in table : $plan_total"
  log "  E2E candidates       : $plan_count"
  print_sample "plans" "$plan_tsv"
  sanity_check "$PLANS_TABLE" "$plan_count" "$plan_total"

  hdr "Summary"
  printf "  Reservations to delete : %4s / %s\n" "$res_count" "$res_total"
  printf "  Options to delete      : %4s / %s\n" "$opt_count" "$opt_total"
  printf "  Plans to delete        : %4s / %s\n" "$plan_count" "$plan_total"

  if [[ "$MODE" == "dry-run" ]]; then
    log ""
    ok "DRY RUN - no changes made. Re-run with --execute to perform deletion."
    exit 0
  fi

  # 実削除
  if (( res_count + opt_count + plan_count == 0 )); then
    ok "削除対象がありません。終了します。"
    exit 0
  fi

  if [[ "$SKIP_CONFIRM" != "true" ]]; then
    log ""
    printf "%sType 'yes' to proceed with deletion:%s " "$C_BOLD" "$C_RESET"
    local input
    read -r input
    if [[ "$input" != "yes" ]]; then
      err "確認に失敗しました。中止します。"
      exit 1
    fi
  fi

  local total_fail=0
  hdr "Deleting reservations"
  if ! delete_reservations "$res_tsv"; then
    total_fail=$((total_fail + $?))
  fi

  hdr "Deleting options"
  if ! delete_options "$opt_tsv"; then
    total_fail=$((total_fail + $?))
  fi

  hdr "Deleting plans"
  if ! delete_plans "$plan_tsv"; then
    total_fail=$((total_fail + $?))
  fi

  verify_counts "Post-cleanup verification"

  log ""
  if (( total_fail > 0 )); then
    warn "完了しましたが、$total_fail 件の削除失敗がありました。"
    exit 1
  fi
  ok "Done."
}

main "$@"
