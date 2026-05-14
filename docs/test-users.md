# 検証用ユーザー一覧

dev 環境（AWS Cognito + DynamoDB users テーブル）に登録済みの、画面動作確認用ユーザーをまとめたドキュメント。

- **環境**: dev
- **フロントエンド URL**: https://dy4lretixtouu.cloudfront.net
- **API エンドポイント**: https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/
- **所属スタジオ**: `studio_001`（admin/staff のみ。customer はスタジオ無所属）
- **最終更新日**: 2026-05-14

---

## アカウント一覧

| ロール | メールアドレス | パスワード | 用途 | Cognito custom属性 |
|--------|---------------|-----------|------|-------------------|
| customer | e2ecustomer1@example.com | `CustPass123!` | 一般会員（予約作成者A） | `custom:role=customer` |
| customer | e2ecustomer2@example.com | `CustPass123!` | 一般会員（予約作成者B、他ユーザー予約参照テスト用） | `custom:role=customer` |
| admin | e2eadmin@example.com | `AdminPass123!` | スタジオ管理者（予約承認・プラン管理） | `custom:role=admin`, `custom:studio_id=studio_001` |
| staff | e2estaff@example.com | `StaffPass123!` | スタジオスタッフ（予約閲覧のみ） | `custom:role=staff`, `custom:studio_id=studio_001` |

---

## 画面動作確認の手順

### 1. ログイン

1. フロントエンド URL（https://dy4lretixtouu.cloudfront.net）にアクセス
2. ログイン画面で上記の「メールアドレス／パスワード」を入力
3. ロールに応じた画面に遷移
   - customer: マイページ／予約一覧
   - admin: 管理画面（予約一覧・プラン管理・オプション管理など）
   - staff: 管理画面（予約閲覧のみ。編集 UI は非表示／無効）

### 2. ロール別の確認ポイント

#### customer（e2ecustomer1 / e2ecustomer2）
- 予約カレンダーの閲覧
- 新規予約の作成（本予約／仮予約／ロケハン／第2キープ）
- 自分の予約一覧の取得・キャンセル
- 問い合わせ作成
- **e2ecustomer2** は他ユーザー予約への 403 動作確認に利用

#### admin（e2eadmin）
- `studio_001` の予約一覧取得・承認・キャンセル
- プラン／オプションの CRUD（作成・更新・無効化）
- ブロック枠の設定
- 問い合わせ回答

#### staff（e2estaff）
- `studio_001` の予約一覧の **閲覧のみ**
- 予約編集・承認エンドポイントを叩くと `403 FORBIDDEN_ROLE`

---

## ユーザーの再プロビジョニング手順

ユーザーが削除された場合や別環境で再作成する場合の手順。詳細は [e2e-test-plan.md](e2e-test-plan.md) の各カテゴリ末尾「プロビジョニング手順」も参照。

### Cognito User Pool ID の取得

```bash
cd terraform/environments/dev
POOL=$(terraform output -raw cognito_user_pool_id)
```

### customer の作成（role=customer がデフォルト）

```bash
curl -sS -X POST https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"E2E Customer1","email":"e2ecustomer1@example.com","password":"CustPass123!","phone_number":"090-0000-0001","address":"東京都"}'
```

`e2ecustomer2@example.com` も同様。signup 直後は `role=customer` のため追加属性付与は不要。

### admin の作成（role=admin + studio_id=studio_001）

```bash
# 1. signup（既存なら 409 - スキップ可）
curl -sS -X POST https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"E2E Admin","email":"e2eadmin@example.com","password":"AdminPass123!","phone_number":"090-0000-1111","address":"東京都"}'

# 2. Cognito の custom 属性付与
aws cognito-idp admin-update-user-attributes \
  --region ap-northeast-1 --user-pool-id "$POOL" --username e2eadmin@example.com \
  --user-attributes Name=custom:role,Value=admin Name=custom:studio_id,Value=studio_001

# 3. DynamoDB users テーブル側の role / studio_id を同期
#    <user_id> は signup レスポンスの user_id を使う
aws dynamodb update-item --region ap-northeast-1 --table-name dev-users \
  --key '{"user_id":{"S":"<user_id>"}}' \
  --update-expression "SET #r = :role, studio_id = :sid" \
  --expression-attribute-names '{"#r":"role"}' \
  --expression-attribute-values '{":role":{"S":"admin"},":sid":{"S":"studio_001"}}'
```

### staff の作成（role=staff + studio_id=studio_001）

admin と同じ手順で、`custom:role` と DynamoDB の `role` を `staff` に置き換える。

```bash
curl -sS -X POST https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"E2E Staff","email":"e2estaff@example.com","password":"StaffPass123!","phone_number":"090-0000-2222","address":"東京都"}'

aws cognito-idp admin-update-user-attributes \
  --region ap-northeast-1 --user-pool-id "$POOL" --username e2estaff@example.com \
  --user-attributes Name=custom:role,Value=staff Name=custom:studio_id,Value=studio_001

aws dynamodb update-item --region ap-northeast-1 --table-name dev-users \
  --key '{"user_id":{"S":"<user_id>"}}' \
  --update-expression "SET #r = :role, studio_id = :sid" \
  --expression-attribute-names '{"#r":"role"}' \
  --expression-attribute-values '{":role":{"S":"staff"},":sid":{"S":"studio_001"}}'
```

---

## 注意事項

- `/auth/signup` は `role=customer` 固定で作成される。admin/staff にするには **Cognito の custom 属性** と **DynamoDB users テーブル** の両方を更新する必要がある（片方だけだとログインレスポンスの role と JWT の role が乖離する）。
- **studio_id 制御**: admin/staff の操作は JWT の `custom:studio_id` を起点に検証される。他スタジオのデータには 403 が返るため、`studio_001` 以外の studio_id を指定したテストはセットアップ込みで実施する必要がある。
- パスワードは Cognito のパスワードポリシー（大小英字＋数字＋記号、最低 8 文字）を満たす必要がある。
- **本ドキュメントは dev 環境専用**。prod 環境では同じメールアドレス／パスワードを使い回さないこと。
- メールアドレスはダミー（`@example.com`）のため、SES からの実メール受信はできない。メール通知の動作確認は CloudWatch Logs か SES Suppression List で確認する。

---

## 関連ドキュメント

- [docs/e2e-test-plan.md](e2e-test-plan.md) — 各ユーザーを利用した E2E テストケース一覧
- [docs/api-design.md](api-design.md) — ロール別の API アクセス権限
- [docs/operations.md](operations.md) — 環境変数・ログ運用
