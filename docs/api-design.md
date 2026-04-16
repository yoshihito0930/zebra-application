# API設計

## エンドポイント一覧

### 認証
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| POST | /auth/signup | ユーザ登録 | UC-101 | 不要 | - |
| POST | /auth/login | ログイン | - | 不要 | - |

### 予約
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| POST | /reservations | 予約を作成する（会員/ゲスト両対応） | UC-103/202 | オプショナル | customer, admin, guest |
| GET | /reservations/{id} | 予約詳細を取得する | UC-104/207 | 要 | customer, admin, staff |
| GET | /reservations/me | 自分の予約一覧を取得する | UC-104 | 要 | customer |
| GET | /reservations | 予約一覧を取得する（日付範囲） | UC-206/301 | 要 | admin, staff |
| PATCH | /reservations/{id} | 予約内容を編集する | UC-209 | 要 | admin |
| PATCH | /reservations/{id}/cancel | 予約をキャンセルする | UC-105/208 | 要 | customer, admin |
| PATCH | /reservations/{id}/approve | 予約を承認する | UC-203 | 要 | admin |
| PATCH | /reservations/{id}/reject | 予約を拒否する | UC-204 | 要 | admin |
| PATCH | /reservations/{id}/promote | 仮予約を本予約に切り替える | UC-106/205 | 要 | customer, admin |

### ゲスト予約（トークンベース認証）
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| GET | /reservations/guest/{token} | ゲスト予約詳細を取得する | - | 不要 | guest |
| PATCH | /reservations/guest/{token}/cancel | ゲスト予約をキャンセルする | - | 不要 | guest |
| PATCH | /reservations/guest/{token}/promote | ゲスト仮予約を本予約に切り替える | - | 不要 | guest |

### カレンダー
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| GET | /studios/{id}/calendar | 予約状況を取得する（カレンダー表示用） | UC-102 | 不要 | - |

### ブロック枠
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| POST | /blocked-slots | ブロック枠を作成する | UC-210 | 要 | admin |
| GET | /blocked-slots | ブロック枠一覧を取得する | UC-210 | 要 | admin |
| DELETE | /blocked-slots/{id} | ブロック枠を削除する | UC-210 | 要 | admin |

### プラン
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| GET | /studios/{id}/plans | 有効なプラン一覧を取得する | UC-103 | 不要 | - |
| POST | /plans | プランを作成する | UC-211 | 要 | admin |
| PATCH | /plans/{id} | プランを更新する | UC-211 | 要 | admin |

### オプション
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| GET | /studios/{id}/options | 有効なオプション一覧を取得する | UC-103 | 不要 | - |
| POST | /options | オプションを作成する | UC-211 | 要 | admin |
| PATCH | /options/{id} | オプションを更新する | UC-211 | 要 | admin |

### 問い合わせ
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| POST | /inquiries | 問い合わせを作成する | UC-107 | 要 | customer |
| GET | /inquiries/me | 自分の問い合わせ一覧を取得する | UC-107 | 要 | customer |
| GET | /inquiries | 問い合わせ一覧を取得する（管理用） | UC-213 | 要 | admin |
| PATCH | /inquiries/{id}/reply | 問い合わせに回答する | UC-213 | 要 | admin |

### ユーザ
| メソッド | パス | 説明 | UC | 認証 | ロール |
|---------|------|------|----|------|--------|
| GET | /users/me | 自分のプロフィールを取得する | - | 要 | customer, admin, staff |
| PATCH | /users/me | 自分のプロフィールを更新する | - | 要 | customer, admin, staff |
| GET | /users/{id} | ユーザ詳細を取得する | UC-207 | 要 | admin |
| GET | /users | ユーザ一覧を取得する（管理用） | - | 要 | admin |
| POST | /staff | スタッフユーザを登録する | UC-201 | 要 | admin |
| GET | /staff | スタッフ一覧を取得する | UC-201 | 要 | admin |

---

## リクエスト/レスポンス定義

### 認証

#### POST /auth/signup
ユーザ登録

