# RAG Stream Backend - CRUD APIs 設計書

## アーキテクチャ

### ディレクトリ構成

```
apps/rag-chat-stream-backend/
├── src/
│   ├── handlers/
│   │   ├── agent-update.handler.ts       # NEW: PUT /v1/agent/{id}
│   │   ├── agent-delete.handler.ts       # NEW: DELETE /v1/agent/{id}
│   │   ├── agent-list.handler.ts         # NEW: GET /v1/agent/list
│   │   └── knowledge-delete.handler.ts   # NEW: DELETE /v1/knowledge/{id}
│   ├── use-cases/
│   │   ├── update-agent.use-case.ts      # NEW
│   │   ├── delete-agent.use-case.ts      # NEW
│   │   ├── list-agents.use-case.ts       # NEW
│   │   └── delete-knowledge.use-case.ts  # NEW
│   └── infrastructure/
│       └── repositories/
│           ├── agent.repository.ts       # UPDATE: add update/delete
│           └── knowledge.repository.ts   # UPDATE: add delete
└── infrastructure/
    └── lib/
        └── api-stack.ts                  # UPDATE: add new routes
```

## API設計

### 1. エージェント更新API

**エンドポイント**: `PUT /v1/agent/{agentId}`

**Lambda Handler**: `agent-update.handler.ts`

**Use Case**: `UpdateAgentUseCase`

**処理フロー**:
```
1. リクエストバリデーション (Zod)
2. AgentRepository.findById(agentId)
3. 存在チェック (404)
4. AgentRepository.update(agentId, data)
5. レスポンス返却
```

**バリデーション**:
```typescript
const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  knowledgeSpaceIds: z.array(z.string()).min(1),
  strictRAG: z.boolean().optional(),
});
```

---

### 2. エージェント削除API

**エンドポイント**: `DELETE /v1/agent/{agentId}`

**Lambda Handler**: `agent-delete.handler.ts`

**Use Case**: `DeleteAgentUseCase`

**処理フロー**:
```
1. AgentRepository.findById(agentId)
2. 存在チェック (404)
3. AgentRepository.delete(agentId)
4. (オプション) ConversationRepository.deleteByAgentId(agentId)
5. 204 No Content
```

---

### 3. ナレッジスペース削除API

**エンドポイント**: `DELETE /v1/knowledge/{knowledgeSpaceId}`

**Lambda Handler**: `knowledge-delete.handler.ts`

**Use Case**: `DeleteKnowledgeSpaceUseCase`

**処理フロー**:
```
1. KnowledgeSpaceRepository.findById(knowledgeSpaceId)
2. 存在チェック (404)
3. (オプション) AgentRepository.findByKnowledgeSpaceId(knowledgeSpaceId)
4. (オプション) 紐付けチェック (409 Conflict)
5. QdrantService.deleteCollection(knowledgeSpaceId)
6. KnowledgeSpaceRepository.delete(knowledgeSpaceId)
7. 204 No Content
```

---

### 4. エージェント一覧取得API

**エンドポイント**: `GET /v1/agent/list`

**Lambda Handler**: `agent-list.handler.ts`

**Use Case**: `ListAgentsUseCase`

**処理フロー**:
```
1. AgentRepository.findAll()
2. レスポンス返却
```

---

## リポジトリ拡張

### AgentRepository

```typescript
interface IAgentRepository {
  // 既存
  create(agent: Agent): Promise<void>;
  findById(agentId: string): Promise<Agent | null>;
  
  // 新規
  update(agentId: string, data: Partial<Agent>): Promise<void>;
  delete(agentId: string): Promise<void>;
  findAll(): Promise<Agent[]>;
  findByKnowledgeSpaceId(knowledgeSpaceId: string): Promise<Agent[]>;
}
```

**DynamoDB実装**:
```typescript
async update(agentId: string, data: Partial<Agent>): Promise<void> {
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  
  if (data.name) {
    updateExpression.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = data.name;
  }
  // ... 他のフィールド
  
  await this.dynamoClient.send(new UpdateItemCommand({
    TableName: this.tableName,
    Key: { PK: { S: `AGENT#${agentId}` }, SK: { S: `AGENT#${agentId}` } },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

