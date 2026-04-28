# E2Eテスト項目

## 概要

スタジオゼブラ予約管理アプリケーションの包括的なE2E（End-to-End）テスト項目一覧。
各ユーザーロール（customer, admin, staff, guest）の主要ユースケースをカバーし、システム全体の動作を検証する。

**テスト環境**: dev環境（API Gateway + Lambda + DynamoDB）

---

## テストカテゴリ

1. [認証・認可](#1-認証認可)
2. [ゲストユーザー（閲覧・予約）](#2-ゲストユーザー閲覧予約)
3. [会員ユーザー（予約管理）](#3-会員ユーザー予約管理)
4. [管理者（予約承認・管理）](#4-管理者予約承認管理)
5. [管理者（プラン・オプション管理）](#5-管理者プランオプション管理)
6. [管理者（ブロック枠管理）](#6-管理者ブロック枠管理)
7. [スタッフ（閲覧のみ）](#7-スタッフ閲覧のみ)
8. [問い合わせ機能](#8-問い合わせ機能)
9. [バッチ処理・自動化](#9-バッチ処理自動化)
10. [エラーハンドリング](#10-エラーハンドリング)
11. [パフォーマンス・同時実行](#11-パフォーマンス同時実行)

---

## 1. 認証・認可

### 1.1 ユーザー登録（UC-101）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| AUTH-001 | 新規ユーザー登録が成功する | 有効なメールアドレス、パスワード、電話番号、住所 | 201 Created、user_idが返される、Cognitoにユーザーが作成される | 高 |
| AUTH-002 | 既に登録済みのメールアドレスで登録を試みる | 既存のメールアドレス | 409 Conflict、EMAIL_ALREADY_EXISTS | 高 |
| AUTH-003 | 無効なメールアドレス形式で登録を試みる | 不正なメール形式 | 400 Bad Request、VALIDATION_ERROR | 中 |
| AUTH-004 | パスワードが短すぎる場合 | 7文字以下のパスワード | 400 Bad Request、VALIDATION_ERROR | 中 |
| AUTH-005 | 必須フィールド（name, email, password, phone, address）が欠けている場合 | 必須フィールドの一部を省略 | 400 Bad Request、VALIDATION_ERROR | 中 |

### 1.2 ログイン（POST /auth/login）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| AUTH-101 | 正しい認証情報でログインが成功する | 有効なメールアドレス、パスワード | 200 OK、access_token、refresh_token、user情報が返される | 高 |
| AUTH-102 | 誤ったパスワードでログインを試みる | 正しいメール、誤ったパスワード | 401 Unauthorized、AUTH_LOGIN_FAILED | 高 |
| AUTH-103 | 存在しないメールアドレスでログインを試みる | 未登録のメールアドレス | 401 Unauthorized、AUTH_LOGIN_FAILED | 高 |
| AUTH-104 | メールアドレスが空の場合 | メールなし | 400 Bad Request、VALIDATION_ERROR | 低 |

### 1.3 アクセストークン検証

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| AUTH-201 | 有効なアクセストークンで保護されたエンドポイントにアクセスできる | 有効なトークン | 200 OK、リソースが取得できる | 高 |
| AUTH-202 | トークンなしで保護されたエンドポイントにアクセスする | トークンなし | 401 Unauthorized、AUTH_TOKEN_MISSING | 高 |
| AUTH-203 | 無効なトークンでアクセスする | 改ざんされたトークン | 401 Unauthorized、AUTH_TOKEN_INVALID | 高 |
| AUTH-204 | 期限切れトークンでアクセスする | 期限切れトークン | 401 Unauthorized、AUTH_TOKEN_EXPIRED | 中 |

### 1.4 認可（ロールベース）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| AUTH-301 | customerロールがadmin専用エンドポイントにアクセスできない | customerトークン、admin専用エンドポイント | 403 Forbidden、FORBIDDEN_ROLE | 高 |
| AUTH-302 | staffロールが予約編集エンドポイントにアクセスできない | staffトークン、PATCH /reservations/{id} | 403 Forbidden、FORBIDDEN_ROLE | 高 |
| AUTH-303 | customerが他ユーザーの予約詳細を取得できない | customerトークン、他ユーザーのreservation_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |
| AUTH-304 | adminが他スタジオのデータにアクセスできない | adminトークン、他studio_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |

---

## 2. ゲストユーザー（閲覧・予約）

### 2.1 カレンダー閲覧（UC-102）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-001 | ゲストユーザーがカレンダーを閲覧できる | studio_id、month | 200 OK、予約一覧とブロック枠が表示される | 高 |
| GUEST-002 | カレンダーに確定予約（confirmed）が表示される | confirmed予約が存在する月 | 予約が表示される（詳細は非表示） | 高 |
| GUEST-003 | カレンダーにブロック枠が表示される | ブロック枠が存在する月 | ブロック枠が表示される | 中 |
| GUEST-004 | 無効な月形式でリクエストする | 不正な月形式（例: "2025-13"） | 400 Bad Request、VALIDATION_ERROR | 低 |

### 2.2 プラン・オプション閲覧

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-101 | ゲストユーザーがプラン一覧を取得できる | studio_id | 200 OK、有効なプラン一覧が返される | 高 |
| GUEST-102 | ゲストユーザーがオプション一覧を取得できる | studio_id | 200 OK、有効なオプション一覧が返される | 高 |
| GUEST-103 | 無効化されたプランは表示されない | is_active=false のプラン | プラン一覧に含まれない | 中 |
| GUEST-104 | 無効化されたオプションは表示されない | is_active=false のオプション | オプション一覧に含まれない | 中 |

### 2.3 ゲスト予約作成（UC-103）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-201 | ゲストユーザーが本予約を作成できる | is_guest=true、ゲスト情報、reservation_type=regular | 201 Created、reservation_id、guest_token、確認メール送信 | 高 |
| GUEST-202 | ゲストユーザーが仮予約を作成できる | is_guest=true、ゲスト情報、reservation_type=tentative | 201 Created、reservation_id、guest_token、確認メール送信 | 高 |
| GUEST-203 | ゲストユーザーがロケハン予約を作成できる | is_guest=true、ゲスト情報、reservation_type=location_scout | 201 Created、reservation_id、guest_token、確認メール送信 | 中 |
| GUEST-204 | ゲスト予約確認メールが送信される | ゲスト予約作成 | メールにトークンリンクが含まれる | 高 |
| GUEST-205 | ゲスト情報が欠けている場合 | is_guest=true、guest_nameなし | 400 Bad Request、VALIDATION_ERROR | 中 |
| GUEST-206 | ゲストメールアドレスが無効な形式の場合 | 不正なメール形式 | 400 Bad Request、VALIDATION_ERROR | 中 |

### 2.4 ゲスト予約確認（トークンベース）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-301 | 有効なトークンでゲスト予約詳細を取得できる | 有効なguest_token | 200 OK、予約詳細が返される | 高 |
| GUEST-302 | 無効なトークンで予約詳細を取得しようとする | 存在しないトークン | 404 Not Found、RESERVATION_NOT_FOUND | 高 |
| GUEST-303 | トークン形式が不正な場合 | 不正なUUID形式 | 400 Bad Request、VALIDATION_ERROR | 低 |
| GUEST-304 | 会員予約のトークンでアクセスしようとする | is_guest=false の予約のトークン | 404 Not Found または 403 Forbidden | 中 |

### 2.5 ゲスト予約キャンセル（UC-105）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-401 | pending状態のゲスト予約をキャンセルできる | 有効なトークン、status=pending | 200 OK、status=cancelled、キャンセルメール送信 | 高 |
| GUEST-402 | confirmed状態のゲスト予約をキャンセルできる | 有効なトークン、status=confirmed | 200 OK、status=cancelled、キャンセルメール送信 | 高 |
| GUEST-403 | 既にキャンセル済みの予約を再度キャンセルしようとする | status=cancelled の予約 | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| GUEST-404 | 完了済みの予約をキャンセルしようとする | status=completed の予約 | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| GUEST-405 | キャンセル完了メールが送信される | ゲスト予約キャンセル | キャンセル完了メールが送信される | 高 |

### 2.6 ゲスト仮予約昇格（UC-106）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| GUEST-501 | tentative状態のゲスト予約を本予約に昇格できる | 有効なトークン、status=tentative | 200 OK、status=pending、promoted_from=tentative、昇格メール送信 | 高 |
| GUEST-502 | confirmed状態の予約を昇格しようとする | status=confirmed の予約 | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| GUEST-503 | pending状態の予約を昇格しようとする | status=pending の予約 | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| GUEST-504 | 昇格後はオーナーの承認待ち（pending）になる | 昇格後の予約 | status=pending、promoted_from=tentative | 高 |
| GUEST-505 | 昇格受付メールが送信される | ゲスト予約昇格 | 昇格受付メールが送信される | 高 |

---

## 3. 会員ユーザー（予約管理）

### 3.1 予約作成（UC-103）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| CUSTOMER-001 | 会員ユーザーが本予約を作成できる | 認証済み、reservation_type=regular | 201 Created、status=pending | 高 |
| CUSTOMER-002 | 会員ユーザーが仮予約を作成できる | 認証済み、reservation_type=tentative | 201 Created、status=pending | 高 |
| CUSTOMER-003 | 会員ユーザーがロケハン予約を作成できる | 認証済み、reservation_type=location_scout | 201 Created、status=pending | 中 |
| CUSTOMER-004 | 会員ユーザーが第2キープ予約を作成できる | 認証済み、reservation_type=second_keep、同時間帯にconfirmed予約あり | 201 Created、status=pending | 高 |
| CUSTOMER-005 | 同時間帯に既に確定予約がある場合、本予約が作成できない | 重複する日時 | 409 Conflict、RESERVATION_CONFLICT | 高 |
| CUSTOMER-006 | ブロック枠が設定されている日時に予約を作成できない | ブロック枠と重複 | 409 Conflict、BLOCKED_SLOT_CONFLICT | 高 |
| CUSTOMER-007 | 第2キープを作成する際、同時間帯に確定予約がない場合 | second_keep、重複予約なし | 409 Conflict、SECOND_KEEP_NO_PRIMARY | 高 |
| CUSTOMER-008 | 営業時間外の時刻で予約を作成しようとする | start_time="08:00"（営業時間前） | 400 Bad Request、VALIDATION_ERROR | 中 |
| CUSTOMER-009 | 過去の日付で予約を作成しようとする | date="2020-01-01" | 400 Bad Request、VALIDATION_ERROR | 中 |
| CUSTOMER-010 | end_timeがstart_timeより前の場合 | start_time="14:00", end_time="10:00" | 400 Bad Request、VALIDATION_ERROR | 中 |
| CUSTOMER-011 | 存在しないplan_idを指定する | 無効なplan_id | 404 Not Found、PLAN_NOT_FOUND | 中 |
| CUSTOMER-012 | 無効化されたプランを指定する | is_active=false のplan_id | 409 Conflict、PLAN_INACTIVE | 中 |
| CUSTOMER-013 | 存在しないoption_idを指定する | 無効なoption_id | 404 Not Found、OPTION_NOT_FOUND | 低 |
| CUSTOMER-014 | 無効化されたオプションを指定する | is_active=false のoption_id | 409 Conflict、OPTION_INACTIVE | 低 |
| CUSTOMER-015 | 料金スナップショットが正しく保存される | 予約作成 | plan_price、plan_tax_rate、option価格が予約時の値で保存される | 高 |

### 3.2 予約一覧取得（UC-104）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| CUSTOMER-101 | 自分の予約一覧を取得できる | GET /reservations/me | 200 OK、自分の予約のみ表示される | 高 |
| CUSTOMER-102 | ステータスでフィルタリングできる | status=confirmed | confirmedの予約のみ表示される | 中 |
| CUSTOMER-103 | 他ユーザーの予約が含まれない | 自分のトークン | 他ユーザーの予約が表示されない | 高 |

### 3.3 予約詳細取得（UC-104）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| CUSTOMER-201 | 自分の予約詳細を取得できる | 自分のreservation_id | 200 OK、予約詳細が返される | 高 |
| CUSTOMER-202 | 他ユーザーの予約詳細を取得しようとする | 他ユーザーのreservation_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |
| CUSTOMER-203 | 存在しないreservation_idを指定する | 無効なreservation_id | 404 Not Found、RESERVATION_NOT_FOUND | 中 |

### 3.4 予約キャンセル（UC-105）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| CUSTOMER-301 | pending状態の予約をキャンセルできる | status=pending | 200 OK、status=cancelled、cancelled_by=customer | 高 |
| CUSTOMER-302 | confirmed状態の予約をキャンセルできる | status=confirmed | 200 OK、status=cancelled、cancelled_by=customer | 高 |
| CUSTOMER-303 | tentative状態の予約をキャンセルできる | status=tentative | 200 OK、status=cancelled、cancelled_by=customer | 中 |
| CUSTOMER-304 | 既にキャンセル済みの予約を再度キャンセルしようとする | status=cancelled | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| CUSTOMER-305 | 完了済みの予約をキャンセルしようとする | status=completed | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| CUSTOMER-306 | 他ユーザーの予約をキャンセルしようとする | 他ユーザーのreservation_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |

### 3.5 仮予約昇格（UC-106）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| CUSTOMER-401 | tentative状態の予約を本予約に昇格できる | status=tentative | 200 OK、status=pending、promoted_from=tentative | 高 |
| CUSTOMER-402 | confirmed状態の予約を昇格しようとする | status=confirmed | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| CUSTOMER-403 | pending状態の予約を昇格しようとする | status=pending | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| CUSTOMER-404 | 昇格後はオーナーの承認待ち（pending）になる | 昇格後 | status=pending、reservation_type=regular | 高 |

---

## 4. 管理者（予約承認・管理）

### 4.1 予約一覧取得（UC-206）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-001 | 管理者が所属スタジオの予約一覧を取得できる | studio_id、start_date、end_date | 200 OK、期間内の全予約が返される | 高 |
| ADMIN-002 | ステータスでフィルタリングできる | status=pending | pendingの予約のみ表示される | 中 |
| ADMIN-003 | 他スタジオの予約一覧を取得しようとする | 他studio_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |
| ADMIN-004 | 日付範囲パラメータが不正な場合 | start_date > end_date | 400 Bad Request、VALIDATION_ERROR | 低 |

### 4.2 予約承認（UC-203）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-101 | pending状態の本予約を承認できる | reservation_type=regular、status=pending | 200 OK、status=confirmed | 高 |
| ADMIN-102 | pending状態の仮予約を承認できる | reservation_type=tentative、status=pending | 200 OK、status=tentative | 高 |
| ADMIN-103 | pending状態のロケハンを承認できる | reservation_type=location_scout、status=pending | 200 OK、status=scheduled | 中 |
| ADMIN-104 | pending状態の第2キープを承認できる | reservation_type=second_keep、status=pending | 200 OK、status=waitlisted | 高 |
| ADMIN-105 | confirmed状態の予約を承認しようとする | status=confirmed | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| ADMIN-106 | cancelled状態の予約を承認しようとする | status=cancelled | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |

### 4.3 予約拒否（UC-204）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-201 | pending状態の予約を拒否できる | status=pending、reason | 200 OK、status=cancelled、cancelled_by=owner | 高 |
| ADMIN-202 | 拒否理由が保存される | reason="設備メンテナンスのため" | reasonが保存される | 中 |
| ADMIN-203 | confirmed状態の予約を拒否しようとする | status=confirmed | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |

### 4.4 予約編集（UC-209）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-301 | confirmed状態の予約の日時を変更できる | date、start_time、end_time | 200 OK、日時が更新される | 高 |
| ADMIN-302 | 予約のnoteを更新できる | note | 200 OK、noteが更新される | 中 |
| ADMIN-303 | 日時変更時に重複チェックが行われる | 既存予約と重複する日時 | 409 Conflict、RESERVATION_CONFLICT | 高 |
| ADMIN-304 | cancelled状態の予約を編集しようとする | status=cancelled | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| ADMIN-305 | completed状態の予約を編集しようとする | status=completed | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |

### 4.5 予約キャンセル（管理者側、UC-208）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-401 | 管理者が確定予約をキャンセルできる | status=confirmed | 200 OK、status=cancelled、cancelled_by=owner | 高 |
| ADMIN-402 | 管理者がpending予約をキャンセルできる | status=pending | 200 OK、status=cancelled、cancelled_by=owner | 中 |

### 4.6 スタッフ登録（UC-201）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-501 | 管理者がスタッフユーザーを登録できる | studio_id、name、email、password、phone | 201 Created、role=staff | 高 |
| ADMIN-502 | スタッフ一覧を取得できる | studio_id | 200 OK、スタッフ一覧が返される | 中 |
| ADMIN-503 | 他スタジオのスタッフを登録しようとする | 他studio_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |

---

## 5. 管理者（プラン・オプション管理）

### 5.1 プラン管理（UC-211）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-601 | 管理者がプランを作成できる | studio_id、plan_name、price、tax_rate | 201 Created、is_active=true | 高 |
| ADMIN-602 | 管理者がプランを更新できる | price、description | 200 OK、プランが更新される | 中 |
| ADMIN-603 | 管理者がプランを無効化できる | is_active=false | 200 OK、is_active=false | 中 |
| ADMIN-604 | 無効化されたプランが公開プラン一覧に表示されない | is_active=false のプラン | GET /studios/{id}/plans に含まれない | 中 |
| ADMIN-605 | 他スタジオのプランを作成しようとする | 他studio_id | 403 Forbidden、FORBIDDEN_RESOURCE | 高 |

### 5.2 オプション管理（UC-211）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-701 | 管理者がオプションを作成できる | studio_id、option_name、price、tax_rate | 201 Created、is_active=true | 高 |
| ADMIN-702 | 管理者がオプションを更新できる | price、option_name | 200 OK、オプションが更新される | 中 |
| ADMIN-703 | 管理者がオプションを無効化できる | is_active=false | 200 OK、is_active=false | 中 |
| ADMIN-704 | 無効化されたオプションが公開オプション一覧に表示されない | is_active=false のオプション | GET /studios/{id}/options に含まれない | 中 |

---

## 6. 管理者（ブロック枠管理）

### 6.1 ブロック枠作成（UC-210）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-801 | 管理者が終日ブロック枠を作成できる | studio_id、date、is_all_day=true、reason | 201 Created、ブロック枠が作成される | 高 |
| ADMIN-802 | 管理者が時間帯指定ブロック枠を作成できる | is_all_day=false、start_time、end_time | 201 Created、ブロック枠が作成される | 高 |
| ADMIN-803 | ブロック枠が設定された日時に予約を作成しようとする | ブロック枠と重複 | 409 Conflict、BLOCKED_SLOT_CONFLICT | 高 |
| ADMIN-804 | is_all_day=falseの場合、start_time/end_timeが必須 | is_all_day=false、時刻なし | 400 Bad Request、VALIDATION_ERROR | 中 |

### 6.2 ブロック枠一覧取得・削除

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ADMIN-901 | 管理者がブロック枠一覧を取得できる | studio_id、start_date、end_date | 200 OK、ブロック枠一覧が返される | 中 |
| ADMIN-902 | 管理者がブロック枠を削除できる | blocked_slot_id | 204 No Content | 中 |
| ADMIN-903 | 他スタジオのブロック枠を削除しようとする | 他studio_idのblocked_slot_id | 403 Forbidden、FORBIDDEN_RESOURCE | 中 |

---

## 7. スタッフ（閲覧のみ）

### 7.1 予約閲覧（UC-301, UC-302）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| STAFF-001 | スタッフが所属スタジオの予約一覧を取得できる | studio_id、start_date、end_date | 200 OK、予約一覧が返される | 高 |
| STAFF-002 | スタッフが予約詳細を取得できる | reservation_id | 200 OK、予約詳細が返される | 中 |
| STAFF-003 | スタッフが予約を承認しようとする | reservation_id | 403 Forbidden、FORBIDDEN_ROLE | 高 |
| STAFF-004 | スタッフが予約を編集しようとする | reservation_id | 403 Forbidden、FORBIDDEN_ROLE | 高 |
| STAFF-005 | スタッフがプランを作成しようとする | studio_id、plan_name | 403 Forbidden、FORBIDDEN_ROLE | 中 |

---

## 8. 問い合わせ機能

### 8.1 問い合わせ作成（UC-107）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| INQUIRY-001 | 会員ユーザーが問い合わせを作成できる | studio_id、inquiry_title、inquiry_detail | 201 Created、inquiry_status=open | 高 |
| INQUIRY-002 | 問い合わせタイトルが必須 | inquiry_titleなし | 400 Bad Request、VALIDATION_ERROR | 中 |
| INQUIRY-003 | 問い合わせ詳細が2000文字以内 | inquiry_detail（2001文字） | 400 Bad Request、VALIDATION_ERROR | 低 |

### 8.2 問い合わせ一覧取得

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| INQUIRY-101 | 会員ユーザーが自分の問い合わせ一覧を取得できる | GET /inquiries/me | 200 OK、自分の問い合わせのみ表示 | 中 |
| INQUIRY-102 | 管理者が所属スタジオの問い合わせ一覧を取得できる | studio_id | 200 OK、全問い合わせが表示 | 高 |
| INQUIRY-103 | ステータスでフィルタリングできる | status=open | openの問い合わせのみ表示 | 中 |

### 8.3 問い合わせ回答（UC-213）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| INQUIRY-201 | 管理者が問い合わせに回答できる | inquiry_id、reply_detail | 200 OK、inquiry_status=replied | 高 |
| INQUIRY-202 | 回答後は再度回答できない | status=replied の問い合わせ | 409 Conflict、INVALID_STATUS_TRANSITION | 中 |
| INQUIRY-203 | 会員ユーザーが問い合わせに回答しようとする | customerトークン | 403 Forbidden、FORBIDDEN_ROLE | 高 |

---

## 9. バッチ処理・自動化

### 9.1 仮予約期限切れ処理（UC-906）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| BATCH-001 | 利用日7日前を過ぎた仮予約が自動でexpiredになる | tentative、expiry_date過ぎ | status=expired | 高 |
| BATCH-002 | 有効期限内の仮予約はexpiredにならない | tentative、expiry_date未到達 | status=tentative のまま | 高 |
| BATCH-003 | 本予約は期限切れ処理の対象外 | regular予約 | status変化なし | 中 |

### 9.2 第2キープ繰り上げ処理（UC-903）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| BATCH-101 | 第1候補がキャンセルされた時、第2キープがtentativeに繰り上がる | waitlisted予約、第1候補cancelled | status=tentative | 高 |
| BATCH-102 | 複数の第2キープがある場合、最初に作成されたものが繰り上がる | 複数のwaitlisted予約 | 最も古い予約がtentativeに | 中 |
| BATCH-103 | 繰り上げ通知メールが送信される | 第2キープ繰り上げ | メール送信 | 高 |

### 9.3 リマインド通知（UC-904）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| BATCH-201 | 利用日前日の予約にリマインドメールが送信される | confirmed予約、翌日利用 | リマインドメール送信 | 中 |
| BATCH-202 | キャンセル済み予約にはリマインドメールが送信されない | cancelled予約 | メール送信されない | 低 |

### 9.4 予約完了処理（UC-905）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| BATCH-301 | 利用日経過のconfirmed予約がcompletedになる | confirmed、利用日経過 | status=completed | 高 |
| BATCH-302 | ロケハン（scheduled）も完了処理される | scheduled、利用日経過 | status=completed | 中 |

---

## 10. エラーハンドリング

### 10.1 バリデーションエラー（400）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ERROR-001 | 必須フィールドが欠けている場合 | 必須フィールドなし | 400 Bad Request、VALIDATION_ERROR、detailsに該当フィールド | 高 |
| ERROR-002 | 日付形式が不正な場合 | date="2025/03/15" | 400 Bad Request、VALIDATION_ERROR | 中 |
| ERROR-003 | メールアドレス形式が不正な場合 | email="invalid-email" | 400 Bad Request、VALIDATION_ERROR | 中 |
| ERROR-004 | 複数のバリデーションエラーが同時に発生する場合 | 複数の不正フィールド | details配列に全エラーが含まれる | 中 |

### 10.2 リソース不在エラー（404）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ERROR-101 | 存在しない予約IDを指定する | 無効なreservation_id | 404 Not Found、RESERVATION_NOT_FOUND | 高 |
| ERROR-102 | 存在しないユーザーIDを指定する | 無効なuser_id | 404 Not Found、USER_NOT_FOUND | 中 |
| ERROR-103 | 存在しないスタジオIDを指定する | 無効なstudio_id | 404 Not Found、STUDIO_NOT_FOUND | 中 |

### 10.3 業務エラー（409）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ERROR-201 | 予約重複エラー | 既存予約と重複 | 409 Conflict、RESERVATION_CONFLICT | 高 |
| ERROR-202 | ブロック枠重複エラー | ブロック枠と重複 | 409 Conflict、BLOCKED_SLOT_CONFLICT | 高 |
| ERROR-203 | 状態遷移エラー | 不正な状態遷移 | 409 Conflict、INVALID_STATUS_TRANSITION | 高 |
| ERROR-204 | メールアドレス重複エラー | 既存メールアドレス | 409 Conflict、EMAIL_ALREADY_EXISTS | 高 |

### 10.4 サーバーエラー（500）

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| ERROR-301 | DynamoDB接続エラー | - | 500 Internal Server Error、INTERNAL_ERROR、CloudWatch Logsに詳細記録 | 高 |
| ERROR-302 | 予期しない例外 | - | 500 Internal Server Error、内部詳細は非表示 | 高 |

---

## 11. パフォーマンス・同時実行

### 11.1 同時予約作成

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| PERF-001 | 同時刻に複数ユーザーが同じ時間帯を予約しようとする | 同時リクエスト | 1つだけ成功、残りは409 Conflict | 高 |
| PERF-002 | 複数ユーザーが異なる時間帯を同時に予約する | 非重複時間帯 | 全て成功 | 中 |

### 11.2 レスポンスタイム

| テストID | テスト内容 | 入力データ | 期待結果 | 優先度 |
|---------|----------|----------|---------|--------|
| PERF-101 | カレンダー取得のレスポンスタイムが2秒以内 | GET /studios/{id}/calendar | レスポンスタイム < 2秒 | 中 |
| PERF-102 | 予約一覧取得のレスポンスタイムが2秒以内 | GET /reservations（100件） | レスポンスタイム < 2秒 | 中 |
| PERF-103 | 予約作成のレスポンスタイムが3秒以内 | POST /reservations | レスポンスタイム < 3秒 | 中 |

---

## テスト実行ガイドライン

### 前提条件

1. **テストデータ準備**
   - テスト用スタジオ（studio_001）が存在すること
   - テスト用ユーザー（customer, admin, staff各1名以上）が存在すること
   - テスト用プラン・オプションが存在すること

2. **環境設定**
   - dev環境のAPI Gatewayエンドポイント
   - DynamoDBテーブルが作成済み
   - Cognitoユーザープールが設定済み
   - SESメール送信元が検証済み

### テスト実行順序

1. **認証・認可テスト**（AUTH-xxx）
2. **ゲストユーザーテスト**（GUEST-xxx）
3. **会員ユーザーテスト**（CUSTOMER-xxx）
4. **管理者テスト**（ADMIN-xxx）
5. **スタッフテスト**（STAFF-xxx）
6. **問い合わせテスト**（INQUIRY-xxx）
7. **バッチ処理テスト**（BATCH-xxx）
8. **エラーハンドリングテスト**（ERROR-xxx）
9. **パフォーマンステスト**（PERF-xxx）

### テストツール推奨

- **APIテスト**: Postman、Newman、curl、Playwright
- **E2Eテスト**: Playwright、Cypress
- **負荷テスト**: k6、Locust
- **メール確認**: AWS SES Mailbox Simulator、Mailtrap

### 成功基準

- **クリティカル（高優先度）テスト**: 100% PASS必須
- **重要（中優先度）テスト**: 95% PASS目標
- **補助（低優先度）テスト**: 90% PASS目標

---

## テスト結果レポート形式

```markdown
### テスト実行結果

**実行日**: YYYY-MM-DD
**実行者**: [名前]
**環境**: dev
**総テスト数**: XXX
**PASS**: XXX
**FAIL**: XXX
**SKIP**: XXX

#### 失敗したテスト

| テストID | 失敗理由 | 対応状況 |
|---------|---------|---------|
| CUSTOMER-005 | 予約重複チェックが機能していない | 修正中 |

#### 補足事項

- メール送信テストは手動確認を実施
- バッチ処理テストは手動トリガーで実施
```

---

**作成日**: 2026-04-28
**最終更新日**: 2026-04-28
**バージョン**: 1.0
