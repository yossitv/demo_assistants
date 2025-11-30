# RAG Stream Backend - CRUD APIs 実装タスク

## Phase 1: リポジトリ拡張

### Task 1.1: AgentRepository拡張
- [ ] `update(agentId, data)` メソッド実装
- [ ] `delete(agentId)` メソッド実装
- [ ] `findAll()` メソッド実装
- [ ] `findByKnowledgeSpaceId(knowledgeSpaceId)` メソッド実装
- [ ] ユニットテスト作成

### Task 1.2: KnowledgeSpaceRepository拡張
- [ ] `delete(knowledgeSpaceId)` メソッド実装
- [ ] ユニットテスト作成

### Task 1.3: QdrantService拡張
- [ ] `deleteCollection(knowledgeSpaceId)` メソッド実装
- [ ] エラーハンドリング（404無視）
- [ ] ユニットテスト作成

---

## Phase 2: Use Case実装

### Task 2.1: UpdateAgentUseCase
- [ ] `src/use-cases/update-agent.use-case.ts` 作成
- [ ] リクエストバリデーション（Zod）
- [ ] エージェント存在チェック
- [ ] 更新処理
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

### Task 2.2: DeleteAgentUseCase
- [ ] `src/use-cases/delete-agent.use-case.ts` 作成
- [ ] エージェント存在チェック
- [ ] 削除処理
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

### Task 2.3: DeleteKnowledgeSpaceUseCase
- [ ] `src/use-cases/delete-knowledge.use-case.ts` 作成
- [ ] ナレッジスペース存在チェック
- [ ] 紐付けエージェントチェック（オプション）
- [ ] Qdrantコレクション削除
- [ ] DynamoDB削除
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

### Task 2.4: ListAgentsUseCase
- [ ] `src/use-cases/list-agents.use-case.ts` 作成
- [ ] 一覧取得処理
- [ ] ユニットテスト作成

---

## Phase 3: Lambda Handler実装

### Task 3.1: AgentUpdateHandler
- [ ] `src/handlers/agent-update.handler.ts` 作成
- [ ] リクエストパース
- [ ] Use Case呼び出し
- [ ] レスポンス生成
- [ ] エラーハンドリング

### Task 3.2: AgentDeleteHandler
- [ ] `src/handlers/agent-delete.handler.ts` 作成
- [ ] リクエストパース
- [ ] Use Case呼び出し
- [ ] 204レスポンス生成
- [ ] エラーハンドリング

### Task 3.3: KnowledgeDeleteHandler
- [ ] `src/handlers/knowledge-delete.handler.ts` 作成
- [ ] リクエストパース
- [ ] Use Case呼び出し
- [ ] 204レスポンス生成
- [ ] エラーハンドリング

### Task 3.4: AgentListHandler
- [ ] `src/handlers/agent-list.handler.ts` 作成
- [ ] Use Case呼び出し
- [ ] レスポンス生成
- [ ] エラーハンドリング

---

## Phase 4: API Gateway設定

### Task 4.1: ルート追加
- [ ] `PUT /v1/agent/{agentId}` ルート追加
- [ ] `DELETE /v1/agent/{agentId}` ルート追加
- [ ] `DELETE /v1/knowledge/{knowledgeSpaceId}` ルート追加
- [ ] `GET /v1/agent/list` ルート追加

### Task 4.2: CORS設定
- [ ] すべてのルートでCORS有効化
- [ ] OPTIONSメソッド追加
- [ ] 許可ヘッダー設定

### Task 4.3: 認証設定
- [ ] API Key Authorizer設定
- [ ] すべてのエンドポイントに適用

---

## Phase 5: テスト

### Task 5.1: ユニットテスト
- [ ] すべてのリポジトリメソッド
- [ ] すべてのUse Case
- [ ] バリデーション

### Task 5.2: 統合テスト
- [ ] エージェント更新フロー
- [ ] エージェント削除フロー
- [ ] ナレッジスペース削除フロー
- [ ] エージェント一覧取得フロー

### Task 5.3: エラーケーステスト
- [ ] 404エラー（存在しないリソース）
- [ ] 400エラー（バリデーションエラー）
- [ ] 409エラー（競合エラー）
- [ ] 403エラー（認証エラー）

---

## Phase 6: デプロイ

### Task 6.1: ビルド
- [ ] TypeScriptコンパイル
- [ ] Lambdaパッケージング
- [ ] 依存関係確認

### Task 6.2: CDKデプロイ
- [ ] スタック合成
- [ ] デプロイ実行
- [ ] 出力確認

### Task 6.3: 動作確認
- [ ] 各エンドポイントのテスト
- [ ] フロントエンドとの統合確認
- [ ] エラーケース確認

---

## Phase 7: モニタリング設定

### Task 7.1: CloudWatch Metrics
- [ ] カスタムメトリクス追加
- [ ] ダッシュボード作成

### Task 7.2: CloudWatch Alarms
- [ ] エラー率アラーム
- [ ] レイテンシアラーム

---

## 実装順序

1. **Phase 1**: リポジトリ拡張（基盤）
2. **Phase 2**: Use Case実装（ビジネスロジック）
3. **Phase 3**: Lambda Handler実装（エントリーポイント）
4. **Phase 4**: API Gateway設定（ルーティング）
5. **Phase 5**: テスト（品質保証）
6. **Phase 6**: デプロイ（本番投入）
7. **Phase 7**: モニタリング設定（運用）

---

## 見積もり

| Phase | 工数（時間） |
|-------|-------------|
| Phase 1 | 4h |
| Phase 2 | 6h |
| Phase 3 | 4h |
| Phase 4 | 3h |
| Phase 5 | 4h |
| Phase 6 | 2h |
| Phase 7 | 2h |
| **合計** | **25h** |

---

## 依存関係

```
Phase 1 (リポジトリ)
  ↓
Phase 2 (Use Case)
  ↓
Phase 3 (Handler)
  ↓
Phase 4 (API Gateway)
  ↓
Phase 5 (テスト)
  ↓
Phase 6 (デプロイ)
  ↓
Phase 7 (モニタリング)
```

---

## リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| DynamoDBテーブル構造不明 | 高 | 既存コード調査 |
| Qdrant削除失敗 | 中 | エラーハンドリング強化 |
| CORS設定ミス | 中 | 段階的テスト |
| 紐付けチェック複雑 | 低 | オプション機能として実装 |

---

## 完了条件

- [ ] すべてのタスクが完了
- [ ] すべてのテストがパス
- [ ] フロントエンドから削除・更新が可能
- [ ] データがDynamoDB/Qdrantから削除される
- [ ] エラーハンドリングが適切
- [ ] デプロイ成功
- [ ] ドキュメント更新
