# RAG Chat Frontend - Dashboard Settings タスク

## Phase 1: 基盤整備

### Task 1.1: 型定義追加
- [ ] `types/index.ts` に以下を追加:
  - `AgentUpdateRequest`
  - `DeleteResponse`
  - エラー型定義

### Task 1.2: APIクライアント拡張
- [ ] `lib/api/client.ts` に以下を追加:
  - `deleteAgent(agentId: string): Promise<void>`
  - `updateAgent(agentId: string, data: AgentUpdateRequest): Promise<Agent>`
  - `deleteKnowledgeSpace(knowledgeSpaceId: string): Promise<void>`
- [ ] エラーハンドリング実装
- [ ] ユニットテスト作成

### Task 1.3: カスタムフック実装
- [ ] `lib/hooks/useAgentManagement.ts` 作成
  - agents取得
  - updateAgent
  - deleteAgent
  - refetch
- [ ] `lib/hooks/useKnowledgeManagement.ts` 作成
  - knowledgeSpaces取得
  - deleteKnowledgeSpace
  - getLinkedAgentCount
  - refetch
- [ ] ユニットテスト作成

---

## Phase 2: 共通コンポーネント

### Task 2.1: DeleteConfirmDialog実装
- [ ] `components/dashboard/DeleteConfirmDialog.tsx` 作成
- [ ] Props定義
- [ ] UI実装（モーダル、ボタン）
- [ ] ローディング状態対応
- [ ] コンポーネントテスト作成

### Task 2.2: トースト通知コンポーネント
- [ ] `components/common/Toast.tsx` 作成（または既存利用）
- [ ] 成功/エラー/警告の表示
- [ ] 自動消去機能

---

## Phase 3: エージェント管理

### Task 3.1: AgentManagementList実装
- [ ] `components/dashboard/AgentManagementList.tsx` 作成
- [ ] useAgentManagement統合
- [ ] 一覧表示UI実装
  - テーブルレイアウト
  - バッジ表示（ナレッジスペース）
  - 操作ボタン（チャット、編集、削除）
- [ ] 削除機能実装
  - DeleteConfirmDialog統合
  - 削除API呼び出し
  - 成功/エラーハンドリング
- [ ] ローディング/エラー状態表示
- [ ] コンポーネントテスト作成

### Task 3.2: AgentEditModal実装
- [ ] `components/dashboard/AgentEditModal.tsx` 作成
- [ ] フォーム実装
  - name入力
  - description入力
  - systemPrompt入力（textarea）
  - knowledgeSpaceIds選択（multi-select）
  - strictRAG切り替え
- [ ] バリデーション実装
- [ ] 保存機能実装
  - updateAgent API呼び出し
  - 成功/エラーハンドリング
- [ ] モーダル開閉制御
- [ ] コンポーネントテスト作成

---

## Phase 4: ナレッジスペース管理

### Task 4.1: KnowledgeManagementList実装
- [ ] `components/dashboard/KnowledgeManagementList.tsx` 作成
- [ ] useKnowledgeManagement統合
- [ ] 一覧表示UI実装
  - テーブルレイアウト
  - バッジ表示（type, status）
  - ドキュメント数表示
  - 操作ボタン（削除）
- [ ] 削除機能実装
  - 紐付けエージェント数チェック
  - DeleteConfirmDialog統合（警告メッセージ付き）
  - 削除API呼び出し
  - 成功/エラーハンドリング
- [ ] ローディング/エラー状態表示
- [ ] コンポーネントテスト作成

---

## Phase 5: ダッシュボードページ

### Task 5.1: DashboardPage実装
- [ ] `app/dashboard/page.tsx` 作成
- [ ] レイアウト実装
  - ヘッダー
  - 作成ボタン（既存ページへのリンク）
  - AgentManagementList配置
  - KnowledgeManagementList配置
