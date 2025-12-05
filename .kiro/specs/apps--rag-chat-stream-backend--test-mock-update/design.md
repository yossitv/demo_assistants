# Design Document

## Overview

本設計は、リポジトリインターフェースの変更に伴うテストモック実装の更新を定義します。Agent Manager API機能の実装時に追加されたdelete/update/deleteCollectionメソッドに対応するため、2つのテストファイルのモック実装を更新します。

## Architecture

### 影響を受けるファイル

```
apps/rag-chat-stream-backend/
├── src/
│   ├── use-cases/
│   │   └── CreateKnowledgeSpaceUseCase.property.test.ts  ← 更新対象
│   └── infrastructure/
│       └── integration/
│           └── CompleteFlow.integration.test.ts          ← 更新対象
```

### リポジトリインターフェースの変更

以下のメソッドが新規追加されている：

**IKnowledgeSpaceRepository**:
```typescript
delete(tenantId: string, ksId: string): Promise<void>;
```

**IAgentRepository**:
```typescript
update(agent: Agent): Promise<void>;
delete(tenantId: string, agentId: string): Promise<void>;
```

**IVectorRepository**:
```typescript
deleteCollection(collectionName: string): Promise<void>;
```

## Components and Interfaces

### 1. CreateKnowledgeSpaceUseCase.property.test.ts の更新

**現在の実装（不完全）**:
```typescript
const knowledgeSpaceRepo: IKnowledgeSpaceRepository = {
  save: jest.fn(async (ks: KnowledgeSpace) => {
    savedKnowledgeSpaces.push(ks);
  }),
  findByTenant: jest.fn(),
  findByTenantAndId: jest.fn()
  // delete メソッドが欠落
};

const vectorRepo: IVectorRepository = {
  upsertChunks: jest.fn(async (namespace: Namespace, chunks: Chunk[]) => {
    upsertedChunks.set(namespace.toString(), chunks);
  }),
  searchSimilar: jest.fn(async (namespace: Namespace, _queryEmbedding: Embedding, topK: number) => {
    const chunks = upsertedChunks.get(namespace.toString()) || [];
    return chunks.slice(0, topK).map(chunk => ({
      chunk,
      score: 0.9
    }));
  })
  // deleteCollection メソッドが欠落
};
```

**更新後の実装**:
```typescript
const knowledgeSpaceRepo: IKnowledgeSpaceRepository = {
  save: jest.fn(async (ks: KnowledgeSpace) => {
    savedKnowledgeSpaces.push(ks);
  }),
  findByTenant: jest.fn(),
  findByTenantAndId: jest.fn(),
  delete: jest.fn(async (tenantId: string, ksId: string) => {
    // テスト用のモック実装 - 実際の削除処理は不要
    const index = savedKnowledgeSpaces.findIndex(
      ks => ks.tenantId === tenantId && ks.knowledgeSpaceId === ksId
    );
    if (index !== -1) {
      savedKnowledgeSpaces.splice(index, 1);
    }
  })
};

const vectorRepo: IVectorRepository = {
  upsertChunks: jest.fn(async (namespace: Namespace, chunks: Chunk[]) => {
    upsertedChunks.set(namespace.toString(), chunks);
  }),
  searchSimilar: jest.fn(async (namespace: Namespace, _queryEmbedding: Embedding, topK: number) => {
    const chunks = upsertedChunks.get(namespace.toString()) || [];
    return chunks.slice(0, topK).map(chunk => ({
      chunk,
      score: 0.9
    }));
  }),
  deleteCollection: jest.fn(async (collectionName: string) => {
    // テスト用のモック実装 - コレクションを削除
    upsertedChunks.delete(collectionName);
  })
};
```

**変更箇所**:
- Line ~38: `delete` メソッドを追加
- Line ~51: `deleteCollection` メソッドを追加

### 2. CompleteFlow.integration.test.ts の更新

**InMemoryKnowledgeSpaceRepository の更新**:
```typescript
class InMemoryKnowledgeSpaceRepository implements IKnowledgeSpaceRepository {
  private knowledgeSpaces: Map<string, KnowledgeSpace> = new Map();

  async save(ks: KnowledgeSpace): Promise<void> {
    const key = `${ks.tenantId}:${ks.knowledgeSpaceId}`;
    this.knowledgeSpaces.set(key, ks);
  }

  async findByTenant(tenantId: string): Promise<KnowledgeSpace[]> {
    return Array.from(this.knowledgeSpaces.values())
      .filter(ks => ks.tenantId === tenantId);
  }

  async findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null> {
    const key = `${tenantId}:${ksId}`;
    return this.knowledgeSpaces.get(key) || null;
  }

  // 新規追加
  async delete(tenantId: string, ksId: string): Promise<void> {
    const key = `${tenantId}:${ksId}`;
    this.knowledgeSpaces.delete(key);
  }
}
```

