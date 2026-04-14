# スタジオゼブラ予約管理システム - フロントエンド

スタジオゼブラの予約管理Webアプリケーションのフロントエンド部分です。

## 技術スタック

- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite 5
- **UIライブラリ**: Chakra UI v2
- **ルーティング**: React Router v6
- **状態管理**: Zustand
- **サーバー状態管理**: TanStack Query (React Query)
- **フォーム**: React Hook Form + Zod
- **API通信**: Axios
- **日付処理**: date-fns
- **カレンダー**: react-big-calendar
- **アイコン**: Lucide React
- **認証**: AWS Cognito (amazon-cognito-identity-js)

## 必要要件

- Node.js: v18.0+ (v20.19+ または v22.4.1+ 推奨)
- npm: v8.0+

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd frontend
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成し、環境変数を設定します。

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# API設定
VITE_API_BASE_URL=https://your-api-gateway-url.com/dev
VITE_API_TIMEOUT=30000

# AWS Cognito設定
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=ap-northeast-1

# スタジオID（開発用）
VITE_DEFAULT_STUDIO_ID=studio_001

# 環境
VITE_ENV=development
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開きます。

### 4. ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### 5. プレビュー（本番ビルドの確認）

```bash
npm run preview
```

## ディレクトリ構成

```
frontend/
├── public/              # 静的ファイル
├── src/
│   ├── components/      # コンポーネント
│   │   ├── common/      # 共通コンポーネント（ボタン、カードなど）
│   │   ├── calendar/    # カレンダー関連コンポーネント
│   │   └── forms/       # フォーム関連コンポーネント
│   ├── pages/           # ページコンポーネント
│   │   ├── auth/        # 認証画面（ログイン、サインアップ）
│   │   ├── customer/    # 顧客向け画面
│   │   └── admin/       # 管理者向け画面
│   ├── hooks/           # カスタムフック
│   ├── services/        # API通信層
│   ├── stores/          # 状態管理（Zustand）
│   ├── theme/           # Chakra UIテーマ設定
│   ├── types/           # TypeScript型定義
│   ├── utils/           # ユーティリティ関数
│   ├── App.tsx          # ルーティング設定
│   └── main.tsx         # エントリーポイント
├── .env                 # 環境変数（ローカル）
├── .env.example         # 環境変数テンプレート
├── vite.config.ts       # Vite設定
├── tsconfig.json        # TypeScript設定
└── package.json
```

## 主要機能

### 顧客向け（customer）

- 予約カレンダー表示
- 予約作成（本予約/仮予約/ロケハン/第2キープ）
- 予約一覧・詳細表示
- 予約キャンセル
- 仮予約→本予約への切り替え
- 問い合わせ作成・閲覧

### 管理者向け（admin）

- ダッシュボード
- 予約承認・拒否
- 予約一覧（日別・週別・月別）
- 予約詳細表示・編集
- ブロック枠設定（休業日、プライベート利用）
- プラン・オプション管理
- 問い合わせ管理・回答
- スタッフユーザー登録

### スタッフ向け（staff）

- 予約閲覧（編集不可）

## デザインシステム

### ブランドカラー

- **Primary**: `#82C2A9` (ターコイズグリーン)
- **Accent**: `#FF463C` (コーラルレッド)

### 予約ステータス配色

| ステータス | カラー | 説明 |
|-----------|--------|------|
| confirmed | Green | 確定予約 |
| tentative | Orange | 仮予約 |
| pending | Primary | 承認待ち |
| waitlisted | Purple | 第2キープ |
| scheduled | Blue | ロケハン |
| cancelled | Red | キャンセル済み |
| expired | Gray | 期限切れ |
| completed | Gray | 利用完了 |

詳細なデザイン仕様は [../docs/design.md](../docs/design.md) を参照してください。

## 開発ガイドライン

### コーディング規約

- **コンポーネント**: 1ファイル1コンポーネント、PascalCase
- **フック**: `use` プレフィックス、camelCase
- **型定義**: interfaceを優先、型エイリアスは必要に応じて使用
- **インポート順**: React → 外部ライブラリ → 内部モジュール → 型定義

### パスエイリアス

`@/` を使用してsrcディレクトリからの絶対パスでインポート可能:

```typescript
import { User } from '@/types';
import apiClient from '@/services/api';
import theme from '@/theme';
```

### 状態管理の方針

- **グローバル状態**: 認証情報、ユーザー情報 → Zustand
- **サーバー状態**: API取得データ → TanStack Query
- **ローカル状態**: コンポーネント内の一時的な状態 → useState

### APIエラーハンドリング

全てのAPI呼び出しは `services/api.ts` のaxiosクライアントを使用し、エラーは自動的にハンドリングされます。

- **401 Unauthorized**: 自動的にログイン画面へリダイレクト
- **その他のエラー**: エラーメッセージを取得して表示

## 参考ドキュメント

- [デザイン設計](../docs/design.md)
- [API設計](../docs/api-design.md)
- [要件定義](../docs/requirements.md)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Chakra UI Documentation](https://chakra-ui.com/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)

## トラブルシューティング

### ビルドエラー

```bash
# node_modulesとlockfileを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### Viteバージョンの問題

このプロジェクトはVite v5を使用しています。Node.js v22.4.1との互換性のためです。

将来的にNode.js v22.12+にアップグレードする場合は、Vite v8に移行できます。

---

**最終更新日**: 2026-04-14
