# RAG Chat Frontend - Product Recommendation

## プロジェクト説明

製品推薦機能を持つRAGチャットフロントエンドアプリケーション。
Markdownファイルから製品データをアップロードし、AIエージェントによる製品推薦をストリーミングチャットで提供します。

## 技術スタック

- **フレームワーク**: Next.js 16.x (App Router)
- **UI**: React 19.x + TypeScript 5.x
- **スタイリング**: Tailwind CSS 4.x
- **テスト**: Jest + React Testing Library + fast-check
- **バックエンド連携**: rag-chat-stream-backend (SSE streaming)

## アーキテクチャ

### ベースプロジェクト

`apps/rag-chat-sync-frontend` をコピーして拡張

### 主要な拡張機能

1. **製品アップロード**
   - Markdownファイル（最大10MB）のアップロード
   - クライアントサイドバリデーション（拡張子、サイズ）
   - multipart/form-data形式でバックエンドに送信
   - アップロード結果表示（成功/部分成功/エラー）

2. **製品表示**
   - ProductCardコンポーネント（製品情報をカード形式で表示）
   - チャットメッセージから製品JSONを抽出
   - グリッドレイアウト（複数製品）
   - プレースホルダー対応（画像、価格など）

3. **エージェントプリセット**
   - 製品推薦プリセット選択
   - 自動入力（description、strictRAG、system prompt）
   - Knowledge Spaceフィルタリング（type='product'のみ）

4. **ストリーミングチャット**
   - SSE（Server-Sent Events）による段階的表示
   - ストップボタン（AbortController）
   - エラーハンドリングとリトライ

## ディレクトリ構成

```
apps/rag-chat-frontend/
├── app/                          # Next.js App Router
│   ├── agents/                   # エージェント関連ページ
│   │   ├── [agentId]/           # チャットインターフェース
│   │   └── create/              # エージェント作成
│   ├── knowledge/               # Knowledge Space管理
│   │   └── create/              # Knowledge Space作成（ファイルアップロード）
│   ├── embed/                   # 埋め込みウィジェット
│   └── page.tsx                 # ホームページ
├── components/                   # Reactコンポーネント
│   ├── ChatWidget.tsx           # メインチャットコンポーネント
│   ├── ProductCard.tsx          # 製品カード（NEW）
│   ├── ProductUploadForm.tsx    # 製品アップロードフォーム（NEW）
│   ├── CreateAgentForm.tsx      # エージェント作成（プリセット対応）
│   ├── KnowledgeSpaceList.tsx   # Knowledge Spaceリスト
│   ├── MessageList.tsx          # メッセージ表示
│   ├── MessageInput.tsx         # チャット入力
│   └── ...
├── lib/                         # ライブラリコード
│   ├── api/                     # APIクライアント
│   │   ├── client.ts           # 統合APIクライアント
│   │   ├── types.ts            # API型定義
│   │   └── errors.ts           # エラーハンドリング
│   ├── context/                # Reactコンテキスト
│   │   ├── ChatContext.tsx
│   │   └── KnowledgeContext.tsx
│   └── utils/                  # ユーティリティ
│       ├── validation.ts
│       └── storage.ts
├── types/                       # TypeScript型定義
│   └── index.ts                # Product, KnowledgeSpace, Agent等
└── __tests__/                  # テスト
```

## 主要コンポーネント

### 新規コンポーネント

#### ProductUploadForm
- ファイル選択（input + drag-and-drop）
- クライアントサイドバリデーション
- アップロード進捗表示
- 結果表示（成功数、失敗数、エラー詳細）

#### ProductCard
- 製品情報表示（name, price, description, image, etc.）
- プレースホルダー対応
- 引用URL表示
- レスポンシブレイアウト

### 拡張コンポーネント

#### CreateAgentForm
- プリセットドロップダウン追加
- 自動入力機能
- Knowledge Spaceフィルタリング

#### ChatWidget
- 製品抽出ロジック追加
- ProductCard統合
- ストリーミング対応確認

#### KnowledgeSpaceList
- typeバッジ表示（web/product/document）
- statusインジケーター（processing/completed/partial/error）
- documentCount表示
- typeフィルタリング
- エラー詳細表示

## データモデル

