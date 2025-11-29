# Yoshi Demo Assistants

デモアシスタントプロジェクト集

## プロジェクト一覧

### apps/rag-chat-sync-backend

OpenAI互換のRAGチャットAPIバックエンドサービス。

- **技術**: TypeScript, AWS Lambda, CDK, DynamoDB, Qdrant
- **機能**: RAGチャット、ナレッジスペース管理、エージェント管理
- **詳細**: [.kiro/steering/rag-chat-sync-backend.md](.kiro/steering/rag-chat-sync-backend.md)

```bash
cd apps/rag-chat-sync-backend
npm install
npm run build
npm run test
```

### apps/casher_1

カフェ向けセルフオーダーキオスクシステム。

- **技術**: React, TypeScript, Tailwind CSS
- **機能**: 直感的な注文UI、多言語対応
- **詳細**: [.kiro/steering/casher_1overview.md](.kiro/steering/casher_1overview.md)

## 開発環境

- Node.js 20+
- npm 10+
- AWS CLI (CDKプロジェクト用)

## ディレクトリ構成

```
.
├── apps/                    # アプリケーション
│   ├── rag-chat-sync-backend/
│   └── casher_1/
├── .kiro/
│   ├── specs/              # 仕様書
│   └── steering/           # プロジェクト概要
└── private/                # プライベートコード
```