リクエスト:
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "xxxxxxxx",
  "phone_number": "090-1234-5678",
  "company_name": "株式会社サンプル",
  "address": "東京都渋谷区..."
}
```

レスポンス (201):
```json
{
  "user_id": "usr_001",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "role": "customer",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### POST /auth/login
ログイン

リクエスト:
```json
{
  "email": "yamada@example.com",
  "password": "xxxxxxxx"
}
```

レスポンス (200):
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 3600,
  "user": {
    "user_id": "usr_001",
    "name": "山田太郎",
    "role": "customer"
  }
}
```

### 予約

#### POST /reservations
予約を作成する

**認証**: オプショナル（会員予約の場合は要、ゲスト予約の場合は不要）

**ゲスト予約対応** (2026-04-16実装完了):
- ユーザー登録なしでも予約作成が可能
- ゲスト予約の場合は `is_guest: true` とゲスト情報を含める
- 予約確認用トークンがメールで送信される

##### 会員予約の場合

リクエスト:
```json
{
  "studio_id": "studio_001",
  "reservation_type": "regular",
  "plan_id": "plan_001",
  "date": "2025-03-15",
  "start_time": "10:00",
  "end_time": "13:00",
  "options": ["opt_001", "opt_002"],
  "shooting_type": ["stills", "video"],
  "shooting_details": "商品撮影、モデル2名",
  "photographer_name": "佐藤次郎",
  "number_of_people": 5,
  "needs_protection": false,
  "equipment_insurance": true,
  "note": "大型機材を持ち込みます"
}
```

##### ゲスト予約の場合

リクエスト:
```json
{
  "studio_id": "studio_001",
  "is_guest": true,
  "guest_name": "山田太郎",
  "guest_email": "guest@example.com",
  "guest_phone": "090-1234-5678",
  "guest_company": "株式会社サンプル",
  "reservation_type": "regular",
  "plan_id": "plan_001",
  "date": "2025-03-15",
  "start_time": "10:00",
  "end_time": "13:00",
  "options": ["opt_001", "opt_002"],
  "shooting_type": ["stills", "video"],
  "shooting_details": "商品撮影、モデル2名",
  "photographer_name": "佐藤次郎",
  "number_of_people": 5,
  "needs_protection": false,
  "equipment_insurance": true,
  "note": "大型機材を持ち込みます"
}
```

レスポンス (201):
```json
{
  "reservation_id": "rsv_001",
  "studio_id": "studio_001",
  "reservation_type": "regular",
  "status": "pending",
  "plan_id": "plan_001",
  "plan_name": "スチール撮影プラン",
  "plan_price": 15000,
  "plan_tax_rate": 0.10,
  "date": "2025-03-15",
  "start_time": "10:00",
  "end_time": "13:00",
  "options": [
    {
      "option_id": "opt_001",
      "option_name": "6人以上のワークショップでご利用",
      "price": 2000,
      "tax_rate": 0.10
    }
  ],
  "shooting_type": ["stills", "video"],
  "shooting_details": "商品撮影、モデル2名",
  "photographer_name": "佐藤次郎",
  "number_of_people": 5,
  "needs_protection": false,
  "equipment_insurance": true,
  "note": "大型機材を持ち込みます",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### GET /reservations/{id}
予約詳細を取得する

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "studio_id": "studio_001",
  "user_id": "usr_001",
  "reservation_type": "regular",
  "status": "confirmed",
  "plan_id": "plan_001",
  "plan_name": "スチール撮影プラン",
  "plan_price": 15000,
  "plan_tax_rate": 0.10,
  "date": "2025-03-15",
  "start_time": "10:00",
  "end_time": "13:00",
  "options": [
    {
      "option_id": "opt_001",
      "option_name": "6人以上のワークショップでご利用",
      "price": 2000,
      "tax_rate": 0.10
    }
  ],
  "shooting_type": ["stills", "video"],
  "shooting_details": "商品撮影、モデル2名",
  "photographer_name": "佐藤次郎",
  "number_of_people": 5,
  "needs_protection": false,
  "equipment_insurance": true,
  "note": "大型機材を持ち込みます",
  "cancelled_by": null,
  "cancelled_at": null,
  "promoted_from": null,
  "promoted_at": null,
  "linked_reservation_id": null,
  "expiry_date": null,
  "created_at": "2025-03-10T14:30:00+09:00",
  "updated_at": "2025-03-10T15:00:00+09:00"
}
```

#### GET /reservations/me
自分の予約一覧を取得する

クエリパラメータ:
- status (任意): pending / confirmed / cancelled 等でフィルタ

レスポンス (200):
```json
{
  "reservations": [
    {
      "reservation_id": "rsv_001",
      "studio_id": "studio_001",
      "reservation_type": "regular",
      "status": "confirmed",
      "plan_id": "plan_001",
      "plan_name": "スチール撮影プラン",
      "plan_price": 15000,
      "plan_tax_rate": 0.10,
      "date": "2025-03-15",
      "start_time": "10:00",
      "end_time": "13:00",
      "options": [
        {
          "option_id": "opt_001",
          "option_name": "6人以上のワークショップでご利用",
          "price": 2000,
          "tax_rate": 0.10
        }
      ],
      "shooting_type": ["stills", "video"],
      "shooting_details": "商品撮影、モデル2名",
      "photographer_name": "佐藤次郎",
      "number_of_people": 5,
      "needs_protection": false,
      "equipment_insurance": true,
      "note": "大型機材を持ち込みます",
      "cancelled_by": null,
      "cancelled_at": null,
      "promoted_from": null,
      "promoted_at": null,
      "expiry_date": null,
      "created_at": "2025-03-10T14:30:00+09:00",
      "updated_at": "2025-03-10T15:00:00+09:00"
    }
  ]
}
```

#### GET /reservations
予約一覧を取得する（管理用）

クエリパラメータ:
- studio_id (必須)
- start_date (必須): 取得開始日
- end_date (必須): 取得終了日
- status (任意): ステータスフィルタ

レスポンス (200):
```json
{
  "reservations": [
    {
      "reservation_id": "rsv_001",
      "user_id": "usr_001",
      "reservation_type": "regular",
      "status": "confirmed",
      "plan_name": "スチール撮影プラン",
      "date": "2025-03-15",
      "start_time": "10:00",
      "end_time": "13:00",
      "photographer_name": "佐藤次郎",
      "number_of_people": 5
    }
  ]
}
```

#### PATCH /reservations/{id}
予約内容を編集する

リクエスト:
```json
{
  "date": "2025-03-16",
  "start_time": "14:00",
  "end_time": "17:00",
  "note": "日程変更しました"
}
```

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "status": "confirmed",
  "date": "2025-03-16",
  "start_time": "14:00",
  "end_time": "17:00",
  "updated_at": "2025-03-11T10:00:00+09:00"
}
```