### Product (types/index.ts)

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  category?: string;
  price?: number;
  currency?: string;
  availability?: string;
  tags?: string[];
  imageUrl?: string;
  productUrl?: string;
  brand?: string;
  updatedAt?: string;
}
```

### KnowledgeSpace (拡張)

```typescript
interface KnowledgeSpace {
  id: string;
  name: string;
  type: 'web' | 'document' | 'product' | 'custom';
  status?: 'processing' | 'completed' | 'partial' | 'error';
  documentCount?: number;
  lastUpdatedAt: Date;
  metadata?: {
    sourceType?: 'url' | 'file';
    schemaVersion?: string;
    summary?: {
      successCount: number;
      failureCount: number;
      errors: ParseError[];
    };
  };
}
```

## API連携

### バックエンド: rag-chat-stream-backend

#### エンドポイント

- `POST /v1/chat/completions` - ストリーミングチャット（SSE）
- `POST /v1/knowledge/create` - Knowledge Space作成（multipart対応）
- `GET /v1/knowledge/list` - Knowledge Spaceリスト取得
- `POST /v1/agent/create` - エージェント作成

#### 認証

Bearer Token認証:
```
Authorization: Bearer ${NEXT_PUBLIC_JWT_TOKEN}
```

### 製品データフォーマット

Markdown形式（区切り文字ベース）:

```markdown
--- item start ---
id: prod-001
name: Product Name
category: Electronics
price: 99.99
currency: USD
availability: in_stock
tags: [tag1, tag2]
imageUrl: https://example.com/image.jpg
productUrl: https://example.com/product
brand: Brand Name
### description
Multi-line product description.
Can include multiple paragraphs.
--- item end ---
```

### LLMレスポンス形式

製品推薦時のレスポンス:

```
[自然言語での説明]

```json
{
  "products": [
    {
      "id": "prod-001",
      "name": "Product Name",
      "description": "...",
      "price": 99.99,
      "currency": "USD",
      ...
    }
  ]
}
```
```

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# テスト実行
npm test
npm run test:watch
npm run test:coverage

# 型チェック
npm run type-check

# リント
npm run lint

# ビルド
npm run build
npm run start
```

## 環境変数

`.env.local` に設定:

```bash
NEXT_PUBLIC_API_BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_JWT_TOKEN=your-api-key-here
```

## 実装フェーズ

### Phase 4: 製品アップロードUI
- [ ] ProductUploadFormコンポーネント作成
- [ ] ファイルバリデーション実装
- [ ] アップロードロジック実装
- [ ] 結果表示実装

### Phase 5: エージェント作成拡張
- [ ] CreateAgentFormにプリセット追加
- [ ] 自動入力機能実装
- [ ] Knowledge Spaceフィルタリング実装

### Phase 6: 製品表示
- [ ] ProductCardコンポーネント作成
- [ ] 製品抽出ロジック実装
- [ ] ChatWidget統合
- [ ] グリッドレイアウト実装

### Phase 7: ストリーミング統合
- [ ] ストリーミングAPI統合確認
- [ ] ストップボタン実装
- [ ] エラーハンドリング実装

### Phase 8-9: テストと統合
- [ ] プロパティベーステスト実装
- [ ] 統合テスト実装
- [ ] エラーハンドリング強化

## テスト戦略

### ユニットテスト
- コンポーネント単体テスト（Jest + React Testing Library）
- ユーティリティ関数テスト

### プロパティベーステスト
- fast-checkによる網羅的テスト
- ファイルバリデーション
- 製品抽出ロジック
- フォーム状態管理

### 統合テスト
- エンドツーエンドフロー
- アップロード → Knowledge Space作成
- エージェント作成 → チャット → 製品表示

## トラブルシューティング

### CORS問題
バックエンドのAPI GatewayでCORS設定を確認

### 認証エラー
- `NEXT_PUBLIC_JWT_TOKEN`がバックエンドの`RAG_STREAM_API_KEY`と一致するか確認
- CloudWatchログで認証エラーを確認

### ビルドエラー
```bash
rm -rf .next
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

## 関連プロジェクト

- [rag-chat-stream-backend](../rag-chat-stream-backend) - バックエンドAPI
- [rag-chat-sync-frontend](../rag-chat-sync-frontend) - ベースフロントエンド

## 関連仕様

- `.kiro/specs/apps--rag-chat-frontend-product-recommend/requirements.md`
- `.kiro/specs/apps--rag-chat-frontend-product-recommend/design.md`
- `.kiro/specs/apps--rag-chat-frontend-product-recommend/tasks.md`

## コーディング規約

- 関数コンポーネント使用
- TypeScript型定義必須
- コメントは日本語・英語どちらでも可
- ファイル命名: PascalCase（コンポーネント）、kebab-case（ユーティリティ）
- 最小限のコード実装（冗長な実装を避ける）
