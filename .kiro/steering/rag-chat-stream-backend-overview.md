# RAG Chat Stream Backend

## プロジェクト説明

OpenAI互換のRAGチャットAPIを提供するバックエンドサービス。
ストリーミング（SSE）と非ストリーミング（JSON）の両方のレスポンス方式に対応し、ナレッジベースを活用した高精度な回答を生成します。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: AWS Lambda (Node.js 20.x)
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

- **API Gateway**: REST API エンドポイント（STREAM モード統合）
- **Lambda Functions**: 
  - Chat Completions Stream Handler: ストリーミング/非ストリーミングチャット処理（180秒タイムアウト）
  - Knowledge Space CRUD: ナレッジスペース管理
  - Agent CRUD: エージェント管理
  - API Key Authorizer: 認証
- **DynamoDB**: メタデータ永続化（エージェント、ナレッジスペース、会話履歴）
- **Qdrant**: ベクトル検索エンジン
- **CloudWatch**: メトリクスとアラーム

## 主要機能

1. **ストリーミングチャット API** (`POST /v1/chat/completions`)
   - OpenAI互換のリクエスト/レスポンス形式
   - SSE（Server-Sent Events）によるストリーミングレスポンス
   - 非ストリーミングJSONレスポンス
   - RAGによる文脈を考慮した回答生成
   - 引用URL付き回答
   - UTF-8セーフなチャンク生成

2. **認証方式**
   - Bearer Token認証（Tauvs統合用）
   - API Key認証（カスタムオーソライザー）

3. **ナレッジスペース管理**
   - 作成 (`POST /knowledge-spaces`)
   - 一覧取得 (`GET /knowledge-spaces`)

4. **エージェント管理**
   - 作成 (`POST /agents`)
   - ナレッジスペースとの紐付け

5. **モニタリング**
   - CloudWatch メトリクス（StreamingRequests、UseCaseDuration、ChunkSendingDuration、ErrorsByType）
   - CloudWatch アラーム（エラー率、レイテンシ、スロットリング）

## 開発コマンド

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# テスト実行（シーケンシャル - 推奨）
npm run test

# テスト実行（並列 - リソースに余裕がある場合）
npm run test:parallel

# プロパティベーステスト
npm run test:property

# Lambda パッケージング
bash scripts/prepare-lambda.sh

# CDK デプロイ
set -a && source .env && set +a
npx cdk deploy --require-approval never --output cdk.out.deploy

# CDK スタック合成
npm run cdk:synth

# CDK スタック削除
npm run cdk:destroy
```

## 環境変数

`.env` ファイルに以下を設定：

```bash
# 必須
RAG_STREAM_API_KEY=<20文字以上のAPIキー>  # Bearer認証とAPI Key認証の両方で使用
OPENAI_API_KEY=<OpenAI APIキー>
QDRANT_URL=<QdrantエンドポイントURL>
QDRANT_API_KEY=<Qdrant APIキー>

# オプション
COGNITO_USER_POOL_ID=CREATE_NEW
LOG_LEVEL=INFO
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o
SIMILARITY_THRESHOLD=0.35
TOP_K=8
MAX_CITED_URLS=3
```

### 環境変数の詳細

| 変数名 | 説明 | 必須 | デフォルト |
|--------|------|------|-----------|
| `RAG_STREAM_API_KEY` | Bearer認証用APIキー（20文字以上）。EXPECTED_API_KEY/TAUVS_API_KEYとしても使用される | Yes | - |
| `OPENAI_API_KEY` | OpenAI APIキー | Yes | - |
| `QDRANT_URL` | QdrantエンドポイントURL | Yes | - |
| `QDRANT_API_KEY` | Qdrant APIキー | Yes | - |
| `COGNITO_USER_POOL_ID` | 既存のCognitoプールIDまたはCREATE_NEW | No | CREATE_NEW |
| `LOG_LEVEL` | ログレベル | No | INFO |
| `EMBEDDING_MODEL` | OpenAI埋め込みモデル | No | text-embedding-3-small |
| `LLM_MODEL` | OpenAI LLMモデル | No | gpt-4o |
| `SIMILARITY_THRESHOLD` | ベクトル検索の類似度閾値 | No | 0.35 |
| `TOP_K` | 検索結果の最大数 | No | 8 |
| `MAX_CITED_URLS` | レスポンスに含める最大URL数 | No | 3 |

## テスト戦略

- **ユニットテスト**: 各ユースケース、サービス、コントローラーの単体テスト
- **プロパティベーステスト**: fast-checkによる網羅的テスト
  - Bearer認証のプロパティテスト
  - ストリーミングチャンクのプロパティテスト
  - エージェント-ナレッジスペースリンクのプロパティテスト
  - 引用URLのプロパティテスト
  - Strict RAGのプロパティテスト
- **統合テスト**: CloudWatch Logger等の実際のAWSサービス連携テスト

### テスト実行時の注意

- `npm test` はシーケンシャル実行（`--runInBand`）を使用
- 並列実行でJestワーカーがクラッシュする問題を回避

## デプロイ

### 初回デプロイ

```bash
cd apps/rag-chat-stream-backend
set -a && source .env && set +a
npm run cdk:deploy -- --require-approval never --output cdk.out.deploy
```

### ロールバック後の再デプロイ

スタックが `ROLLBACK_COMPLETE` 状態の場合、先に削除：

```bash
aws cloudformation delete-stack --stack-name RagStreamAPI --region us-east-1
aws cloudformation wait stack-delete-complete --stack-name RagStreamAPI --region us-east-1
```

その後、再デプロイ。

### デプロイ後の確認

出力される情報：
- `ApiUrl`: API Gateway エンドポイント
- `RagStreamApiKeyValue`: 設定されたAPIキー

## API使用例

### ストリーミングリクエスト（cURL）

```bash
curl -N -S \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-123",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }' \
  "${API_URL}v1/chat/completions"
