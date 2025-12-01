# RAG Chat Sync Frontend Migration Design

## アーキテクチャ

### 移植後のディレクトリ構造

```
apps/rag-chat-sync-frontend/
├── app/                    # Next.js App Router
│   ├── agents/            # エージェント管理
│   │   ├── create/
│   │   └── [agentId]/
│   ├── knowledge/         # ナレッジスペース管理
│   │   └── create/
│   ├── embed/             # 埋め込みウィジェット
│   │   ├── [agentId]/
│   │   └── layout.tsx
│   ├── default/           # デフォルトページ
│   ├── page.tsx           # ホームページ
│   ├── layout.tsx         # ルートレイアウト
│   ├── globals.css        # グローバルスタイル
│   └── favicon.ico
├── components/            # Reactコンポーネント
│   ├── ChatWidget.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── CreateAgentForm.tsx
│   ├── CreateKnowledgeSpaceForm.tsx
│   ├── KnowledgeSpaceList.tsx
│   ├── Navigation.tsx
│   ├── ErrorMessage.tsx
│   └── LoadingSpinner.tsx
├── lib/                   # ライブラリ
│   ├── api/              # APIクライアント
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── error.ts
│   │   └── errors.ts
│   ├── context/          # React Context
│   │   ├── ChatContext.tsx
│   │   └── KnowledgeContext.tsx
│   └── utils/            # ユーティリティ
│       ├── validation.ts
│       └── storage.ts
├── types/                # TypeScript型定義
│   └── index.ts
├── public/               # 静的ファイル
│   ├── embed-example.html
│   └── *.svg
├── __tests__/           # テスト
│   ├── components/
│   ├── context/
│   ├── api/
│   └── integration/
├── package.json
├── next.config.ts
├── tsconfig.json
├── jest.config.js
├── eslint.config.mjs
├── postcss.config.mjs
├── .env.example
├── .gitignore
├── README.md
└── EMBED_IMPLEMENTATION.md
```

## 移植戦略

### Phase 1: ディレクトリとファイルのコピー
1. `apps/rag-chat-sync-frontend/` ディレクトリ作成
2. 全ソースコードをコピー
3. 設定ファイルをコピー
4. ドキュメントをコピー

### Phase 2: 設定ファイルの更新
1. `package.json` の name を `"rag-chat-sync-frontend"` に変更
2. description を更新

### Phase 3: 依存関係のインストール
1. `npm install` 実行
2. node_modules 生成確認

### Phase 4: ビルドとテスト
1. TypeScript型チェック (`npm run type-check`)
2. Lint実行 (`npm run lint`)
3. テスト実行 (`npm test`)
4. ビルド実行 (`npm run build`)

### Phase 5: Git コミット
1. 変更をステージング
2. コミット: `"feat: migrate RAG Chat Sync Frontend to apps/"`

## バックエンド連携

### 環境変数
```
NEXT_PUBLIC_API_URL=<backend-api-url>
NEXT_PUBLIC_JWT_TOKEN=<jwt-token>
```

### API統合
- `lib/api/client.ts` でバックエンドAPIと通信
- OpenAI互換チャットAPI使用
- JWT認証

## テスト戦略

### テストカテゴリ
1. **コンポーネントテスト**: React Testing Library
2. **Contextテスト**: React Context動作確認
3. **APIテスト**: APIクライアント動作確認
4. **統合テスト**: エンドツーエンドフロー
5. **プロパティベーステスト**: fast-check使用

### テスト実行
```bash
npm test              # 全テスト実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ
```

## デプロイオプション

1. **Vercel**: `npm run build:vercel`
2. **Standalone**: `npm run build:standalone`
3. **Static Export**: `npm run build:static`

## 検証項目

- [ ] 全ファイルが正しくコピーされている
- [ ] package.json が更新されている
- [ ] npm install が成功する
- [ ] 型チェックが通る
- [ ] Lintが通る
- [ ] 全テストがパスする
- [ ] ビルドが成功する
- [ ] 開発サーバーが起動する
