# DynamoDB テーブル設計

## テーブル戦略

マルチテーブル設計を採用する。

**選定理由**
- シングルテーブル設計は設計難易度が高く、個人開発ではデバッグや変更に苦労するリスクが高い
- 今回のアクセスパターンでは複数エンティティを1クエリでまとめて取る必然性が薄い（フロントエンドから並列API呼び出しで対応可能）
- SaaS化を見据えるとエンティティごとにテーブルが分かれている方がスキーマ変更やマイグレーションがしやすい

## キャパシティモード

| 設定 | 値 | 備考 |
|------|-----|------|
| モード | オンデマンド | トラフィック予測不要、自動スケール |
| 見直し時期 | SaaS化後 | トラフィックが安定したらプロビジョンドを検討 |

## テーブル定義

### reservations テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | date#reservation_id | 利用日#予約ID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| reservation_id | string(UUID) | ○ | 予約ID |
| user_id | string | ○ | 予約者のユーザID |
| reservation_type | enum | ○ | regular / tentative / location_scout / second_keep |
| status | enum | ○ | pending / tentative / confirmed / waitlisted / scheduled / cancelled / expired / completed |
| plan_id | string | ○ | 料金プランID |
| plan_name | string | ○ | プラン名（予約時点のスナップショット） |
| plan_price | number | ○ | プラン料金・税抜（予約時点のスナップショット） |
| plan_tax_rate | number | ○ | プラン税率（予約時点のスナップショット） |
| date | string (YYYY-MM-DD) | ○ | 利用日 |
| start_time | string (HH:MM) | ○ | 開始時刻 |
| end_time | string (HH:MM) | ○ | 終了時刻 |
| note | string | - | 備考 |
| cancelled_by | enum | - | customer / owner（キャンセル時のみ） |
| cancelled_at | string (ISO8601) | - | キャンセル日時 |
| promoted_from | enum | - | tentative / waitlisted（昇格元の記録） |
| promoted_at | string (ISO8601) | - | 昇格日時 |
| linked_reservation_id | string | - | 第2キープ時の第1候補予約ID |
| expiry_date | string (YYYY-MM-DD) | - | 仮予約の有効期限日（予約作成時に算出して保存） |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |
| needs_protection | boolean | ○ | 養生の有無 |
| number_of_people | number | ○ | 撮影人数 |
| equipment_insurance | boolean | ○ | 機材保険の有無 |
| options | list\<map\> | - | 選択されたオプション（予約時点の料金スナップショット） |
| shooting_type | list\<string\> | ○ | 撮影内容（スチール、ムービー、楽器演奏など） |
| shooting_details | string | ○ | 撮影の詳細説明 |
| photographer_name | string | ○ | カメラマン氏名 |

#### GSI

##### GSI1: ステータス別取得
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id#status | スタジオID#ステータス |
| SK | date | 利用日 |

##### GSI2: ユーザ別取得
| キー | 値 | 説明 |
|------|-----|------|
| PK | user_id | ユーザID |
| SK | date#reservation_id | 利用日#予約ID |

##### GSI3: 予約ID検索
| キー | 値 | 説明 |
|------|-----|------|
| PK | reservation_id | 予約ID |

##### GSI4: 第2キープ検索
| キー | 値 | 説明 |
|------|-----|------|
| PK | linked_reservation_id | 第1候補の予約ID |

---

### users テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | user_id | ユーザID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | - | 所属スタジオID（admin/staffのみ） |
| user_id | string(UUID) | ○ | ユーザーID |
| name | string | ○ | 名前 |
| email | string | ○ | メールアドレス（ユニーク） |
| phone_number | string | ○ | 電話番号 |
| company_name | string | - | 会社名 |
| address | string | ○ | 住所 |
| role | enum | ○ | customer / admin / staff |
| created_at | string (ISO8601) | ○ | 登録日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI

##### GSI1: メールアドレス検索
| キー | 値 | 説明 |
|------|-----|------|
| PK | email | メールアドレス |

---

### plans テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | plan_id | プランID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| plan_id | string | ○ | 料金プランID |
| plan_name | string | ○ | 料金プラン名 |
| description | string | - | プランの説明 |
| price | number | ○ | 料金（税抜） |
| tax_rate | number | ○ | 税率（例: 0.10） |
| is_active | boolean | ○ | 有効/無効（削除せず非表示にする） |
| display_order | number | - | 予約フォームでの表示順 |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI
なし（メインキーでカバー可能）

---

### options テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | option_id | オプションID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| option_id | string(UUID) | ○ | オプションID |
| option_name | string | ○ | オプション名 |
| price | number | ○ | 料金（税抜） |
| tax_rate | number | ○ | 税率（例: 0.10） |
| is_active | boolean | ○ | 有効/無効（削除せず非表示にする） |
| display_order | number | - | 予約フォームでの表示順 |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI
なし（メインキーでカバー可能）

---

### blocked_slots テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | date#blocked_slot_id | 対象日#ブロック枠ID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| blocked_slot_id | string(UUID) | ○ | ブロック枠ID |
| date | string (YYYY-MM-DD) | ○ | 対象日 |
| is_all_day | boolean | ○ | 終日ブロックかどうか |
| start_time | string (HH:MM) | - | 開始時刻（is_all_day=falseの場合必須） |
| end_time | string (HH:MM) | - | 終了時刻（is_all_day=falseの場合必須） |
| reason | string | ○ | 理由 |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI
なし（メインキーでカバー可能）

---