**InMemoryAgentRepository の更新**:
```typescript
class InMemoryAgentRepository implements IAgentRepository {
  private agents: Map<string, Agent> = new Map();

  async save(agent: Agent): Promise<void> {
    const key = `${agent.tenantId}:${agent.agentId}`;
    this.agents.set(key, agent);
  }

  async findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null> {
    const key = `${tenantId}:${agentId}`;
    return this.agents.get(key) || null;
  }

  // 新規追加
  async update(agent: Agent): Promise<void> {
    const key = `${agent.tenantId}:${agent.agentId}`;
    if (this.agents.has(key)) {
      this.agents.set(key, agent);
    }
  }

  // 新規追加
  async delete(tenantId: string, agentId: string): Promise<void> {
    const key = `${tenantId}:${agentId}`;
    this.agents.delete(key);
  }
}
```

**InMemoryVectorRepository の更新**:
```typescript
class InMemoryVectorRepository implements IVectorRepository {
  private collections: Map<string, Chunk[]> = new Map();

  async upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void> {
    const collectionName = namespace.toString();
    this.collections.set(collectionName, chunks);
  }

  async searchSimilar(
    namespace: Namespace,
    queryEmbedding: Embedding,
    topK: number
  ): Promise<SearchResult[]> {
    const collectionName = namespace.toString();
    const chunks = this.collections.get(collectionName) || [];
    return chunks.slice(0, topK).map(chunk => ({
      chunk,
      score: 0.9
    }));
  }

  // 新規追加
  async deleteCollection(collectionName: string): Promise<void> {
    this.collections.delete(collectionName);
  }
}
```

**変更箇所**:
- Line ~47: `InMemoryKnowledgeSpaceRepository` に `delete` メソッドを追加
- Line ~69: `InMemoryAgentRepository` に `update` と `delete` メソッドを追加
- Line ~103: `InMemoryVectorRepository` に `deleteCollection` メソッドを追加

## Data Models

変更なし。既存のエンティティとインターフェースをそのまま使用。

## Error Handling

モック実装のため、エラーハンドリングは最小限：

- 存在しないエンティティの削除は静かに無視（エラーをスローしない）
- 存在しないエンティティの更新は静かに無視（エラーをスローしない）
- テストの独立性を保つため、各テストケースで新しいモックインスタンスを作成

## Testing Strategy

### 検証方法

1. **コンパイルチェック**:
   ```bash
   cd apps/rag-chat-stream-backend
   npm run build
   ```
   TypeScriptエラーが出ないことを確認

2. **テスト実行**:
   ```bash
   npm run test
   ```
   全テストがパスすることを確認

3. **特定のテストファイル実行**:
   ```bash
   npm test -- CreateKnowledgeSpaceUseCase.property.test.ts
   npm test -- CompleteFlow.integration.test.ts
   ```

### 期待される結果

- TypeScriptコンパイルエラー: 0件
- テスト結果: 342 passed, 0 failed
- テストスイート: 40 passed, 0 failed

## Implementation Notes

### 実装の優先順位

1. **Phase 1**: `CreateKnowledgeSpaceUseCase.property.test.ts` の更新
   - `knowledgeSpaceRepo` に `delete` メソッド追加
   - `vectorRepo` に `deleteCollection` メソッド追加

2. **Phase 2**: `CompleteFlow.integration.test.ts` の更新
   - `InMemoryKnowledgeSpaceRepository` に `delete` メソッド追加
   - `InMemoryAgentRepository` に `update` と `delete` メソッド追加
   - `InMemoryVectorRepository` に `deleteCollection` メソッド追加

3. **Phase 3**: 検証
   - コンパイルチェック
   - 全テスト実行
   - 結果確認

### 注意事項

- モック実装は最小限の機能のみ実装（テストが通ればOK）
- 既存のテストロジックは一切変更しない
- jest.fn() を使用してモック関数として実装
- テストの独立性を保つため、グローバル状態を持たない

### 後方互換性

- 既存のテストケースは全て変更なし
- 既存のモックの動作は全て維持
- 新規メソッドは既存テストに影響を与えない

## Performance Considerations

パフォーマンスへの影響なし。モック実装はメモリ内で完結し、実際のI/Oは発生しない。
