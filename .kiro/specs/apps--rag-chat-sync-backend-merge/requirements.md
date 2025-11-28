# Requirements: RAG Chat Sync Backend 移植

## 概要

`private/assistants` プロジェクトを `apps/rag-chat-sync-backend` として移植し、モノレポ構成に統合する。

## 目的

- private ディレクトリから apps ディレクトリへの移植
- 独立したバックエンドアプリケーションとして管理
- 将来的なフロントエンド統合の準備

## 移植対象

### 必須ファイル・ディレクトリ

```
private/assistants/
├── src/                    → apps/rag-chat-sync-backend/src/
├── infrastructure/         → apps/rag-chat-sync-backend/infrastructure/
├── scripts/               → apps/rag-chat-sync-backend/scripts/
├── lambda-dist/           → apps/rag-chat-sync-backend/lambda-dist/
├── package.json           → apps/rag-chat-sync-backend/package.json (name変更)
├── tsconfig.json          → apps/rag-chat-sync-backend/tsconfig.json
├── cdk.json               → apps/rag-chat-sync-backend/cdk.json
├── jest.config.js         → apps/rag-chat-sync-backend/jest.config.js
├── .eslintrc.js           → apps/rag-chat-sync-backend/.eslintrc.js
├── .env.example           → apps/rag-chat-sync-backend/.env.example
└── sdk-package.json       → apps/rag-chat-sync-backend/sdk-package.json
```

### 除外対象

- `web/` (別途フロントエンドとして移植予定)
- `.git/` (独自のgit履歴)
- `node_modules/`
- `cdk.out.deploy/`
- `docs/` (必要に応じて後で移植)
- `.kiro/steering/` (既存のプロジェクト設定、必要に応じて統合)

## 変更内容

### package.json

```json
{
  "name": "rag-chat-sync-backend",
  "version": "1.0.0",
  "description": "RAG Chat Sync Backend - OpenAI-compatible RAG chat API with synchronous response"
}
```

### 最終的なディレクトリ構造

```
apps/rag-chat-sync-backend/
├── src/
│   ├── domain/              # ドメイン層
│   ├── use-cases/           # ユースケース層
│   ├── adapters/            # アダプター層
│   ├── infrastructure/      # インフラ層
│   ├── handlers/            # Lambda ハンドラー
│   └── shared/              # 共通ユーティリティ
├── infrastructure/
│   ├── lib/                 # CDK スタック定義
│   └── bin/                 # CDK アプリエントリーポイント
├── scripts/
│   ├── deploy.sh
│   ├── destroy.sh
│   ├── setup-env.sh
│   └── test-api.sh
├── lambda-dist/             # Lambda デプロイ用
├── package.json
├── tsconfig.json
├── cdk.json
├── jest.config.js
├── .eslintrc.js
├── .env.example
└── sdk-package.json
```

## 実装手順

1. ディレクトリ作成: `mkdir -p apps/rag-chat-sync-backend`
2. ファイルコピー: 対象ファイル・ディレクトリを移植
3. specs 移植: バックエンド関連の specs をコピー・リネーム
4. package.json 修正: name を "rag-chat-sync-backend" に変更
5. 依存関係インストール: `npm install`
6. ビルド確認: `npm run build`
7. テスト実行: `npm run test`
8. CDK 合成確認: `cdk synth`

## 成功基準

- [ ] `apps/rag-chat-sync-backend/` ディレクトリが作成されている
- [ ] 必須ファイルがすべてコピーされている
- [ ] バックエンド関連の specs が `.kiro/specs/apps--rag-chat-sync-backend--*` として移植されている
- [ ] package.json の name が "rag-chat-sync-backend" になっている
- [ ] `npm install` が成功する
- [ ] `npm run build` が成功する
- [ ] `npm run test` が成功する（既存テストがすべてパス）
- [ ] `cdk synth` が成功する（CDK スタックが合成できる）

## 技術スタック

- **Runtime**: Node.js 20.x + TypeScript
- **Infrastructure**: AWS CDK
- **API**: AWS API Gateway (REST API)
- **Compute**: AWS Lambda
- **Storage**: DynamoDB (metadata), Qdrant (vector embeddings)
- **AI**: OpenAI API (embeddings + GPT-4)
- **Architecture**: Clean Architecture (4層構造)
- **API形式**: OpenAI-compatible REST API (同期型レスポンス)

## 後続タスク

- [ ] フロントエンド移植 (`apps/rag-chat-sync-frontend`)
- [ ] モノレポ workspace 設定
- [ ] `.kiro/steering/` にドキュメント追加
- [ ] ルート README 更新

## 参考資料

- 元プロジェクト: `private/assistants/`
- 元プロジェクト README: `private/assistants/README.md`
- アーキテクチャドキュメント: `private/assistants/.kiro/steering/structure.md`