### inquiries テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | inquiry_id | 問い合わせID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| inquiry_id | string(UUID) | ○ | 問い合わせID |
| user_id | string | ○ | 問い合わせ者のユーザID |
| inquiry_title | string | ○ | 質問の題名 |
| inquiry_detail | string | ○ | 質問の内容 |
| inquiry_status | enum | ○ | open / replied / closed |
| reply_detail | string | - | 回答内容（回答時に記入） |
| replied_at | string (ISO8601) | - | 回答日時 |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI

##### GSI1: ステータス別取得
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id#inquiry_status | スタジオID#ステータス |
| SK | created_at | 作成日時 |

##### GSI2: ユーザ別取得
| キー | 値 | 説明 |
|------|-----|------|
| PK | user_id | ユーザID |
| SK | created_at | 作成日時 |

---

### notifications テーブル

#### メインキー
| キー | 値 | 説明 |
|------|-----|------|
| PK | studio_id | スタジオID |
| SK | scheduled_at#notification_id | 送信予定日時#通知ID |

#### 属性
| フィールド | 型 | 必須 | 説明 |
|------------|---|------|------|
| studio_id | string | ○ | スタジオID |
| notification_id | string(UUID) | ○ | 通知ID |
| user_id | string | ○ | 通知先のユーザID |
| reservation_id | string | - | 関連する予約ID |
| notification_type | enum | ○ | reminder / tentative_expiry / promotion / cancellation |
| notification_detail | string | ○ | 通知内容 |
| status | enum | ○ | pending / sent / failed |
| scheduled_at | string (ISO8601) | ○ | 送信予定日時 |
| sent_at | string (ISO8601) | - | 実際の送信日時 |
| created_at | string (ISO8601) | ○ | 作成日時 |
| updated_at | string (ISO8601) | ○ | 更新日時 |

#### GSI
なし（メインキーでカバー可能）

---

## アクセスパターンマッピング

### reservations テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| AP-03 | 指定月の予約一覧取得 | メインテーブル | PK=studio_id, SK between "2025-03-01" and "2025-03-31" |
| AP-05 | 同一時間帯の予約存在チェック | メインテーブル | PK=studio_id, SK begins_with("2025-03-15") → アプリ側で時間帯フィルタ |
| AP-09 | 自分の予約一覧取得 | GSI2 | PK=user_id |
| AP-10 | 予約IDで1件取得 | GSI3 | PK=reservation_id |
| AP-18 | pending予約一覧取得 | GSI1 | PK=studio_id#pending |
| AP-24 | 日付範囲で予約一覧取得 | メインテーブル | PK=studio_id, SK between ... |
| AP-25 | 予約IDで詳細取得 | GSI3 | PK=reservation_id |
| AP-38 | 日付範囲で予約一覧取得（スタッフ） | メインテーブル | PK=studio_id, SK between ... |
| AP-39 | 予約IDで詳細取得（スタッフ） | GSI3 | PK=reservation_id |
| AP-40 | 期限3日前の仮予約取得 | GSI1 | PK=studio_id#tentative, SK=期限日 |
| AP-42 | 第2キープ取得 | GSI4 | PK=linked_reservation_id |
| AP-44 | 翌日の確定予約取得 | GSI1 | PK=studio_id#confirmed, SK="2025-03-16" |
| AP-46 | 利用日経過の予約取得 | GSI1 | PK=studio_id#confirmed, SK < "2025-03-15" |
| AP-48 | 期限切れの仮予約取得 | GSI1 | PK=studio_id#tentative, SK < 期限日 |

### users テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| AP-02 | メールアドレス重複チェック | GSI1 | PK=email |
| AP-26 | 予約者情報取得 | メインテーブル | PK=user_id |

### plans テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| AP-32 | プラン一覧取得 | メインテーブル | PK=studio_id → アプリ側でis_activeフィルタ |
| AP-50 | 有効なプラン一覧取得 | メインテーブル | PK=studio_id → アプリ側でis_active=trueフィルタ |

### options テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| - | オプション一覧取得 | メインテーブル | PK=studio_id → アプリ側でis_activeフィルタ |
| - | オプション作成/更新/無効化 | メインテーブル | PK=studio_id, SK=option_id |

### blocked_slots テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| AP-04 | 指定月のブロック枠一覧取得 | メインテーブル | PK=studio_id, SK between ... |
| AP-06 | ブロック枠存在チェック | メインテーブル | PK=studio_id, SK begins_with("2025-03-15") |
| AP-30 | ブロック枠一覧取得 | メインテーブル | PK=studio_id, SK between ... |

### inquiries テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| AP-15 | 自分の問い合わせ一覧取得 | GSI2 | PK=user_id |
| AP-36 | 未回答の問い合わせ一覧取得 | GSI1 | PK=studio_id#open |

### notifications テーブル

| AP# | 操作 | テーブル/GSI | キー条件 |
|-----|------|------------|---------|
| - | 送信予定の通知取得 | メインテーブル | PK=studio_id, SK between ... |

## 補足事項

- **AP-34（通知対象ユーザ一覧取得）**: reservationsテーブルからstudio_idで検索してuser_idを収集し、重複排除する。頻度が低いためアプリ側で処理する。
- **expiry_date**: 仮予約の有効期限日。予約作成時に `date - tentative_expiry_days`（Studioテーブルから取得）で算出し保存する。これによりGSI1でのバッチ処理時に期限日で直接検索可能となる。
- **reservations.options**: 予約時点のオプション名・料金をスナップショットとして `list<map>` で保存する。マスター（optionsテーブル）の料金を後から変更しても、過去の予約データには影響しない。
- **reservations.plan_name / plan_price / plan_tax_rate**: optionsと同様に、予約時点のプラン情報をスナップショットとして保存する。plan_idはマスターへの参照用に残す。