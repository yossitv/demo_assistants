# カフェ店員エージェントシステム

## システム概要
Tavus APIを使用したカフェ店員AIエージェント。顧客との会話を通じて注文を受け付ける。

## 技術スタック
- Next.js 16.0.1
- TypeScript 5.9.3
- React 19.2.0
- Tailwind CSS + Radix UI
- Node.js 20

## ファイル構成

```
cafe-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # トップページ（会話UI）
│   │   ├── layout.tsx                     # ルートレイアウト
│   │   ├── globals.css                    # グローバルスタイル
│   │   └── api/
│   │       └── conversations/
│   │           └── route.ts               # Tavus会話API
│   ├── server/
│   │   ├── tavus/
│   │   │   ├── domain/
│   │   │   │   ├── types.ts              # ConversationRequest, ConversationResponse
│   │   │   │   └── errors.ts             # TavusError
│   │   │   ├── application/
│   │   │   │   └── create-conversation.ts # CreateConversationUseCase
│   │   │   └── infrastructure/
│   │   │       └── tavus-client.ts       # HttpTavusClient
│   │   └── context/
│   │       └── cafe-context-builder.ts   # カフェ用コンテキスト生成
│   └── components/
│       ├── ui/
│       │   ├── button.tsx
│       │   ├── input.tsx
│       │   └── label.tsx
│       └── cafe/
│           ├── conversation-starter.tsx   # 会話開始フォーム
│           └── conversation-viewer.tsx    # Tavus iframe表示
├── public/
│   └── cafe-logo.svg
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
└── .env.local
```

## 環境変数

```env
TAVUS_API_KEY=your_tavus_api_key
TAVUS_API_BASE=https://tavusapi.com
REPLICA_ID=cafe_staff_replica_id
PERSONA_ID=cafe_staff_persona_id
```

## 主要コンポーネント

### 1. `/src/app/page.tsx`
- カフェ店員との会話UI
- 顧客名入力
- 会話開始ボタン
- Tavus iframe埋め込み

### 2. `/src/app/api/conversations/route.ts`
- POST: Tavus会話作成
- リクエスト: `{ customerName: string }`
- レスポンス: `{ conversationUrl: string, conversationId: string }`

### 3. `/src/server/tavus/`
- **domain**: 型定義とエラー
- **application**: ビジネスロジック（会話作成）
- **infrastructure**: Tavus API呼び出し

### 4. `/src/server/context/cafe-context-builder.ts`
- カフェメニュー情報
- 店員ペルソナ設定
- 会話コンテキスト生成

### 5. `/src/components/cafe/`
- `conversation-starter.tsx`: 顧客名入力 + 開始ボタン
- `conversation-viewer.tsx`: Tavus会話iframe

## カフェコンテキスト

```typescript
{
  role: "カフェ店員",
  greeting: "いらっしゃいませ！ご注文をお伺いします。",
  menu: [
    { name: "ブレンドコーヒー", price: 400 },
    { name: "カフェラテ", price: 500 },
    { name: "エスプレッソ", price: 350 }
  ],
  instructions: "丁寧に注文を聞き、確認してください"
}
```

## API仕様

### POST /api/conversations
**Request:**
```json
{
  "customerName": "田中太郎"
}
```

**Response:**
```json
{
  "conversationUrl": "https://tavus.io/conversations/...",
  "conversationId": "conv_123"
}
```

## デプロイ構成

### Docker
- ベースイメージ: node:20-alpine
- ポート: 3000
- ヘルスチェック: GET /api/health

### ECS
- タスク定義: cafe-agent-task
- サービス: cafe-agent-service
- CPU: 512
- メモリ: 1024
- ネットワーク: awsvpc
- ログ: CloudWatch Logs

## ビルドコマンド

```bash
npm install
npm run build
npm start
```