#### PATCH /reservations/{id}/cancel
予約をキャンセルする

リクエスト: なし（cancelled_byはトークンのロールから自動判定）

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "status": "cancelled",
  "cancelled_by": "customer",
  "cancelled_at": "2025-03-11T10:00:00+09:00"
}
```

#### PATCH /reservations/{id}/approve
予約を承認する

リクエスト: なし

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "reservation_type": "regular",
  "status": "confirmed"
}
```

#### PATCH /reservations/{id}/reject
予約を拒否する

リクエスト:
```json
{
  "reason": "設備メンテナンスのため"
}
```

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "status": "cancelled",
  "cancelled_by": "owner",
  "cancelled_at": "2025-03-11T10:00:00+09:00"
}
```

#### PATCH /reservations/{id}/promote
仮予約を本予約に切り替える

リクエスト: なし

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "status": "pending",
  "promoted_from": "tentative",
  "promoted_at": "2025-03-11T10:00:00+09:00"
}
```

### カレンダー

#### GET /studios/{id}/calendar
予約状況を取得する（カレンダー表示用）

クエリパラメータ:
- month (必須): 対象月 (YYYY-MM)

レスポンス (200):
```json
{
  "reservations": [
    {
      "reservation_id": "rsv_001",
      "reservation_type": "regular",
      "status": "confirmed",
      "date": "2025-03-15",
      "start_time": "10:00",
      "end_time": "13:00"
    }
  ],
  "blocked_slots": [
    {
      "blocked_slot_id": "blk_001",
      "date": "2025-03-20",
      "is_all_day": true,
      "reason": "定休日"
    }
  ]
}
```

### ブロック枠

#### POST /blocked-slots
ブロック枠を作成する

リクエスト:
```json
{
  "studio_id": "studio_001",
  "date": "2025-03-20",
  "is_all_day": false,
  "start_time": "10:00",
  "end_time": "13:00",
  "reason": "設備メンテナンス"
}
```