- [ ] ナビゲーション追加（既存メニューに「Dashboard」追加）
- [ ] レスポンシブ対応

---

## Phase 6: バックエンド対応（rag-chat-stream-backend）

### Task 6.1: エージェント削除API実装
- [ ] `DELETE /v1/agent/{agentId}` エンドポイント作成
- [ ] DynamoDBからエージェント削除
- [ ] 認証チェック
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

### Task 6.2: エージェント更新API実装
- [ ] `PUT /v1/agent/{agentId}` エンドポイント作成
- [ ] リクエストバリデーション
- [ ] DynamoDBでエージェント更新
- [ ] 認証チェック
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

### Task 6.3: ナレッジスペース削除API実装
- [ ] `DELETE /v1/knowledge/{knowledgeSpaceId}` エンドポイント作成
- [ ] 紐付けエージェントチェック（409 Conflict）
- [ ] DynamoDBからナレッジスペース削除
- [ ] Qdrantからコレクション削除
- [ ] 認証チェック
- [ ] エラーハンドリング
- [ ] ユニットテスト作成

---

## Phase 7: 統合テスト

### Task 7.1: E2Eテスト
- [ ] ダッシュボードページ表示テスト
- [ ] エージェント削除フローテスト
- [ ] エージェント編集フローテスト
- [ ] ナレッジスペース削除フローテスト
- [ ] エラーケーステスト

### Task 7.2: 手動テスト
- [ ] 各ブラウザでの動作確認（Chrome, Firefox, Safari）
- [ ] レスポンシブデザイン確認
- [ ] エラーメッセージ確認
- [ ] パフォーマンス確認

---

## Phase 8: ドキュメント

### Task 8.1: ドキュメント更新
- [ ] `.kiro/steering/rag-chat-frontend-overview.md` 更新
- [ ] README更新（ダッシュボード機能追加）
- [ ] API仕様書更新

### Task 8.2: 使用例追加
- [ ] ダッシュボード使用例のスクリーンショット
- [ ] 操作手順ドキュメント

---

## 実装順序

1. **Phase 1**: 基盤整備（型定義、APIクライアント、カスタムフック）
2. **Phase 2**: 共通コンポーネント（DeleteConfirmDialog）
3. **Phase 6**: バックエンドAPI実装（並行可能）
4. **Phase 3**: エージェント管理UI
5. **Phase 4**: ナレッジスペース管理UI
6. **Phase 5**: ダッシュボードページ統合
7. **Phase 7**: 統合テスト
8. **Phase 8**: ドキュメント

---

## 見積もり

| Phase | 工数（時間） |
|-------|-------------|
| Phase 1 | 4h |
| Phase 2 | 2h |
| Phase 3 | 6h |
| Phase 4 | 4h |
| Phase 5 | 2h |
| Phase 6 | 8h |
| Phase 7 | 4h |
| Phase 8 | 2h |
| **合計** | **32h** |

---

## 依存関係

```
Phase 1 (基盤整備)
  ↓
Phase 2 (共通コンポーネント) + Phase 6 (バックエンド)
  ↓
Phase 3 (エージェント管理) + Phase 4 (ナレッジスペース管理)
  ↓
Phase 5 (ダッシュボードページ)
  ↓
Phase 7 (統合テスト)
  ↓
Phase 8 (ドキュメント)
```

---

## リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| バックエンドAPI未実装 | 高 | Phase 6を優先実施 |
| 紐付け変更の複雑性 | 中 | 段階的実装（まず削除、次に編集） |
| 大量データでのパフォーマンス | 中 | ページネーション/仮想スクロール検討 |
| 既存機能への影響 | 低 | 既存コンポーネント再利用、テスト充実 |

---

## 完了条件

- [ ] すべてのタスクが完了
- [ ] すべてのテストがパス
- [ ] ドキュメントが更新されている
- [ ] コードレビュー完了
- [ ] 手動テスト完了
- [ ] デプロイ成功
