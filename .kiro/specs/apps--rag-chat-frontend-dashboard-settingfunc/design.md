# RAG Chat Frontend - Dashboard Settings 設計書

## アーキテクチャ

### ディレクトリ構成

```
apps/rag-chat-frontend/
├── app/
│   ├── dashboard/              # NEW: ダッシュボードルート
│   │   └── page.tsx           # ダッシュボードページ
│   ├── agents/
│   ├── knowledge/
│   └── ...
├── components/
│   ├── dashboard/              # NEW: ダッシュボード専用コンポーネント
│   │   ├── AgentManagementList.tsx
│   │   ├── AgentEditModal.tsx
│   │   ├── KnowledgeManagementList.tsx
│   │   └── DeleteConfirmDialog.tsx
│   ├── ChatWidget.tsx
│   └── ...
├── lib/
│   ├── api/
│   │   ├── client.ts          # UPDATE: 削除/更新API追加
│   │   └── types.ts           # UPDATE: 型定義追加
│   └── hooks/                  # NEW: カスタムフック
│       ├── useAgentManagement.ts
│       └── useKnowledgeManagement.ts
└── types/
    └── index.ts               # UPDATE: 型定義追加
```

## コンポーネント設計

### 1. DashboardPage (`app/dashboard/page.tsx`)

**責務**: ダッシュボードのメインページ

**構成**:
```tsx
- Header
- AgentManagementList
- KnowledgeManagementList
```

**状態管理**:
- なし（子コンポーネントで管理）

---

### 2. AgentManagementList (`components/dashboard/AgentManagementList.tsx`)

**責務**: エージェント一覧表示と管理操作

**Props**:
```typescript
interface AgentManagementListProps {
  // なし（内部でデータフェッチ）
}
```

**状態**:
```typescript
{
  agents: Agent[];
  loading: boolean;
  error: string | null;
  editingAgent: Agent | null;
  deletingAgentId: string | null;
}
```

**表示項目**:
- エージェント名
- 説明（truncate）
- 紐付けナレッジスペース名（バッジ表示）
- 作成日時
- 操作ボタン（チャット、編集、削除）

**操作**:
- チャット: `/agents/[agentId]` に遷移
- 編集: `AgentEditModal` を開く
- 削除: `DeleteConfirmDialog` を開く

---

### 3. AgentEditModal (`components/dashboard/AgentEditModal.tsx`)

**責務**: エージェント編集モーダル

**Props**:
```typescript
interface AgentEditModalProps {
  agent: Agent;
  knowledgeSpaces: KnowledgeSpace[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAgent: AgentUpdateRequest) => Promise<void>;
}
```

**フォーム項目**:
- name: string
- description: string
- systemPrompt: string
- knowledgeSpaceIds: string[] (multi-select)
- strictRAG: boolean

**バリデーション**:
- name: 必須、1-100文字
- description: 任意、最大500文字
- systemPrompt: 任意、最大2000文字
- knowledgeSpaceIds: 最低1つ選択

---

### 4. KnowledgeManagementList (`components/dashboard/KnowledgeManagementList.tsx`)

**責務**: ナレッジスペース一覧表示と削除

**Props**:
```typescript
interface KnowledgeManagementListProps {
  // なし（内部でデータフェッチ）
}
```

**状態**:
```typescript
{
  knowledgeSpaces: KnowledgeSpace[];
  loading: boolean;
  error: string | null;
  deletingKnowledgeId: string | null;
}
```

**表示項目**:
- ナレッジスペース名
- タイプ（バッジ）
- ステータス（バッジ）
- ドキュメント数
- 最終更新日時
- 操作ボタン（削除）

**操作**:
- 削除: `DeleteConfirmDialog` を開く（紐付けエージェント数を表示）

---

### 5. DeleteConfirmDialog (`components/dashboard/DeleteConfirmDialog.tsx`)

**責務**: 削除確認ダイアログ（汎用）

**Props**:
```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningMessage?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}
```

**表示**:
- タイトル
- メッセージ
- 警告メッセージ（オプション）
- キャンセルボタン
- 削除ボタン（危険色）

---

## API設計

### 1. エージェント削除

**エンドポイント**: `DELETE /v1/agent/{agentId}`

**リクエスト**:
```
Headers:
  Authorization: Bearer {token}
```

**レスポンス**:
```typescript
// 成功: 204 No Content
// エラー: 404 Not Found, 403 Forbidden, 500 Internal Server Error
{
  error: string;
}
```

---

### 2. エージェント更新

**エンドポイント**: `PUT /v1/agent/{agentId}`

**リクエスト**:
```typescript
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  name: string;
  description?: string;
  systemPrompt?: string;
  knowledgeSpaceIds: string[];
  strictRAG?: boolean;
}
```

