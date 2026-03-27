# フロントエンド アーキテクチャ設計

## ディレクトリ構造

```
frontend/
├── src/
│   ├── app/                     # App Router ページ
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # トップページ
│   │   ├── auth/                # 認証関連ページ
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   ├── calendar/            # カレンダー表示ページ
│   │   │   └── page.tsx
│   │   ├── reservations/        # 予約管理ページ
│   │   │   ├── page.tsx         # 予約リスト
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # 新規予約
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # 詳細表示
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # 予約編集
│   │   │       └── cancel/
│   │   │           └── page.tsx # 予約キャンセル
│   │   ├── admin/              # 管理者ページ
│   │   │   ├── layout.tsx      # 管理者用レイアウト
│   │   │   ├── page.tsx        # ダッシュボード
│   │   │   ├── reservations/   # 予約管理
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── users/         # ユーザー管理
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── settings/      # 管理設定
│   │   │       └── page.tsx
│   │   └── account/           # アカウント管理
│   │       ├── page.tsx
│   │       └── settings/
│   │           └── page.tsx
│   ├── components/            # コンポーネント
│   │   ├── common/            # 共通コンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   ├── layouts/           # レイアウトコンポーネント
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── calendar/          # カレンダー関連
│   │   │   ├── Calendar.tsx
│   │   │   ├── WeekView.tsx
│   │   │   └── ...
│   │   ├── reservations/      # 予約関連
│   │   │   ├── ReservationForm.tsx
│   │   │   ├── ReservationCard.tsx
│   │   │   └── ...
│   │   └── admin/            # 管理者用コンポーネント
│   │       ├── ApprovalControls.tsx
│   │       ├── AdminCalendar.tsx
│   │       └── ...
│   ├── hooks/                # カスタムフック
│   │   ├── useAuth.ts
│   │   ├── useReservations.ts
│   │   ├── useCalendar.ts
│   │   └── ...
│   ├── api/                  # API通信
│   │   ├── client.ts         # APIクライアント設定
│   │   ├── auth.ts
│   │   ├── reservations.ts
│   │   ├── calendar.ts
│   │   └── admin.ts
│   ├── lib/                  # ユーティリティ
│   │   ├── auth.ts           # 認証管理
│   │   ├── date-utils.ts     # 日付操作
│   │   ├── validation.ts     # バリデーション
│   │   └── ...
│   ├── store/                # 状態管理
│   │   ├── auth/             # 認証状態
│   │   ├── reservations/     # 予約状態
│   │   └── ui/              # UI状態
│   └── types/               # 型定義
│       ├── api.ts           # APIレスポンスの型
│       ├── models.ts        # データモデルの型
│       └── ...
├── public/                  # 静的アセット
└── ...
```

## 主要レイヤー構成

### 1. プレゼンテーション層
- **ページ (src/app/*)**: App Routerベースのページコンポーネント
- **UIコンポーネント (src/components/*)**: 再利用可能なUI要素
- **レイアウト (src/components/layouts/)**: ページ構造を定義

### 2. アプリケーション層
- **カスタムフック (src/hooks/)**: UIとロジックを連携
- **状態管理 (src/store/)**: グローバル状態の管理

### 3. ドメイン層
- **モデル (src/types/models.ts)**: ビジネスエンティティの型定義
- **ドメインロジック (src/lib/)**: ビジネスロジックの実装

### 4. データアクセス層
- **APIクライアント (src/api/)**: バックエンドとの通信
- **キャッシュ管理**: データの効率的な取得と保存

## 認証フロー

1. **未認証ユーザー**:
   - `/` -> トップページ（サービス紹介）
   - `/auth/login` -> ログインページ
   - `/auth/register` -> 新規登録ページ

2. **一般ユーザー（認証済み）**:
   - `/` -> ユーザーダッシュボード
   - `/calendar` -> 予約カレンダー
   - `/reservations` -> 自分の予約一覧
   - `/reservations/new` -> 新規予約ページ
   - `/reservations/[id]` -> 予約詳細
   - `/account` -> アカウント情報

3. **管理者ユーザー**:
   - 一般ユーザーの全アクセス権 +
   - `/admin` -> 管理者ダッシュボード
   - `/admin/reservations` -> 全予約管理
   - `/admin/users` -> ユーザー管理
   - `/admin/settings` -> システム設定

## 状態管理設計

### グローバル状態管理 (Zustand/Redux/Context API)
- **認証状態**: ログインユーザー情報、権限
- **予約データ**: カレンダー情報、予約リスト
- **UI状態**: テーマ設定、サイドバー状態、モーダル表示

### ローカル状態管理 (React hooks)
- フォーム入力値
- ページネーション状態
- ローディング状態

## データフェッチング戦略

### SWRまたはReact Queryを活用
- データの自動再検証
- 楽観的UI更新
- エラー時の再試行
- キャッシュ管理

### 実装例:
```typescript
// src/hooks/useReservations.ts
import useSWR from 'swr'
import { fetchReservations } from '../api/reservations'

export function useReservations(params) {
  const { data, error, mutate } = useSWR(
    ['/reservations', params],
    () => fetchReservations(params)
  )

  return {
    reservations: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  }
}
```

## レスポンシブ設計

- **モバイルファースト**アプローチ
- Tailwind CSSのブレークポイント活用
- フレキシブルグリッドレイアウト
- 画面サイズに応じたコンポーネント条件レンダリング