レスポンス (201):
```json
{
  "blocked_slot_id": "blk_001",
  "studio_id": "studio_001",
  "date": "2025-03-20",
  "is_all_day": false,
  "start_time": "10:00",
  "end_time": "13:00",
  "reason": "設備メンテナンス",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### GET /blocked-slots
ブロック枠一覧を取得する

クエリパラメータ:
- studio_id (必須)
- start_date (必須)
- end_date (必須)

レスポンス (200):
```json
{
  "blocked_slots": [
    {
      "blocked_slot_id": "blk_001",
      "date": "2025-03-20",
      "is_all_day": false,
      "start_time": "10:00",
      "end_time": "13:00",
      "reason": "設備メンテナンス"
    }
  ]
}
```

#### DELETE /blocked-slots/{id}
ブロック枠を削除する

レスポンス (204): ボディなし

### プラン

#### GET /studios/{id}/plans
有効なプラン一覧を取得する

レスポンス (200):
```json
{
  "plans": [
    {
      "plan_id": "plan_001",
      "plan_name": "スチール撮影プラン",
      "description": "スチール撮影向けのプラン",
      "price": 15000,
      "tax_rate": 0.10,
      "display_order": 1
    }
  ]
}
```

#### POST /plans
プランを作成する

リクエスト:
```json
{
  "studio_id": "studio_001",
  "plan_name": "スチール撮影プラン",
  "description": "スチール撮影向けのプラン",
  "price": 15000,
  "tax_rate": 0.10,
  "display_order": 1
}
```

レスポンス (201):
```json
{
  "plan_id": "plan_001",
  "studio_id": "studio_001",
  "plan_name": "スチール撮影プラン",
  "is_active": true,
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### PATCH /plans/{id}
プランを更新する

リクエスト:
```json
{
  "price": 18000,
  "is_active": false
}
```

レスポンス (200):
```json
{
  "plan_id": "plan_001",
  "price": 18000,
  "is_active": false,
  "updated_at": "2025-03-11T10:00:00+09:00"
}
```

### オプション

#### GET /studios/{id}/options
有効なオプション一覧を取得する

レスポンス (200):
```json
{
  "options": [
    {
      "option_id": "opt_001",
      "option_name": "6人以上のワークショップでご利用",
      "price": 2000,
      "tax_rate": 0.10,
      "display_order": 1
    }
  ]
}
```

#### POST /options
オプションを作成する

リクエスト:
```json
{
  "studio_id": "studio_001",
  "option_name": "6人以上のワークショップでご利用",
  "price": 2000,
  "tax_rate": 0.10,
  "display_order": 1
}
```

レスポンス (201):
```json
{
  "option_id": "opt_001",
  "studio_id": "studio_001",
  "option_name": "6人以上のワークショップでご利用",
  "is_active": true,
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### PATCH /options/{id}
オプションを更新する

リクエスト:
```json
{
  "price": 3000,
  "is_active": false
}
```

レスポンス (200):
```json
{
  "option_id": "opt_001",
  "price": 3000,
  "is_active": false,
  "updated_at": "2025-03-11T10:00:00+09:00"
}
```

### 問い合わせ

#### POST /inquiries
問い合わせを作成する

リクエスト:
```json
{
  "studio_id": "studio_001",
  "inquiry_title": "機材の持ち込みについて",
  "inquiry_detail": "大型のライティング機材を持ち込みたいのですが、搬入口の大きさを教えてください。"
}
```

レスポンス (201):
```json
{
  "inquiry_id": "inq_001",
  "studio_id": "studio_001",
  "inquiry_title": "機材の持ち込みについて",
  "inquiry_status": "open",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### GET /inquiries/me
自分の問い合わせ一覧を取得する

レスポンス (200):
```json
{
  "inquiries": [
    {
      "inquiry_id": "inq_001",
      "inquiry_title": "機材の持ち込みについて",
      "inquiry_status": "replied",
      "created_at": "2025-03-10T14:30:00+09:00"
    }
  ]
}
```

#### GET /inquiries
問い合わせ一覧を取得する（管理用）

クエリパラメータ:
- studio_id (必須)
- status (任意): open / replied / closed

レスポンス (200):
```json
{
  "inquiries": [
    {
      "inquiry_id": "inq_001",
      "user_id": "usr_001",
      "inquiry_title": "機材の持ち込みについて",
      "inquiry_status": "open",
      "created_at": "2025-03-10T14:30:00+09:00"
    }
  ]
}
```

#### PATCH /inquiries/{id}/reply
問い合わせに回答する

リクエスト:
```json
{
  "reply_detail": "搬入口は幅2m x 高さ2.5mです。大型機材でも問題ありません。"
}
```

レスポンス (200):
```json
{
  "inquiry_id": "inq_001",
  "inquiry_status": "replied",
  "reply_detail": "搬入口は幅2m x 高さ2.5mです。大型機材でも問題ありません。",
  "replied_at": "2025-03-11T10:00:00+09:00"
}
```

### ユーザ

#### GET /users/me
自分のプロフィールを取得する

レスポンス (200):
```json
{
  "user_id": "usr_001",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "phone_number": "090-1234-5678",
  "company_name": "株式会社サンプル",
  "address": "東京都渋谷区...",
  "role": "customer",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### PATCH /users/me
自分のプロフィールを更新する

リクエスト:
```json
{
  "phone_number": "080-9876-5432",
  "address": "東京都港区..."
}
```

レスポンス (200):
```json
{
  "user_id": "usr_001",
  "phone_number": "080-9876-5432",
  "address": "東京都港区...",
  "updated_at": "2025-03-11T10:00:00+09:00"
}
```

#### GET /users/{id}
ユーザ詳細を取得する

レスポンス: GET /users/me と同じ構造

#### GET /users
ユーザ一覧を取得する（管理用）

クエリパラメータ:
- studio_id (必須)
- role (任意): customer / admin / staff

レスポンス (200):
```json
{
  "users": [
    {
      "user_id": "usr_001",
      "name": "山田太郎",
      "email": "yamada@example.com",
      "phone_number": "090-1234-5678",
      "role": "customer"
    }
  ]
}
```

#### POST /staff
スタッフユーザを登録する

リクエスト:
```json
{
  "studio_id": "studio_001",
  "name": "鈴木花子",
  "email": "suzuki@example.com",
  "password": "xxxxxxxx",
  "phone_number": "090-1111-2222"
}
```

レスポンス (201):
```json
{
  "user_id": "usr_002",
  "name": "鈴木花子",
  "role": "staff",
  "created_at": "2025-03-10T14:30:00+09:00"
}
```

#### GET /staff
スタッフ一覧を取得する

クエリパラメータ:
- studio_id (必須)

レスポンス (200):
```json
{
  "staff": [
    {
      "user_id": "usr_002",
      "name": "鈴木花子",
      "email": "suzuki@example.com",
      "phone_number": "090-1111-2222",
      "role": "staff"
    }
  ]
}
```

---

## 認証・認可

### 認証方式

Cognitoを使用したトークンベース認証。
ログイン時に発行されるアクセストークンをリクエストヘッダに含める。

```
Authorization: Bearer <access_token>
```

### ロール定義
| ロール | 説明 |
|--------|------|
| customer | スタジオ利用者。自分の予約・問い合わせのみ操作可能 |
| admin | スタジオ管理者。所属スタジオの全データを操作可能 |
| staff | スタジオスタッフ。所属スタジオの予約データを閲覧のみ可能 |

### エンドポイント別 認証・認可マトリクス

| エンドポイント | 認証 | customer | admin | staff |
|---------------|------|----------|-------|-------|
| POST /auth/signup | 不要 | - | - | - |
| POST /auth/login | 不要 | - | - | - |
| GET /studios/{id}/calendar | 不要 | - | - | - |
| GET /studios/{id}/plans | 不要 | - | - | - |
| GET /studios/{id}/options | 不要 | - | - | - |
| POST /reservations | 要 | ○ | ○ | × |
| GET /reservations/me | 要 | ○ | × | × |
| GET /reservations/{id} | 要 | ○※1 | ○ | ○ |
| GET /reservations | 要 | × | ○ | ○ |
| PATCH /reservations/{id} | 要 | × | ○ | × |
| PATCH /reservations/{id}/cancel | 要 | ○※1 | ○ | × |
| PATCH /reservations/{id}/approve | 要 | × | ○ | × |
| PATCH /reservations/{id}/reject | 要 | × | ○ | × |
| PATCH /reservations/{id}/promote | 要 | ○※1 | ○ | × |
| POST /blocked-slots | 要 | × | ○ | × |
| GET /blocked-slots | 要 | × | ○ | × |
| DELETE /blocked-slots/{id} | 要 | × | ○ | × |
| POST /plans | 要 | × | ○ | × |
| PATCH /plans/{id} | 要 | × | ○ | × |
| POST /options | 要 | × | ○ | × |
| PATCH /options/{id} | 要 | × | ○ | × |
| POST /inquiries | 要 | ○ | × | × |
| GET /inquiries/me | 要 | ○ | × | × |
| GET /inquiries | 要 | × | ○ | × |
| PATCH /inquiries/{id}/reply | 要 | × | ○ | × |
| GET /users/me | 要 | ○ | ○ | ○ |
| PATCH /users/me | 要 | ○ | ○ | ○ |
| GET /users/{id} | 要 | × | ○ | × |
| GET /users | 要 | × | ○ | × |
| POST /staff | 要 | × | ○ | × |
| GET /staff | 要 | × | ○ | × |

### 補足ルール

※1 customerは自分の予約のみ操作可能。リクエストのトークンから取得したuser_idと予約のuser_idが一致することをバックエンド側で検証する。

### スタジオスコープの制御

admin/staffは所属スタジオのデータのみアクセス可能。トークンに含まれるstudio_idとリクエスト対象のstudio_idが一致することをバックエンド側で検証する。

---

## バリデーションルール

### POST /auth/signup
| フィールド | ルール |
|-----------|--------|
| name | 必須、1〜50文字 |
| email | 必須、メールアドレス形式、重複不可 |
| password | 必須、8文字以上、英数字記号を含む |
| phone_number | 必須、電話番号形式 |
| company_name | 任意、100文字以内 |
| address | 必須、200文字以内 |

### POST /reservations
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| reservation_type | 必須、regular / tentative / location_scout / second_keep のいずれか |
| plan_id | 必須、存在する有効なプランであること |
| date | 必須、YYYY-MM-DD形式、今日以降の日付であること |
| start_time | 必須、HH:MM形式、営業時間内であること |
| end_time | 必須、HH:MM形式、start_timeより後であること、営業時間内であること |
| options | 任意、存在する有効なオプションIDのリスト |
| shooting_type | 必須、1つ以上選択、stills / video / music のいずれか |
| shooting_details | 必須、1〜500文字 |
| photographer_name | 必須、1〜50文字 |
| number_of_people | 必須、1以上の整数 |
| needs_protection | 必須、boolean |
| equipment_insurance | 必須、boolean |
| note | 任意、500文字以内 |

#### 業務バリデーション
| ルール | 説明 |
|--------|------|
| 予約重複チェック | 同一時間帯にconfirmed/tentative/scheduledの予約が存在しないこと |
| ブロック枠チェック | 指定日時にブロック枠が存在しないこと |
| 第2キープの前提 | reservation_type=second_keepの場合、同一時間帯にconfirmed/tentativeの予約が存在すること |
| 定休日チェック | 指定日がスタジオの定休日でないこと |

### PATCH /reservations/{id}
| フィールド | ルール |
|-----------|--------|
| date | 任意、YYYY-MM-DD形式、今日以降の日付であること |
| start_time | 任意、HH:MM形式、営業時間内であること |
| end_time | 任意、HH:MM形式、start_timeより後であること |
| note | 任意、500文字以内 |
| shooting_details | 任意、1〜500文字 |

#### 業務バリデーション
| ルール | 説明 |
|--------|------|
| 編集可能ステータス | pending / tentative / confirmed のみ編集可能。cancelled / expired / completed は不可 |
| 日時変更時の重複チェック | 日時を変更する場合、POST /reservationsと同様の重複チェックを実施 |

### PATCH /reservations/{id}/cancel
| ルール | 説明 |
|--------|------|
| キャンセル可能ステータス | pending / tentative / confirmed / waitlisted / scheduled のみ。cancelled / expired / completed は不可 |

### PATCH /reservations/{id}/approve
| ルール | 説明 |
|--------|------|
| 承認可能ステータス | pendingのみ |

### PATCH /reservations/{id}/reject
| フィールド | ルール |
|-----------|--------|
| reason | 任意、500文字以内 |

| ルール | 説明 |
|--------|------|
| 拒否可能ステータス | pendingのみ |

### PATCH /reservations/{id}/promote
| ルール | 説明 |
|--------|------|
| 昇格可能ステータス | tentativeのみ |
| 昇格後の状態 | statusがpendingに変わり、オーナーの承認待ちになる |

### POST /blocked-slots
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| date | 必須、YYYY-MM-DD形式、今日以降の日付であること |
| is_all_day | 必須、boolean |
| start_time | is_all_day=falseの場合必須、HH:MM形式、営業時間内 |
| end_time | is_all_day=falseの場合必須、HH:MM形式、start_timeより後 |
| reason | 必須、1〜200文字 |

### POST /plans
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| plan_name | 必須、1〜100文字 |
| description | 任意、500文字以内 |
| price | 必須、0以上の整数 |
| tax_rate | 必須、0〜1の小数（例: 0.10） |
| display_order | 任意、0以上の整数 |

### POST /options
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| option_name | 必須、1〜100文字 |
| price | 必須、0以上の整数 |
| tax_rate | 必須、0〜1の小数 |
| display_order | 任意、0以上の整数 |

### POST /inquiries
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| inquiry_title | 必須、1〜100文字 |
| inquiry_detail | 必須、1〜2000文字 |

### PATCH /inquiries/{id}/reply
| フィールド | ルール |
|-----------|--------|
| reply_detail | 必須、1〜2000文字 |

| ルール | 説明 |
|--------|------|
| 回答可能ステータス | openのみ。replied / closed は不可 |

### POST /staff
| フィールド | ルール |
|-----------|--------|
| studio_id | 必須、存在するスタジオであること |
| name | 必須、1〜50文字 |
| email | 必須、メールアドレス形式、重複不可 |
| password | 必須、8文字以上、英数字記号を含む |
| phone_number | 必須、電話番号形式 |

### PATCH /users/me
| フィールド | ルール |
|-----------|--------|
| name | 任意、1〜50文字 |
| phone_number | 任意、電話番号形式 |
| company_name | 任意、100文字以内 |
| address | 任意、200文字以内 |

※ email、role の変更は不可

---

## エラー定義

### 共通エラーレスポンス形式

```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "指定の日時は既に予約済みです"
  }
}
```

### HTTPステータスコード

| ステータス | 意味 | 使用場面 |
|-----------|------|---------|
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 未認証（トークンなし・期限切れ） |
| 403 | Forbidden | 認可エラー（権限なし） |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | 業務ロジック上の競合 |
| 500 | Internal Server Error | サーバー内部エラー |

### バリデーションエラー（400）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      {
        "field": "date",
        "message": "今日以降の日付を指定してください"
      },
      {
        "field": "start_time",
        "message": "営業時間内の時刻を指定してください"
      }
    ]
  }
}
```

