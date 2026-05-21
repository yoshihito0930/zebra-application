# 予約更新/キャンセル通知メール E2E 実行結果

- **実行日**: 2026-05-21
- **対象コミット**: `90caab1`（feat: 予約の更新/キャンセル時に予約者と管理者宛へ通知メールを送信）
- **環境**: dev (API: `https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/`)
- **実行者**: Yoshihito Ishihara（claude code assist）
- **対象 Lambda**: `dev-reservation-update`, `dev-reservation-cancel`, `dev-reservation-guest-cancel`（3 関数を `aws lambda update-function-code` で直接デプロイ）

## 検証方針（重要な前提）

dev の SES はサンドボックスモードで verified address は `noreply@studio-zebra.com` のみ。テストアカウント (`e2ecustomer1@example.com`, `e2eadmin@example.com`, `e2eguest@example.com`) は未 verified のため、SES `SendEmail` は `MessageRejected: Email address is not verified` で失敗する。

→ ユーザー判断により、Acceptance Criteria を以下のように読み替えて検証した:

- **送信処理ルートに入った証跡**: skip ログ（`user_id is empty` / `guest email is empty` / `guest token is empty` / `no admin found for studio` 等）が出ていないこと
- **失敗ログの分類**: `failed to send ... email` が出ていても、原因が SES サンドボックスの `MessageRejected` で受信者が `@example.com` であれば **既知の制約として PASS**
- **fail-open**: メール送信失敗にもかかわらず API が 200 を返すこと
- **業務処理の正常性**: DynamoDB 上のステータス遷移／更新フィールドが想定通り

## 事前準備で発生した修正

`/auth/login` で admin が AUTH_LOGIN_FAILED となる事象を発見。原因は **`dev-users` テーブルの `e2eadmin@example.com` ユーザーの `email` フィールドが `yoshihito.093079@gmail.com` になっており、Cognito 認証成功後に DynamoDB を email で引く `auth-login` Lambda がレコードを見つけられない**こと（過去の手作業の跡）。ユーザー判断により `dev-users.email` を `e2eadmin@example.com` に揃える形で修正済み（`docs/test-users.md` の記載と整合）。

## 結果サマリ

| 結果 | ID | シナリオ | 対象予約 | HTTP | DynamoDB 確認 | メール送信ログ |
|---|---|---|---|---|---|---|
| ✅ | NOTIF-001 | admin が会員予約を更新 | R1 `8fa667a9...` | 200 | `shooting_details` 更新確認 | 会員宛 + admin 宛とも emit、SES サンドボックス制約のみ |
| ✅ | NOTIF-002 | admin がゲスト予約を更新 | RG1 `d9f7f130...` | 200 | `shooting_details` 更新確認 | ゲスト宛 + admin 宛とも emit、SES サンドボックス制約のみ |
| ✅ | NOTIF-003 | 会員が自分の予約をキャンセル | R2 `67b0b886...` | 200 | `status=cancelled`, `cancelled_by=customer` | 会員宛 + admin 宛とも emit |
| ✅ | NOTIF-004 | admin が会員予約をキャンセル | R3 `eb1f66bd...` | 200 | `status=cancelled`, `cancelled_by=owner` | 会員宛 + admin 宛とも emit |
| ✅ | NOTIF-005 | admin がゲスト予約をキャンセル | RG2 `1d9c9a68...` | 200 | `status=cancelled`, `cancelled_by=owner` | ゲスト宛 + admin 宛とも emit |
| ✅ | NOTIF-006 | ゲストがトークン経由でキャンセル | RG3 `865d83a9...` (GT3 `41578a41...`) | 200 | `status=cancelled`, `cancelled_by=customer` | ゲスト宛 + admin 宛とも emit |

**全 6 シナリオ PASS。** いずれも:
- API が 200 を返す（fail-open ポリシーが効いている）
- 想定通りの宛先（会員/ゲスト + 管理者）に対して送信処理ルートに入っている（skip ログなし）
- 失敗ログはすべて SES サンドボックス由来の `MessageRejected: Email address is not verified` で、受信者は `@example.com`（既知制約）
- `AccessDenied` / `Throttling` / `Serialization` 系のエラーは観測されず

## ログ抜粋（代表例）

### NOTIF-001 (`/aws/lambda/dev-reservation-update`)

```
2026/05/21 07:29:34 failed to send customer reservation update email
  (reservation_id=8fa667a9-...): ... MessageRejected: Email address is not verified.
  ... e2ecustomer1@example.com
2026/05/21 07:29:34 failed to send admin reservation update notification:
  ... MessageRejected: Email address is not verified. ... e2eadmin@example.com
END / Duration: 759 ms
```

→ 会員宛・管理者宛の双方の `SendEmail` 呼び出しが行われ、いずれもサンドボックスで rejected されている。skip ログなし。HTTP 200 が返っている。

### NOTIF-006 (`/aws/lambda/dev-reservation-guest-cancel`)

```
2026/05/21 07:30:21 Failed to send cancellation email:
  ... MessageRejected: ... e2eguest@example.com
2026/05/21 07:30:21 failed to send admin reservation cancellation notification:
  ... MessageRejected: ... e2eadmin@example.com
```

→ ゲスト宛・管理者宛の双方が emit、両方サンドボックス rejection。

(他シナリオも同様パターン。詳細は CloudWatch Logs から `start-time` ベースで抽出可能 — 各シナリオの T0 は実行時に控えてある)

## 既知制約・観測事項（Bug 候補ではない）

### 観測 A: 更新リクエストの `number_of_people` がスキーマで未サポート

NOTIF-001, NOTIF-002 で `{"number_of_people": 3, "shooting_details": ...}` を PATCH したところ、`shooting_details` のみ反映され `number_of_people` は元値 `2` のままだった。
[backend/cmd/reservation-update/main.go](backend/cmd/reservation-update/main.go) には `number_of_people` の処理パスが存在せず、現行の更新エンドポイント仕様として **`number_of_people` は更新不可フィールド**であることを確認。

→ メール通知機能とは無関係の既存仕様。本 E2E のスコープ外として PASS 扱い。

### 観測 B: admin による会員予約キャンセルで `cancelled_by=owner`

NOTIF-004 で admin がキャンセルしたところ `cancelled_by: "owner"` が返却された（NOTIF-003 の会員自身は `customer`）。意味付け／仕様確認は別途必要だが、メール通知の動作には影響しない。

## 関連ドキュメント

- 既存 E2E テスト: [docs/e2e-test-plan.md](e2e-test-plan.md)
- テストアカウント: [docs/test-users.md](test-users.md)
- API 仕様: [docs/api-design.md](api-design.md)
