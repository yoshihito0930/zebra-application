# 公開予約導線（ログイン不要予約）設計

## 概要

スタジオゼブラの予約システムは、**会員（customer）/ゲスト（guest）の区分を撤廃し、誰でもログイン不要でカレンダーを閲覧・予約できる公開予約導線に一本化**している（2026-06-21、コミット `7ae8b90`）。

本ドキュメントは、その公開予約導線の現状の設計と、バックエンド実装との関係を説明する。

> 旧構成では「会員向け予約」と「ゲスト予約」を別導線として段階的に実装する計画だったが、利用者体験を簡素化するため、フロントエンドの利用者向け導線をすべて公開予約（ログイン不要）に統合した。本ドキュメント末尾の「実装完了履歴」にその経緯を残している。

---

## 背景：なぜ会員/ゲスト区分を撤廃したか

- スタジオ予約は「初めての利用者がその場で予約できる」ことが最重要であり、会員登録を予約の前提にすると離脱が増える。
- 会員/ゲストで予約フォーム・確認導線・APIパスを二重に持つと、UI とテストの保守コストが高い。
- 埋め込みウィジェット（外部サイト配信）では会員ログインを前提にできないため、いずれにせよ公開予約パスが必要だった。

→ フロントエンドの利用者向け導線を **公開予約（ログイン不要）に一本化** し、会員/ゲストの区別を UI から撤廃した。

---

## フロントエンドの構成（現状）

### 認証・導線

- カレンダー閲覧・プラン/オプション閲覧・予約作成・予約確認/キャンセルはすべて **ログイン不要**。
- `CustomerLayout` は認証分岐のない公開ヘッダー。会員専用ルート（マイ予約・プロフィール・問い合わせ）は削除済み。
- `LoginPage` は admin/staff のログインとパスワード再設定のみを提供（新規登録誘導は非表示）。

### 予約作成

- 予約作成は `CreateReservationModal` を使用。`guestOnly` prop を持ち、公開/ウィジェットでは **常にゲスト予約パス（`POST /reservations/guest`）** を使用する。
- 公開予約フォームでは連絡先情報（氏名・メール・電話・任意で会社名）を入力する。
- admin の管理画面からの会員予約パス（`POST /reservations`）は温存しており、`guestOnly=false` で利用する。

### 予約確認・キャンセル・昇格（トークンベース）

- 予約完了時にメールで確認リンク（`/reservations/guest/{token}`）を送信。
- 利用者は会員登録なしで、トークン経由で予約詳細の確認・キャンセル・仮予約→本予約の昇格が可能。

### 関連実装ファイル（フロントエンド）

- `src/components/layouts/CustomerLayout.tsx` - 公開ヘッダー（認証分岐なし）
- `src/components/reservation/CreateReservationModal.tsx` - `guestOnly` prop による予約パス切り替え
- `src/components/calendar/EmbeddedCalendar.tsx` - 埋め込みウィジェット用カレンダー
- `src/pages/customer/CalendarPage.tsx` - 公開カレンダー画面
- `src/pages/auth/LoginPage.tsx` - admin/staff ログイン
- `src/App.tsx` - 公開予約導線へのルーティング

---

## バックエンドの位置づけ

**バックエンド/API/DynamoDB/Terraform は無変更**。会員/ゲスト区分の撤廃はフロントエンドのみの変更であり、既存のゲスト予約用の実装を「公開予約の実装基盤」としてそのまま利用している。

- `POST /reservations/guest`（ゲスト予約作成）＝ 公開予約の作成パス
- `GET /reservations/guest/{token}`（予約詳細取得）
- `PATCH /reservations/guest/{token}/cancel`（キャンセル）
- `PATCH /reservations/guest/{token}/promote`（仮予約→本予約昇格）
- `reservations` テーブルの `is_guest` / `guest_name` / `guest_email` / `guest_phone` / `guest_company` / `guest_token` フィールド、`user_id` のオプショナル化、GSI5（`FindByGuestToken`）
- Cognito 上の `customer` / `guest` ロールも残存（admin/staff 認証は継続利用）

これらの API 仕様・データモデルの詳細は、実装どおりの記述として以下を参照すること:

- [API設計](api-design.md)
- [データモデル](data-model.md)
- [データベース設計](database-design.md)

> 補足: バックエンド上の `is_guest` やゲストトークンといった命名は実装の歴史的経緯によるもので、現在のフロントエンドでは「公開予約」を指す。将来バックエンドの命名を整理する場合は別タスクとして扱う。

---

## 技術的検討事項

### セキュリティ

1. **トークン生成**
   - UUID v4 形式（推測不可能）
   - 有効期限を設定（例: 予約完了後30日）
2. **メール認証**
   - トークンベースのアクセス制御
   - 予約確認メールの送信によるメールアドレス検証
3. **スパム対策**
   - reCAPTCHA の導入を検討
   - 同一IPアドレスからの連続予約制限を検討

### データ管理

- 公開予約データも通常予約と同様に10年間保持
- トークンの有効期限は予約完了後30日

### UX考慮点

- メールに含まれる確認リンクをわかりやすく提示し、ブックマーク推奨を案内する。
- 予約フォームの連絡先入力を最小限にし、その場で予約まで完結できる体験を維持する。

---

## 参考資料

- [要件定義](requirements.md) - ユースケース定義
- [API設計](api-design.md) - 現在のAPI仕様（バックエンドは無変更）
- [データモデル](data-model.md) - DynamoDBテーブル設計

---

**作成日**: 2026-04-14
**最終更新日**: 2026-06-22
**ステータス**: 公開予約導線へ一本化済み（フロントエンド）。バックエンドは既存実装を温存。

---

## 実装完了履歴

### 2026-06-21: フロントを公開予約導線へ一本化（コミット `7ae8b90`）

会員/ゲストの枠組みを撤廃し、誰でもログイン不要でカレンダー確認・予約できる構成に変更。

- `CreateReservationModal` に `guestOnly` prop を追加し、公開/ウィジェットでは常にゲスト予約パス（`POST /reservations/guest`）を使用。admin の会員予約パスは温存。
- `CustomerLayout` を認証分岐なしの公開ヘッダー化（予約確認導線のみ残す）。
- 会員専用ルート（マイ予約・プロフィール・問い合わせ）を削除。
- `LoginPage` の新規登録誘導を非表示化（admin/staff ログイン・パスワード再設定は維持）。
- バックエンド/Terraform は無変更。

### 2026-04-16: ゲスト予約バックエンドAPI実装完了（現在の公開予約の実装基盤）

> 当時は会員/ゲストを別導線とする計画の一環として実装されたが、現在はこの API 群がそのまま公開予約導線の実装基盤として利用されている。

#### 実装内容
1. **データモデル拡張**
   - Reservation エンティティにゲスト用フィールド追加（is_guest, guest_name, guest_email, guest_phone, guest_company, guest_token）
   - user_id をオプショナルに変更
2. **新規Lambda関数（3つ）**
   - `reservation-guest-get`: 予約詳細取得
   - `reservation-guest-cancel`: 予約キャンセル
   - `reservation-guest-promote`: 仮予約昇格
3. **メール通知機能**
   - SES SDK v2 統合
   - 予約確認メール（トークンリンク含む）/ キャンセル完了メール / 昇格受付メール
4. **リポジトリ・ユースケース拡張**
   - FindByGuestToken 実装（GSI5使用）
   - CreateGuestReservation、CancelByGuestToken、PromoteByGuestToken 実装
