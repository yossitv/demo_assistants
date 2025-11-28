import { OpenAIEmbeddingService } from './OpenAIEmbeddingService';
import { Embedding } from '../../domain/value-objects/Embedding';
import { ExternalServiceError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';

describe('OpenAIEmbeddingService', () => {
  let service: OpenAIEmbeddingService;
  let mockCreate: jest.Mock;
  let mockLogger: jest.Mocked<ILogger>;
  const retryOptions = { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 };

  beforeEach(() => {
    mockCreate = jest.fn();
    const mockOpenAI = {
      embeddings: {
        create: mockCreate
      }
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    service = new OpenAIEmbeddingService(mockOpenAI, mockLogger, 'text-embedding-3-small', retryOptions);
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for a single text', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await service.generateEmbedding('test text');

      expect(result).toBeInstanceOf(Embedding);
      expect(result.vector).toEqual(mockEmbedding);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(service.generateEmbedding('test')).rejects.toBeInstanceOf(ExternalServiceError);
    });

    it('retries transient failures before succeeding', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      mockCreate.mockRejectedValueOnce(new Error('Temporary'))
        .mockResolvedValueOnce({ data: [{ embedding: mockEmbedding }] });

      const result = await service.generateEmbedding('retry text');

      expect(result.vector).toEqual(mockEmbedding);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding1 = new Array(1536).fill(0).map(() => Math.random());
      const mockEmbedding2 = new Array(1536).fill(0).map(() => Math.random());
      
      mockCreate.mockResolvedValue({
        data: [
          { embedding: mockEmbedding1 },
          { embedding: mockEmbedding2 }
        ]
      });

      const result = await service.generateEmbeddings(['text1', 'text2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Embedding);
      expect(result[1]).toBeInstanceOf(Embedding);
      expect(result[0].vector).toEqual(mockEmbedding1);
      expect(result[1].vector).toEqual(mockEmbedding2);
    });
  });
});
