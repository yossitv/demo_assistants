# RAG Stream Backend - CRUD APIs 機能要件

## 概要

エージェントとナレッジスペースの削除・更新APIを実装し、フロントエンドのダッシュボード機能と連携する。

## 目的

- エージェントの更新・削除機能を提供
- ナレッジスペースの削除機能を提供
- DynamoDBとQdrantからデータを完全に削除

## 機能要件

### FR-1: エージェント更新API

**エンドポイント**: `PUT /v1/agent/{agentId}`

**リクエスト**:
```json
{
  "name": "string",
  "description": "string (optional)",
  "systemPrompt": "string (optional)",
  "knowledgeSpaceIds": ["string"],
  "strictRAG": boolean
}
```

**レスポンス**:
```json
{
  "agentId": "string",
  "status": "updated"
}
```

**処理**:
1. リクエストバリデーション
2. DynamoDBのエージェント情報を更新
3. 成功レスポンス返却

### FR-2: エージェント削除API

**エンドポイント**: `DELETE /v1/agent/{agentId}`

**レスポンス**: 204 No Content

**処理**:
1. DynamoDBからエージェント削除
2. 関連する会話履歴も削除（オプション）
3. 成功レスポンス返却

### FR-3: ナレッジスペース削除API

**エンドポイント**: `DELETE /v1/knowledge/{knowledgeSpaceId}`

**レスポンス**: 204 No Content

**処理**:
1. 紐付けられているエージェントをチェック
2. 紐付けがある場合は409 Conflictを返す（オプション）
3. DynamoDBからナレッジスペース削除
4. Qdrantからコレクション削除
5. 成功レスポンス返却

### FR-4: エージェント一覧取得API（オプション）

**エンドポイント**: `GET /v1/agent/list`

**レスポンス**:
```json
{
  "agents": [
    {
      "agentId": "string",
      "name": "string",
      "description": "string",
      "knowledgeSpaceIds": ["string"],
      "strictRAG": boolean,
      "createdAt": "string"
    }
  ]
}
```

## 非機能要件

### NFR-1: 認証
- すべてのエンドポイントでBearer認証を必須とする
- 既存の認証機構（API Key Authorizer）を使用

### NFR-2: エラーハンドリング
- 400: バリデーションエラー
- 403: 認証エラー
- 404: リソースが存在しない
- 409: 競合エラー（削除不可）
- 500: サーバーエラー

### NFR-3: CORS
- すべてのエンドポイントでCORSを有効化
- OPTIONS メソッドをサポート

### NFR-4: ロギング
- すべての操作をCloudWatch Logsに記録
- エラー時は詳細なスタックトレースを記録

## 制約事項

- DynamoDBのテーブル構造は既存のものを使用
- Qdrantのコレクション名は `knowledge_space_{id}` 形式
- 削除は論理削除ではなく物理削除

## 成功基準

- すべてのAPIが正常に動作する
- フロントエンドのダッシュボードから削除・更新が可能
- データがDynamoDBとQdrantから完全に削除される
- 適切なエラーハンドリングが実装されている

## セキュリティ考慮事項

- 削除操作は取り消し不可能なため、認証を厳格に行う
- 他のユーザーのリソースを削除できないようにする（将来的にマルチテナント対応時）