### 認証エラー（401）

| コード | メッセージ | 発生条件 |
|--------|----------|---------|
| AUTH_TOKEN_MISSING | 認証トークンが必要です | Authorizationヘッダなし |
| AUTH_TOKEN_EXPIRED | 認証トークンの有効期限が切れています | トークン期限切れ |
| AUTH_TOKEN_INVALID | 認証トークンが無効です | トークン改ざん・不正 |
| AUTH_LOGIN_FAILED | メールアドレスまたはパスワードが正しくありません | ログイン失敗 |

### 認可エラー（403）

| コード | メッセージ | 発生条件 |
|--------|----------|---------|
| FORBIDDEN_ROLE | この操作を行う権限がありません | ロールに操作権限がない |
| FORBIDDEN_RESOURCE | このリソースにアクセスする権限がありません | 他人の予約や他スタジオのデータへのアクセス |

### リソース不在エラー（404）

| コード | メッセージ | 発生条件 |
|--------|----------|---------|
| RESERVATION_NOT_FOUND | 指定された予約が見つかりません | 存在しないreservation_id |
| USER_NOT_FOUND | 指定されたユーザが見つかりません | 存在しないuser_id |
| PLAN_NOT_FOUND | 指定されたプランが見つかりません | 存在しないplan_id |
| OPTION_NOT_FOUND | 指定されたオプションが見つかりません | 存在しないoption_id |
| STUDIO_NOT_FOUND | 指定されたスタジオが見つかりません | 存在しないstudio_id |
| BLOCKED_SLOT_NOT_FOUND | 指定されたブロック枠が見つかりません | 存在しないblocked_slot_id |
| INQUIRY_NOT_FOUND | 指定された問い合わせが見つかりません | 存在しないinquiry_id |

