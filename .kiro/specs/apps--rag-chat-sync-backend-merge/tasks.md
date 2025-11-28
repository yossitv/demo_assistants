# Implementation Tasks

## Phase 1: ディレクトリとファイルの移植

- [ ] 1.1. apps ディレクトリ作成
  ```bash
  mkdir -p apps/rag-chat-sync-backend
  ```

- [ ] 1.2. src ディレクトリをコピー
  ```bash
  cp -r private/assistants/src apps/rag-chat-sync-backend/
  ```

- [ ] 1.3. infrastructure ディレクトリをコピー
  ```bash
  cp -r private/assistants/infrastructure apps/rag-chat-sync-backend/
  ```

- [ ] 1.4. scripts ディレクトリをコピー
  ```bash
  cp -r private/assistants/scripts apps/rag-chat-sync-backend/
  ```

- [ ] 1.5. lambda-dist ディレクトリをコピー
  ```bash
  cp -r private/assistants/lambda-dist apps/rag-chat-sync-backend/
  ```

- [ ] 1.6. 設定ファイルをコピー
  ```bash
  cp private/assistants/package.json apps/rag-chat-sync-backend/
  cp private/assistants/tsconfig.json apps/rag-chat-sync-backend/
  cp private/assistants/cdk.json apps/rag-chat-sync-backend/
  cp private/assistants/jest.config.js apps/rag-chat-sync-backend/
  cp private/assistants/.eslintrc.js apps/rag-chat-sync-backend/
  cp private/assistants/.env.example apps/rag-chat-sync-backend/
  cp private/assistants/sdk-package.json apps/rag-chat-sync-backend/
  ```

## Phase 2: specs の移植

- [ ] 2.1. rag-chat-backend-mvp を移植
  ```bash
  cp -r private/assistants/.kiro/specs/rag-chat-backend-mvp \
        .kiro/specs/apps--rag-chat-sync-backend--mvp
  ```

- [ ] 2.2. api-key-auth を移植
  ```bash
  cp -r private/assistants/.kiro/specs/api-key-auth \
        .kiro/specs/apps--rag-chat-sync-backend--api-key-auth
  ```

- [ ] 2.3. authorization-header-auth を移植
  ```bash
  cp -r private/assistants/.kiro/specs/authorization-header-auth \
        .kiro/specs/apps--rag-chat-sync-backend--auth-header
  ```

## Phase 3: 設定ファイルの修正

- [ ] 3.1. package.json の name を変更
  ```bash
  cd apps/rag-chat-sync-backend
  # "name": "rag-chat-sync-backend" に変更
  ```
  
  変更内容:
  ```json
  {
    "name": "rag-chat-sync-backend",
    "version": "1.0.0",
    "description": "RAG Chat Sync Backend - OpenAI-compatible RAG chat API with synchronous response"
  }
  ```

## Phase 4: 依存関係のインストール

- [ ] 4.1. npm install を実行
  ```bash
  cd apps/rag-chat-sync-backend
  npm install
  ```

- [ ] 4.2. インストールが成功することを確認
  - node_modules が作成される
  - package-lock.json が更新される
  - エラーが出ないこと

## Phase 5: ビルドとテスト

- [ ] 5.1. TypeScript ビルドを実行
  ```bash
  cd apps/rag-chat-sync-backend
  npm run build
  ```

- [ ] 5.2. ビルドが成功することを確認
  - dist ディレクトリが作成される
  - TypeScript エラーが出ないこと

- [ ] 5.3. テストを実行
  ```bash
  npm run test
  ```

- [ ] 5.4. すべてのテストがパスすることを確認
  - 既存のユニットテスト
  - プロパティベーステスト
  - 統合テスト

## Phase 6: CDK 検証

- [ ] 6.1. CDK スタックを合成
  ```bash
  cd apps/rag-chat-sync-backend
  npx cdk synth
  ```

- [ ] 6.2. 合成が成功することを確認
  - cdk.out ディレクトリが作成される
  - CloudFormation テンプレートが生成される
  - エラーが出ないこと

## Phase 7: Git コミット

- [ ] 7.1. 変更をステージング
  ```bash
  git add apps/rag-chat-sync-backend
  git add .kiro/specs/apps--rag-chat-sync-backend-*
  ```

- [ ] 7.2. コミット
  ```bash
  git commit -m "feat: migrate RAG Chat Sync Backend to apps/"
  ```

## Phase 8: ドキュメント整備（オプション）

- [ ] 8.1. .kiro/steering にプロジェクト概要を追加
  - `rag-chat-sync-backend.md` を作成
  - プロジェクト説明、技術スタック、アーキテクチャを記載

- [ ] 8.2. ルート README を更新
  - プロジェクト一覧に `apps/rag-chat-sync-backend` を追加

## 検証チェックリスト

### ファイル構造
- [ ] `apps/rag-chat-sync-backend/src/` が存在する
- [ ] `apps/rag-chat-sync-backend/infrastructure/` が存在する
- [ ] `apps/rag-chat-sync-backend/scripts/` が存在する
- [ ] `apps/rag-chat-sync-backend/lambda-dist/` が存在する
- [ ] `apps/rag-chat-sync-backend/package.json` が存在する

### specs 構造
- [ ] `.kiro/specs/apps--rag-chat-sync-backend--mvp/` が存在する
- [ ] `.kiro/specs/apps--rag-chat-sync-backend--api-key-auth/` が存在する
- [ ] `.kiro/specs/apps--rag-chat-sync-backend--auth-header/` が存在する

### 設定
- [ ] package.json の name が "rag-chat-sync-backend" になっている
- [ ] package.json の scripts が正しく動作する

### ビルド・テスト
- [ ] `npm install` が成功する
- [ ] `npm run build` が成功する
- [ ] `npm run test` が成功する（全テストパス）
- [ ] `npx cdk synth` が成功する

### Git
- [ ] dev/rag-chat-sync ブランチで作業している
- [ ] 変更がコミットされている

## 後続タスク

- [ ] フロントエンド移植 (`apps/rag-chat-sync-frontend`)
- [ ] モノレポ workspace 設定
- [ ] CI/CD パイプライン設定
- [ ] デプロイメントガイド作成