async delete(agentId: string): Promise<void> {
  await this.dynamoClient.send(new DeleteItemCommand({
    TableName: this.tableName,
    Key: { PK: { S: `AGENT#${agentId}` }, SK: { S: `AGENT#${agentId}` } },
  }));
}

async findAll(): Promise<Agent[]> {
  const result = await this.dynamoClient.send(new QueryCommand({
    TableName: this.tableName,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :type',
    ExpressionAttributeValues: { ':type': { S: 'AGENT' } },
  }));
  
  return result.Items?.map(item => this.mapToAgent(item)) || [];
}
```

---

### KnowledgeSpaceRepository

```typescript
interface IKnowledgeSpaceRepository {
  // 既存
  create(knowledgeSpace: KnowledgeSpace): Promise<void>;
  findById(knowledgeSpaceId: string): Promise<KnowledgeSpace | null>;
  
  // 新規
  delete(knowledgeSpaceId: string): Promise<void>;
}
```

**DynamoDB実装**:
```typescript
async delete(knowledgeSpaceId: string): Promise<void> {
  await this.dynamoClient.send(new DeleteItemCommand({
    TableName: this.tableName,
    Key: { 
      PK: { S: `KNOWLEDGE#${knowledgeSpaceId}` }, 
      SK: { S: `KNOWLEDGE#${knowledgeSpaceId}` } 
    },
  }));
}
```

---

## Qdrant削除処理

```typescript
class QdrantService {
  async deleteCollection(knowledgeSpaceId: string): Promise<void> {
    const collectionName = `knowledge_space_${knowledgeSpaceId}`;
    
    try {
      await this.client.deleteCollection(collectionName);
    } catch (error) {
      // コレクションが存在しない場合は無視
      if (error.status === 404) {
        console.warn(`Collection ${collectionName} not found, skipping deletion`);
        return;
      }
      throw error;
    }
  }
}
```

---

## API Gateway設定

```typescript
// infrastructure/lib/api-stack.ts

// エージェント更新
const agentUpdateIntegration = new LambdaIntegration(agentUpdateHandler);
agentResource.addMethod('PUT', agentUpdateIntegration, {
  authorizer: apiKeyAuthorizer,
  requestValidator: requestValidator,
});

// エージェント削除
const agentDeleteIntegration = new LambdaIntegration(agentDeleteHandler);
agentResource.addMethod('DELETE', agentDeleteIntegration, {
  authorizer: apiKeyAuthorizer,
});

// ナレッジスペース削除
const knowledgeDeleteIntegration = new LambdaIntegration(knowledgeDeleteHandler);
knowledgeResource.addMethod('DELETE', knowledgeDeleteIntegration, {
  authorizer: apiKeyAuthorizer,
});

// エージェント一覧
const agentListIntegration = new LambdaIntegration(agentListHandler);
agentListResource.addMethod('GET', agentListIntegration, {
  authorizer: apiKeyAuthorizer,
});

// CORS設定
agentResource.addCorsPreflight({
  allowOrigins: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
```

---

## エラーハンドリング

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// 使用例
if (!agent) {
  throw new ApiError(404, 'Agent not found', 'AGENT_NOT_FOUND');
}

if (linkedAgents.length > 0) {
  throw new ApiError(
    409, 
    `Cannot delete knowledge space. ${linkedAgents.length} agents are linked.`,
    'KNOWLEDGE_SPACE_IN_USE'
  );
}
```

---

## テスト戦略

### ユニットテスト
- 各Use Caseのテスト
- リポジトリメソッドのテスト
- バリデーションのテスト

### 統合テスト
- API Gateway → Lambda → DynamoDB
- Qdrant削除処理
- エラーケース

---

## デプロイ

```bash
cd apps/rag-chat-stream-backend
npm run build
npm run test
npx cdk deploy
```

---

## モニタリング

### CloudWatch Metrics
- `AgentUpdateCount`: エージェント更新回数
- `AgentDeleteCount`: エージェント削除回数
- `KnowledgeDeleteCount`: ナレッジスペース削除回数
- `DeleteErrors`: 削除エラー回数

### CloudWatch Alarms
- 削除エラー率 > 5%
- API レイテンシ > 3秒