```

### 非ストリーミングリクエスト（cURL）

```bash
curl -X POST "${API_URL}v1/chat/completions" \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-123",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### TypeScript/JavaScript

```typescript
const response = await fetch(`${API_URL}v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RAG_STREAM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'agent-123',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const json = JSON.parse(data);
      console.log(json.choices[0].delta.content);
    }
  }
}
```

## トラブルシューティング

### テストが失敗する場合

```bash
# Jestキャッシュをクリア
npm test -- --clearCache

# 詳細出力で実行
npm test -- --verbose
```

### デプロイが失敗する場合

```bash
# 環境変数を確認
set -a && source .env && set +a
env | grep -E "RAG_STREAM|OPENAI|QDRANT"

# スタック合成でエラーチェック
npm run cdk:synth
```

### ストリーミングが動作しない場合

- Lambdaタイムアウトが180秒に設定されているか確認
- API Gateway統合モードがSTREAMになっているか確認
- TAUVS_API_KEY環境変数が設定されているか確認
- CloudWatchログを確認

## モニタリング

### CloudWatch メトリクス

- `StreamingRequests`: ストリーミングリクエスト数
- `UseCaseDuration`: ユースケースロジックの実行時間
- `ChunkSendingDuration`: SSEチャンク送信時間
- `ErrorsByType`: ステータスコード別エラー数（401/403/400/500）

### CloudWatch アラーム

- Lambdaエラー率 > 5%
- Lambda p99レイテンシ > 30秒（ストリーミング）/ 5秒（その他）
- API Gateway 5xxエラー率 > 1%
- DynamoDBスロットリング

## プロジェクト構造

```
apps/rag-chat-stream-backend/
├── src/                    # TypeScriptソースコード
├── infrastructure/         # CDKインフラコード
├── docs/                   # APIドキュメント
├── scripts/                # ビルド・デプロイスクリプト
├── dist/                   # コンパイル済みJavaScript（gitignore）
├── lambda-dist/            # Lambdaデプロイパッケージ（gitignore）
├── cdk.out.deploy/         # CDK出力ディレクトリ（gitignore）
├── package.json            # npm設定
├── tsconfig.json           # TypeScript設定
├── jest.config.js          # Jest設定
└── .env                    # 環境変数（gitignore）
```

## 関連仕様

- `.kiro/specs/apps--rag-chat-stream-backend/` - メインスペック
- `.kiro/specs/apps--rag-chat-stream-backend--auth-fix/` - 認証修正スペック

## 関連プロジェクト

- [rag-chat-sync-backend](../rag-chat-sync-backend) - 非ストリーミング版
- [rag-chat-sync-frontend](../rag-chat-sync-frontend) - Web UI

## コーディング規約

- クリーンアーキテクチャの原則に従う
- 依存性注入（DI）を使用
- ドメイン層は外部依存を持たない
- インターフェースを通じて依存関係を逆転
- プロパティベーステストで網羅的なテストを実施
- コメントは日本語・英語どちらでも可


