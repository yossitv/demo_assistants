# RAG Chat Sync Frontend Migration Requirements

## 目的

`private/assistants/web/` から `apps/rag-chat-sync-frontend/` へのフロントエンドアプリケーション移植

## 背景

- バックエンド (`apps/rag-chat-sync-backend/`) の移植が完了
- フロントエンドも同様に `apps/` ディレクトリに統合する必要がある
- モノレポ構造への移行準備

## 移植対象

### ソースコード
- `app/` - Next.js App Router
- `components/` - Reactコンポーネント
- `lib/` - API・Context・ユーティリティ
- `types/` - TypeScript型定義
- `public/` - 静的ファイル
- `__tests__/` - テストファイル

### 設定ファイル
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `jest.config.js`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `.env.example`
- `.gitignore`

### ドキュメント
- `README.md`
- `EMBED_IMPLEMENTATION.md`

## 技術スタック

- Next.js 16.0.3 (App Router)
- React 19.2.0
- TypeScript 5
- Tailwind CSS 4
- Jest + React Testing Library
- fast-check (プロパティベーステスト)

## 要件

### 機能要件
1. 既存の全機能が動作すること
2. バックエンドAPIとの連携が正常に動作すること
3. 全テストがパスすること
4. ビルドが成功すること

### 非機能要件
1. ディレクトリ構造の一貫性
2. 設定ファイルの適切な更新
3. 依存関係の整合性

## 制約

- Next.js 16の機能を維持
- 既存のテストを全て移植
- 環境変数の設定を維持