**レスポンス**:
```typescript
// 成功: 200 OK
{
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  knowledgeSpaceIds: string[];
  strictRAG: boolean;
  createdAt: string;
  updatedAt: string;
}

// エラー: 400 Bad Request, 404 Not Found, 500 Internal Server Error
{
  error: string;
}
```

---

### 3. ナレッジスペース削除

**エンドポイント**: `DELETE /v1/knowledge/{knowledgeSpaceId}`

**リクエスト**:
```
Headers:
  Authorization: Bearer {token}
```

**レスポンス**:
```typescript
// 成功: 204 No Content
// エラー: 404 Not Found, 409 Conflict (紐付けあり), 500 Internal Server Error
{
  error: string;
}
```

---

## カスタムフック設計

### useAgentManagement

**責務**: エージェント管理ロジック

**戻り値**:
```typescript
{
  agents: Agent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateAgent: (id: string, data: AgentUpdateRequest) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}
```

---

### useKnowledgeManagement

**責務**: ナレッジスペース管理ロジック

**戻り値**:
```typescript
{
  knowledgeSpaces: KnowledgeSpace[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deleteKnowledgeSpace: (id: string) => Promise<void>;
  getLinkedAgentCount: (id: string) => number;
}
```

---

## 状態管理

### グローバル状態
- なし（各コンポーネントでローカル状態管理）

### ローカル状態
- フェッチデータ（agents, knowledgeSpaces）
- UI状態（loading, error, modal open/close）
- フォーム状態（編集中のデータ）

---

## エラーハンドリング

### エラー種別

| エラー | 表示方法 | リトライ |
|--------|---------|---------|
| ネットワークエラー | トースト通知 + リトライボタン | 手動 |
| 認証エラー (401) | トースト通知 + ログイン誘導 | なし |
| 権限エラー (403) | トースト通知 | なし |
| リソース未存在 (404) | トースト通知 + 一覧更新 | なし |
| 競合エラー (409) | ダイアログ表示（詳細説明） | なし |
| サーバーエラー (500) | トースト通知 + リトライボタン | 手動 |

### エラーメッセージ例

```typescript
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'ネットワークエラーが発生しました。再試行してください。',
  AUTH_ERROR: '認証エラーです。再ログインしてください。',
  NOT_FOUND: 'リソースが見つかりません。',
  CONFLICT: 'このナレッジスペースは他のエージェントに紐付けられています。',
  SERVER_ERROR: 'サーバーエラーが発生しました。しばらくしてから再試行してください。',
};
```

---

## UI/UXデザイン

### レイアウト

```
+--------------------------------------------------+
| Dashboard                                         |
+--------------------------------------------------+
| [+ Create Agent]  [+ Create Knowledge Space]     |
+--------------------------------------------------+
|                                                   |
| Agents                                            |
| +----------------------------------------------+ |
| | Name | Description | Knowledge | Actions    | |
| |------|-------------|-----------|------------| |
| | ...  | ...         | [badge]   | [buttons]  | |
| +----------------------------------------------+ |
|                                                   |
| Knowledge Spaces                                  |
| +----------------------------------------------+ |
| | Name | Type | Status | Docs | Actions       | |
| |------|------|--------|------|---------------| |
| | ...  | ...  | ...    | ...  | [buttons]     | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### カラースキーム

- 削除ボタン: `bg-red-600 hover:bg-red-700`
- 編集ボタン: `bg-blue-600 hover:bg-blue-700`
- チャットボタン: `bg-green-600 hover:bg-green-700`
- 警告メッセージ: `bg-yellow-50 border-yellow-400 text-yellow-800`

---

## テスト戦略

### ユニットテスト

- カスタムフック（useAgentManagement, useKnowledgeManagement）
- APIクライアント関数（deleteAgent, updateAgent, deleteKnowledgeSpace）
- バリデーション関数

### コンポーネントテスト

- AgentManagementList: 一覧表示、操作ボタン
- AgentEditModal: フォーム入力、バリデーション、保存
- KnowledgeManagementList: 一覧表示、削除
- DeleteConfirmDialog: 表示、確認/キャンセル

### 統合テスト

- ダッシュボードページ全体のフロー
- エージェント編集 → 保存 → 一覧更新
- ナレッジスペース削除 → 一覧更新

---

## パフォーマンス最適化

- 一覧データのキャッシング（React Query推奨）
- 楽観的UI更新（削除/更新時）
- 仮想スクロール（大量データ対応）
- デバウンス（検索フィルタ）

---

## セキュリティ考慮事項

- すべてのAPI呼び出しに認証トークン付与
- XSS対策（入力値のサニタイズ）
- CSRF対策（必要に応じてトークン）
- 削除操作の二重確認

---

## 実装優先順位

1. APIクライアント拡張（削除/更新）
2. カスタムフック実装
3. DeleteConfirmDialog実装
4. AgentManagementList実装
5. KnowledgeManagementList実装
6. AgentEditModal実装
7. DashboardPage統合
8. テスト実装
