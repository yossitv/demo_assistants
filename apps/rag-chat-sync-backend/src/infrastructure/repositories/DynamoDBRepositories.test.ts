import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBAgentRepository } from './DynamoDBAgentRepository';
import { DynamoDBKnowledgeSpaceRepository } from './DynamoDBKnowledgeSpaceRepository';
import { DynamoDBConversationRepository } from './DynamoDBConversationRepository';
import { Agent } from '../../domain/entities/Agent';
import { KnowledgeSpace } from '../../domain/entities/KnowledgeSpace';
import { Conversation } from '../../domain/entities/Conversation';

const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
});

describe('DynamoDB Repositories', () => {
  let mockSend: jest.Mock;
  let mockDynamoDB: DynamoDBDocumentClient;

  beforeEach(() => {
    mockSend = jest.fn();
    mockDynamoDB = {
      send: mockSend
    } as unknown as DynamoDBDocumentClient;
  });

  describe('DynamoDBAgentRepository', () => {
    const tableName = 'test-agents-table';
    let repository: DynamoDBAgentRepository;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = createMockLogger();
      repository = new DynamoDBAgentRepository(mockDynamoDB, tableName, mockLogger);
    });

    describe('save', () => {
      it('should save an agent to DynamoDB', async () => {
        const agent = new Agent(
          'tenant-123',
          'agent-456',
          'Test Agent',
          ['ks-1', 'ks-2'],
          true,
          'Test description'
        );

        mockSend.mockResolvedValueOnce({});

        await repository.save(agent);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: expect.objectContaining({
                tenantId: 'tenant-123',
                agentId: 'agent-456',
                name: 'Test Agent',
                knowledgeSpaceIds: ['ks-1', 'ks-2'],
                strictRAG: true,
                description: 'Test description'
              })
            })
          })
        );
      });
    });

    describe('findByTenantAndId', () => {
      it('should retrieve an agent from DynamoDB', async () => {
        const mockItem = {
          tenantId: 'tenant-123',
          agentId: 'agent-456',
          name: 'Test Agent',
          knowledgeSpaceIds: ['ks-1'],
          strictRAG: true,
          description: 'Test description',
          createdAt: '2024-01-01T00:00:00.000Z'
        };

        mockSend.mockResolvedValueOnce({ Item: mockItem });

        const result = await repository.findByTenantAndId('tenant-123', 'agent-456');

        expect(result).toBeInstanceOf(Agent);
        expect(result?.tenantId).toBe('tenant-123');
        expect(result?.agentId).toBe('agent-456');
        expect(result?.name).toBe('Test Agent');
        expect(result?.knowledgeSpaceIds).toEqual(['ks-1']);
        expect(result?.strictRAG).toBe(true);
      });

      it('should return null when agent not found', async () => {
        mockSend.mockResolvedValueOnce({});

        const result = await repository.findByTenantAndId('tenant-123', 'agent-456');

        expect(result).toBeNull();
      });
    });
  });

  describe('DynamoDBKnowledgeSpaceRepository', () => {
    const tableName = 'test-knowledge-spaces-table';
    let repository: DynamoDBKnowledgeSpaceRepository;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = createMockLogger();
      repository = new DynamoDBKnowledgeSpaceRepository(mockDynamoDB, tableName, mockLogger);
    });

    describe('save', () => {
      it('should save a knowledge space to DynamoDB', async () => {
        const ks = new KnowledgeSpace(
          'tenant-123',
          'ks-456',
          'Test KS',
          'web',
          ['https://example.com'],
          '2024-01-01'
        );

        mockSend.mockResolvedValueOnce({});

        await repository.save(ks);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: expect.objectContaining({
                tenantId: 'tenant-123',
                knowledgeSpaceId: 'ks-456',
                name: 'Test KS',
                type: 'web',
                sourceUrls: ['https://example.com'],
                currentVersion: '2024-01-01'
              })
            })
          })
        );
      });
    });

    describe('findByTenant', () => {
      it('should retrieve all knowledge spaces for a tenant', async () => {
        const mockItems = [
          {
            tenantId: 'tenant-123',
            knowledgeSpaceId: 'ks-1',
            name: 'KS 1',
            type: 'web',
            sourceUrls: ['https://example.com'],
            currentVersion: '2024-01-01',
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            tenantId: 'tenant-123',
            knowledgeSpaceId: 'ks-2',
            name: 'KS 2',
            type: 'web',
            sourceUrls: ['https://example2.com'],
            currentVersion: '2024-01-02',
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ];

        mockSend.mockResolvedValueOnce({ Items: mockItems });

        const result = await repository.findByTenant('tenant-123');

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(KnowledgeSpace);
        expect(result[0].knowledgeSpaceId).toBe('ks-1');
        expect(result[1].knowledgeSpaceId).toBe('ks-2');
      });

      it('should return empty array when no knowledge spaces found', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] });

        const result = await repository.findByTenant('tenant-123');

        expect(result).toEqual([]);
      });
    });

    describe('findByTenantAndId', () => {
      it('should retrieve a specific knowledge space', async () => {
        const mockItem = {
          tenantId: 'tenant-123',
          knowledgeSpaceId: 'ks-456',
          name: 'Test KS',
          type: 'web',
          sourceUrls: ['https://example.com'],
          currentVersion: '2024-01-01',
          createdAt: '2024-01-01T00:00:00.000Z'
        };

        mockSend.mockResolvedValueOnce({ Item: mockItem });

        const result = await repository.findByTenantAndId('tenant-123', 'ks-456');

        expect(result).toBeInstanceOf(KnowledgeSpace);
        expect(result?.knowledgeSpaceId).toBe('ks-456');
        expect(result?.name).toBe('Test KS');
      });

      it('should return null when knowledge space not found', async () => {
        mockSend.mockResolvedValueOnce({});

        const result = await repository.findByTenantAndId('tenant-123', 'ks-456');

        expect(result).toBeNull();
      });
    });
  });

  describe('DynamoDBConversationRepository', () => {
    const tableName = 'test-conversations-table';
    let repository: DynamoDBConversationRepository;
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = createMockLogger();
      repository = new DynamoDBConversationRepository(mockDynamoDB, tableName, mockLogger);
    });

    describe('save', () => {
      it('should save a conversation to DynamoDB', async () => {
        const conversation = new Conversation(
          'conv-123',
          'tenant-456',
          'agent-789',
          'user-101',
          'Hello, how are you?',
          'I am doing well, thank you!',
          ['https://example.com', 'https://example2.com']
        );

        mockSend.mockResolvedValueOnce({});

        await repository.save(conversation);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: expect.objectContaining({
                conversationId: 'conv-123',
                tenantId: 'tenant-456',
                agentId: 'agent-789',
                userId: 'user-101',
                lastUserMessage: 'Hello, how are you?',
                lastAssistantMessage: 'I am doing well, thank you!',
                referencedUrls: ['https://example.com', 'https://example2.com']
              })
            })
          })
        );
      });
    });
  });
});