### 業務エラー（409）

| コード | メッセージ | 発生条件 |
|--------|----------|---------|
| RESERVATION_CONFLICT | 指定の日時は既に予約済みです | 予約重複 |
| BLOCKED_SLOT_CONFLICT | 指定の日時はブロック枠に設定されています | ブロック枠と重複 |
| REGULAR_HOLIDAY | 指定の日付は定休日です | 定休日に予約しようとした |
| EMAIL_ALREADY_EXISTS | このメールアドレスは既に登録されています | ユーザ登録時のメール重複 |
| INVALID_STATUS_TRANSITION | この操作は現在のステータスでは実行できません | 状態遷移ルール違反 |
| SECOND_KEEP_NO_PRIMARY | 第2キープには同一時間帯の本予約/仮予約が必要です | 第2キープの前提条件不足 |
| PLAN_INACTIVE | 指定されたプランは現在利用できません | 無効化されたプランを指定 |
| OPTION_INACTIVE | 指定されたオプションは現在利用できません | 無効化されたオプションを指定 |

### サーバーエラー（500）

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "サーバー内部でエラーが発生しました"
  }
}
```

※ 500エラーでは内部の詳細情報はレスポンスに含めず、CloudWatch Logsに記録する。

---

## ゲスト予約API（2026-04-16実装完了）

### GET /reservations/guest/{token}
ゲスト予約詳細を取得する

**認証**: 不要（トークンベース認証）

**パスパラメータ**:
- `token`: 予約確認用トークン（UUID v4形式）

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "studio_id": "studio_001",
  "is_guest": true,
  "guest_name": "山田太郎",
  "guest_email": "guest@example.com",
  "guest_phone": "090-1234-5678",
  "guest_company": "株式会社サンプル",
  "reservation_type": "regular",
  "status": "pending",
  "plan_id": "plan_001",
  "plan_name": "スチール撮影プラン",
  "plan_price": 15000,
  "plan_tax_rate": 0.10,
  "date": "2025-03-15",
  "start_time": "10:00",
  "end_time": "13:00",
  "options": [
    {
      "option_id": "opt_001",
      "option_name": "6人以上のワークショップでご利用",
      "price": 2000,
      "tax_rate": 0.10
    }
  ],
  "shooting_type": ["stills", "video"],
  "shooting_details": "商品撮影、モデル2名",
  "photographer_name": "佐藤次郎",
  "number_of_people": 5,
  "needs_protection": false,
  "equipment_insurance": true,
  "note": "大型機材を持ち込みます",
  "created_at": "2025-03-10T14:30:00+09:00",
  "updated_at": "2025-03-10T15:00:00+09:00"
}
```

