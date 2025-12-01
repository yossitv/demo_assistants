# Design: RAG Chat Sync Backend 移植

## 設計方針

### 1. モノレポ統合

private ディレクトリから apps ディレクトリへ移植し、モノレポの標準構成に統合する。

```
yoshi_demo_assistants/
├── apps/
│   ├── casher_1/                    # 既存: カフェキオスク
│   └── rag-chat-sync-backend/       # 新規: RAG Chat Backend
├── .kiro/
│   ├── specs/
│   │   ├── kiosk-home-ui/                              # 既存
│   │   ├── apps--rag-chat-sync-backend-merge/          # 移植タスク
│   │   ├── apps--rag-chat-sync-backend--mvp/           # 移植
│   │   ├── apps--rag-chat-sync-backend--api-key-auth/  # 移植
│   │   └── apps--rag-chat-sync-backend--auth-header/   # 移植
│   └── steering/
└── private/
    └── assistants/                  # 元プロジェクト（参照用として残す）
```

### 2. 命名規則

#### プロジェクト名
- `rag-chat-sync-backend`
  - `rag-chat` = RAG チャット機能
  - `sync` = 同期型レスポンス（SSE ではない）
  - `backend` = バックエンド

#### specs ディレクトリ命名
- `apps--[プロジェクト名]--[機能名]`
- 例: `apps--rag-chat-sync-backend--mvp`
- `--` (ダブルハイフン) で階層を表現

### 3. ディレクトリ構造

```
apps/rag-chat-sync-backend/
├── src/
│   ├── domain/                      # ドメイン層
│   │   ├── entities/               # エンティティ
│   │   ├── value-objects/          # 値オブジェクト
│   │   ├── repositories/           # リポジトリインターフェース
│   │   └── services/               # ドメインサービスインターフェース
│   ├── use-cases/                  # ユースケース層
│   │   ├── CreateKnowledgeSpaceUseCase.ts
│   │   ├── ListKnowledgeSpacesUseCase.ts
│   │   ├── CreateAgentUseCase.ts
│   │   └── ChatWithAgentUseCase.ts
│   ├── adapters/                   # アダプター層
│   │   └── controllers/            # Lambda コントローラー
│   ├── infrastructure/             # インフラ層
│   │   ├── repositories/           # DynamoDB/Qdrant 実装
│   │   ├── services/               # OpenAI/Cheerio 実装
│   │   ├── integration/            # 統合テスト
│   │   └── di/                     # DI コンテナ
│   ├── handlers/                   # Lambda ハンドラー
│   │   ├── knowledgeCreate.ts
│   │   ├── knowledgeList.ts
│   │   ├── agentCreate.ts
│   │   ├── chat.ts
│   │   └── apiKeyAuthorizer.ts
│   └── shared/                     # 共通ユーティリティ
│       ├── types.ts
│       ├── errors.ts
│       ├── validation.ts
│       ├── cors.ts
│       ├── retry.ts
│       └── apiKey.ts
├── infrastructure/                 # CDK インフラ定義
│   ├── lib/
│   │   └── rag-chat-backend-stack.ts
│   └── bin/
│       └── app.ts
├── scripts/                        # デプロイ・管理スクリプト
│   ├── deploy.sh
│   ├── destroy.sh
│   ├── setup-env.sh
│   ├── test-api.sh
│   ├── prepare-lambda.sh
│   └── get-cognito-token.sh
├── lambda-dist/                    # Lambda デプロイ用
│   ├── package.json
│   └── package-lock.json
├── package.json
├── tsconfig.json
├── cdk.json
├── jest.config.js
├── .eslintrc.js
├── .env.example
└── sdk-package.json
```

### 4. specs 移植マッピング

| 元の spec | 移植先 | 説明 |
|----------|--------|------|
| `rag-chat-backend-mvp/` | `apps--rag-chat-sync-backend--mvp/` | MVP 要件 |
| `api-key-auth/` | `apps--rag-chat-sync-backend--api-key-auth/` | API Key 認証 |
| `authorization-header-auth/` | `apps--rag-chat-sync-backend--auth-header/` | Authorization ヘッダー認証 |
| `web-mvp/` | (後で) `apps--rag-chat-sync-frontend--mvp/` | フロントエンド MVP |
| `dashboard-ui/` | (後で) `apps--rag-chat-sync-frontend--dashboard/` | ダッシュボード UI |

### 5. 変更が必要なファイル

#### package.json
```json
{
  "name": "rag-chat-sync-backend",
  "version": "1.0.0",
  "description": "RAG Chat Sync Backend - OpenAI-compatible RAG chat API with synchronous response"
}
```

その他のフィールド（scripts, dependencies など）は変更不要。

### 6. 変更不要なファイル

以下はそのままコピー:
- `tsconfig.json`
- `cdk.json`
- `jest.config.js`
- `.eslintrc.js`
- `.env.example`
- `sdk-package.json`
- `src/` 配下のすべてのソースコード
- `infrastructure/` 配下のすべての CDK コード
- `scripts/` 配下のすべてのスクリプト

### 7. 除外するファイル・ディレクトリ

- `web/` - 別途フロントエンドとして移植
- `.git/` - 独自の git 履歴
- `node_modules/` - npm install で再生成
- `cdk.out.deploy/` - CDK 生成物
- `docs/` - 必要に応じて後で移植
- `.kiro/steering/` - 必要に応じて統合

### 8. アーキテクチャ

Clean Architecture (4層構造) を維持:

```
┌─────────────────────────────────────────┐
│         Handlers (Lambda Entry)         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Adapters (Controllers)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Use Cases                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Domain (Entities, Value Objects)       │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│  Infrastructure (DynamoDB, Qdrant, etc) │
└─────────────────────────────────────────┘
```

### 9. API エンドポイント

移植後も同じエンドポイント構成を維持:

- `POST /v1/knowledge/create` - Knowledge Space 作成
- `GET /v1/knowledge/list` - Knowledge Space 一覧
- `POST /v1/agent/create` - Agent 作成
- `POST /v1/chat/completions` - OpenAI 互換チャット API

### 10. 認証方式

2つの認証方式をサポート:

1. **Cognito JWT** (デフォルト)
   - `Authorization: Bearer <token>` ヘッダー
   - `custom:tenant_id` と `sub` クレームを使用

2. **API Key** (フォールバック)
   - `x-api-key` または `X-API-Key` ヘッダー
   - 固定の tenantId/userId を使用

### 11. 技術スタック

- **Runtime**: Node.js 20.x + TypeScript
- **Infrastructure**: AWS CDK
- **API**: AWS API Gateway (REST API)
- **Compute**: AWS Lambda
- **Storage**: 
  - DynamoDB (メタデータ)
  - Qdrant (ベクトル埋め込み)
- **AI**: OpenAI API (embeddings + GPT-4)
- **Web Crawling**: Cheerio + Axios
- **Testing**: Jest + Property-based testing

### 12. デプロイメント

CDK による IaC (Infrastructure as Code):
- スタック名: `RagChatBackendStack`
- リージョン: 環境変数で指定
- 環境分離: CDK コンテキストで管理

### 13. 将来の拡張

- フロントエンド統合 (`apps/rag-chat-sync-frontend`)
- カフェキオスクへの ChatWidget 埋め込み
- ストリーミング版の実装 (`apps/rag-chat-stream-backend`)
