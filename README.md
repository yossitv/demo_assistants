# ai-crew

生成AI / RAG / 音声アバターを組み合わせたデモアプリ群のモノレポです。製品推薦チャット、OpenAI互換のストリーミングAPI、カフェ向けセルフオーダーUIなどをまとめています。

## リポジトリ構成

```
.
├── apps/
│   ├── rag-chat-stream-backend/  # OpenAI互換のRAGバックエンド（AWS Lambda + CDK）
│   ├── rag-chat-frontend/        # 製品推薦チャットUI（Next.js）
│   └── cashier-frontend/         # Tavus連携のセルフオーダーUI（Next.js）
├── QUICKSTART_PRODUCT_RECOMMENDATION.md  # 製品推薦デモの手順
├── FINAL_REPORT.md ほか各種レポート
└── .kiro/                         # 仕様・概要メモ
```

## クイックスタート（製品推薦デモ）

詳細手順は `QUICKSTART_PRODUCT_RECOMMENDATION.md` を参照。概要は以下。

1) **バックエンドを準備**  
```bash
cd apps/rag-chat-stream-backend
npm install
cat > .env <<'EOF'
RAG_STREAM_API_KEY=your-secure-api-key-min-20-chars
OPENAI_API_KEY=sk-...
QDRANT_URL=https://your-qdrant-instance.com
QDRANT_API_KEY=your-qdrant-key
EOF
npm run build
npx cdk deploy --require-approval never   # AWS資格情報が必要
```

2) **フロントエンドを起動**  
```bash
cd apps/rag-chat-frontend
npm install
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com/prod
NEXT_PUBLIC_JWT_TOKEN=your-secure-api-key-min-20-chars
EOF
npm run dev   # http://localhost:3000
```

3) **製品カタログを投入してチャット**  
`Knowledge → Create` で Markdown をアップロード → `Agents → Create` で製品推薦プリセットを選択 → チャット画面で質問。  
API での投入やサンプル Markdown は Quickstart に記載。

## アプリケーション概要

### rag-chat-stream-backend (`apps/rag-chat-stream-backend`)
- OpenAI Chat Completions 互換の RAG API。SSE/非SSE両対応。
- Qdrant + DynamoDB を使ったナレッジ／エージェント管理。
- AWS Lambda / API Gateway / CDK 構成。CloudWatch メトリクス・アラーム付き。
- 主なコマンド: `npm run build` / `npm test` / `npx cdk deploy --require-approval never`

### rag-chat-frontend (`apps/rag-chat-frontend`)
- Next.js 16 製の製品推薦チャット UI。製品 Markdown アップロード、エージェント作成、ストリーミング表示に対応。
- API 先は上記バックエンド（`NEXT_PUBLIC_API_BASE_URL` + `NEXT_PUBLIC_JWT_TOKEN`）。
- 主なコマンド: `npm run dev` / `npm test` / `npm run build`

### cashier-frontend (`apps/cashier-frontend`)
- Next.js 16 製のカフェ向けセルフオーダーUI。日本語/英語切替と Tavus アバター接客を搭載。
- ルート例: `/cashier/home` → `/cashier/order` → `/cashier/pay` → `/cashier/thanks`。旧デザインは `/casher_nomal/*`。
- Tavus 連携用に `TAVUS_API_KEY`, `REPLICA_ID`, `PERSONA_ID`（および `NEXT_PUBLIC_TAVUS_*`）を `.env.local` に設定。
- 主なコマンド: `npm run dev` / `npm test -- --runInBand` / `npm run build`

## 開発環境メモ

- Node.js 20+ 推奨（Next.js アプリも 18+ で動作可）。npm 10+。
- バックエンドは AWS アカウントと Qdrant インスタンス、OpenAI API キーが必要。
- Tavus 連携を使う場合は `*.daily.co` への通信をブロックしないようにしてください。

## ドキュメント

- 製品推薦のセットアップ: `QUICKSTART_PRODUCT_RECOMMENDATION.md`
- 各アプリ詳細: `apps/rag-chat-stream-backend/README.md`, `apps/rag-chat-frontend/README.md`, `apps/cashier-frontend/README.md`
- 仕様・背景: `.kiro/steering/*`, `.kiro/specs/*`