### PATCH /reservations/guest/{token}/cancel
ゲスト予約をキャンセルする

**認証**: 不要（トークンベース認証）

**パスパラメータ**:
- `token`: 予約確認用トークン（UUID v4形式）

リクエストボディ: なし

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "status": "cancelled",
  "cancelled_by": "customer",
  "cancelled_at": "2025-03-11T10:00:00+09:00"
}
```

処理内容:
1. トークンで予約を検索
2. キャンセル可能状態を確認（pending/tentative/confirmed/waitlisted/scheduled）
3. ステータスを `cancelled` に更新
4. キャンセル完了メールを送信

### PATCH /reservations/guest/{token}/promote
ゲスト仮予約を本予約に切り替える

**認証**: 不要（トークンベース認証）

**パスパラメータ**:
- `token`: 予約確認用トークン（UUID v4形式）

リクエストボディ: なし

レスポンス (200):
```json
{
  "reservation_id": "rsv_001",
  "reservation_type": "regular",
  "status": "pending",
  "promoted_from": "tentative",
  "promoted_at": "2025-03-11T10:00:00+09:00"
}
```

処理内容:
1. トークンで予約を検索
2. 昇格可能状態を確認（tentativeのみ）
3. ステータスを `pending` に変更（管理者の承認待ち）
4. 昇格受付メールを送信

### ゲスト予約の仕組み

1. **予約作成時**:
   - `POST /reservations` に `is_guest: true` とゲスト情報を含めて送信
   - サーバー側でUUID v4形式のトークンを生成
   - トークンを含む確認メールを送信
   - メールには予約確認用URL（`https://studio-zebra.com/reservations/guest/{token}`）が含まれる

2. **予約確認**:
   - メールのリンクをクリックして予約詳細ページにアクセス
   - トークンで予約を取得して表示

3. **予約変更・キャンセル**:
   - 同じトークンを使用してキャンセルや昇格が可能
   - 認証不要（トークンが認証情報の役割を果たす）

4. **セキュリティ**:
   - トークンはUUID v4形式で推測不可能
   - HTTPSのみ許可
   - トークン有効期限は設定せず、予約の存在期間中は有効
   - メール送信先のアドレスのみがトークンにアクセス可能

### バリデーションルール（ゲスト予約）

#### POST /reservations（ゲスト予約の場合）

| フィールド | ルール |
|-----------|--------|
| is_guest | 必須、trueであること |
| guest_name | 必須、1〜50文字 |
| guest_email | 必須、メールアドレス形式 |
| guest_phone | 必須、電話番号形式 |
| guest_company | 任意、100文字以内 |

その他のフィールド（studio_id, reservation_type, plan_id等）は会員予約と同様のバリデーションを適用。
