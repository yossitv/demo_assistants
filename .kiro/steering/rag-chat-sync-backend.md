# RAG Chat Sync Backend

## プロジェクト説明

OpenAI互換のRAGチャットAPIを提供するバックエンドサービス。
同期レスポンス方式で、ナレッジベースを活用した高精度な回答を生成します。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: AWS Lambda (Node.js)
- **IaC**: AWS CDK
- **データベース**: DynamoDB
- **ベクトル検索**: Qdrant
- **LLM**: OpenAI API
- **テスト**: Jest + fast-check (Property-based Testing)

## アーキテクチャ

### レイヤー構成（クリーンアーキテクチャ）

```
src/
├── domain/           # ドメイン層（エンティティ、リポジトリインターフェース）
├── use-cases/        # ユースケース層（ビジネスロジック）
├── adapters/         # アダプター層（コントローラー）
├── infrastructure/   # インフラ層（リポジトリ実装、外部サービス）
├── handlers/         # Lambda ハンドラー
└── shared/           # 共通ユーティリティ
```

### 主要コンポーネント

- **API Gateway**: REST API エンドポイント
- **Lambda Functions**: 
  - Chat Handler: チャット処理
  - Knowledge Space CRUD: ナレッジスペース管理
  - Agent CRUD: エージェント管理
  - API Key Authorizer: 認証
- **DynamoDB**: メタデータ永続化
- **Qdrant**: ベクトル検索エンジン

## 主要機能

1. **チャット API** (`POST /chat`)
   - OpenAI互換のリクエスト/レスポンス形式
   - RAGによる文脈を考慮した回答生成
   - 引用URL付き回答

2. **ナレッジスペース管理**
   - 作成 (`POST /knowledge-spaces`)
   - 一覧取得 (`GET /knowledge-spaces`)

3. **エージェント管理**
   - 作成 (`POST /agents`)
   - ナレッジスペースとの紐付け

4. **認証**
   - API Key認証（カスタムオーソライザー）
   - Authorization Header認証

## 開発コマンド

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# テスト実行
npm run test

# プロパティベーステスト
npm run test:property

# CDK デプロイ
npm run cdk:deploy

# CDK スタック合成
set -a && source .env && set +a && npm run cdk:synth
```

## 環境変数

`.env` ファイルに以下を設定：

```
TEST_API_KEY=<20文字以上のAPIキー>
OPENAI_API_KEY=<OpenAI APIキー>
QDRANT_URL=<QdrantエンドポイントURL>
QDRANT_API_KEY=<Qdrant APIキー>
```

## テスト戦略

- **ユニットテスト**: 各ユースケース、サービスの単体テスト
- **プロパティベーステスト**: fast-checkによる網羅的テスト
- **統合テスト**: CloudWatch Logger等の実際のAWSサービス連携テスト

## デプロイ

```bash
cd apps/rag-chat-sync-backend
set -a && source .env && set +a
npx cdk deploy
```

## 関連仕様

- `.kiro/specs/apps--rag-chat-sync-backend--mvp/`
- `.kiro/specs/apps--rag-chat-sync-backend--api-key-auth/`
- `.kiro/specs/apps--rag-chat-sync-backend--auth-header/`
