# RAG Chat Sync Frontend Migration Tasks

## Phase 1: ディレクトリとファイルのコピー

- [ ] 1.1. apps ディレクトリ作成
  ```bash
  mkdir -p apps/rag-chat-sync-frontend
  ```

- [ ] 1.2. app ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/app apps/rag-chat-sync-frontend/
  ```

- [ ] 1.3. components ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/components apps/rag-chat-sync-frontend/
  ```

- [ ] 1.4. lib ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/lib apps/rag-chat-sync-frontend/
  ```

- [ ] 1.5. types ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/types apps/rag-chat-sync-frontend/
  ```

- [ ] 1.6. public ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/public apps/rag-chat-sync-frontend/
  ```

- [ ] 1.7. __tests__ ディレクトリをコピー
  ```bash
  cp -r private/assistants/web/__tests__ apps/rag-chat-sync-frontend/
  ```

- [ ] 1.8. 設定ファイルをコピー
  ```bash
  cp private/assistants/web/package.json apps/rag-chat-sync-frontend/
  cp private/assistants/web/next.config.ts apps/rag-chat-sync-frontend/
  cp private/assistants/web/tsconfig.json apps/rag-chat-sync-frontend/
  cp private/assistants/web/jest.config.js apps/rag-chat-sync-frontend/
  cp private/assistants/web/eslint.config.mjs apps/rag-chat-sync-frontend/
  cp private/assistants/web/postcss.config.mjs apps/rag-chat-sync-frontend/
  cp private/assistants/web/.env.example apps/rag-chat-sync-frontend/
  cp private/assistants/web/.gitignore apps/rag-chat-sync-frontend/
  ```

- [ ] 1.9. ドキュメントをコピー
  ```bash
  cp private/assistants/web/README.md apps/rag-chat-sync-frontend/
  cp private/assistants/web/EMBED_IMPLEMENTATION.md apps/rag-chat-sync-frontend/
  ```

## Phase 2: 設定ファイルの更新

- [ ] 2.1. package.json の name を変更
  ```bash
  cd apps/rag-chat-sync-frontend
  # "name": "rag-chat-sync-frontend" に変更
  ```
  
  変更内容:
  ```json
  {
    "name": "rag-chat-sync-frontend",
    "version": "0.1.0",
    "description": "RAG Chat Sync Frontend - Next.js web application for RAG chat interface"
  }
  ```

## Phase 3: 依存関係のインストール

- [ ] 3.1. npm install を実行
  ```bash
  cd apps/rag-chat-sync-frontend
  npm install
  ```

- [ ] 3.2. インストールが成功することを確認
  - node_modules が作成される
  - package-lock.json が更新される
  - エラーが出ないこと

## Phase 4: ビルドとテスト

- [ ] 4.1. TypeScript 型チェックを実行
  ```bash
  cd apps/rag-chat-sync-frontend
  npm run type-check
  ```

- [ ] 4.2. 型チェックが成功することを確認
  - TypeScript エラーが出ないこと

- [ ] 4.3. Lint を実行
  ```bash
  npm run lint
  ```

- [ ] 4.4. Lint が成功することを確認
  - ESLint エラーが出ないこと

- [ ] 4.5. テストを実行
  ```bash
  npm test
  ```

- [ ] 4.6. すべてのテストがパスすることを確認
  - コンポーネントテスト
  - Contextテスト
  - APIテスト
  - 統合テスト
  - プロパティベーステスト

- [ ] 4.7. ビルドを実行
  ```bash
  npm run build
  ```

- [ ] 4.8. ビルドが成功することを確認
  - .next ディレクトリが作成される
  - ビルドエラーが出ないこと

## Phase 5: 開発サーバー検証

- [ ] 5.1. 開発サーバーを起動
  ```bash
  npm run dev
  ```

- [ ] 5.2. サーバーが正常に起動することを確認
  - http://localhost:3000 でアクセス可能
  - エラーが出ないこと

## Phase 6: Git コミット

- [ ] 6.1. 変更をステージング
  ```bash
  git add apps/rag-chat-sync-frontend
  ```

- [ ] 6.2. コミット
  ```bash
  git commit -m "feat: migrate RAG Chat Sync Frontend to apps/"
  ```

- [ ] 6.3. プッシュ
  ```bash
  git push origin dev/rag-chat-sync
  ```

## Phase 7: ドキュメント整備（オプション）

- [ ] 7.1. .kiro/steering にプロジェクト概要を追加
  - `rag-chat-sync-frontend.md` を作成
  - プロジェクト説明、技術スタック、機能を記載

- [ ] 7.2. ルート README を更新
  - プロジェクト一覧に `apps/rag-chat-sync-frontend` を追加

## 検証チェックリスト

### ファイル構造
- [ ] `apps/rag-chat-sync-frontend/app/` が存在する
- [ ] `apps/rag-chat-sync-frontend/components/` が存在する
- [ ] `apps/rag-chat-sync-frontend/lib/` が存在する
- [ ] `apps/rag-chat-sync-frontend/types/` が存在する
- [ ] `apps/rag-chat-sync-frontend/public/` が存在する
- [ ] `apps/rag-chat-sync-frontend/__tests__/` が存在する
- [ ] `apps/rag-chat-sync-frontend/package.json` が存在する

### 設定
- [ ] package.json の name が "rag-chat-sync-frontend" になっている
- [ ] package.json の scripts が正しく動作する

### ビルド・テスト
- [ ] `npm install` が成功する
- [ ] `npm run type-check` が成功する
- [ ] `npm run lint` が成功する
- [ ] `npm test` が成功する（全テストパス）
- [ ] `npm run build` が成功する
- [ ] `npm run dev` が成功する

### Git
- [ ] dev/rag-chat-sync ブランチで作業している
- [ ] 変更がコミットされている
- [ ] リモートにプッシュされている

## 後続タスク

- [ ] バックエンドとの統合テスト
- [ ] 環境変数の設定ガイド作成
- [ ] デプロイメント設定
- [ ] モノレポ workspace 設定
