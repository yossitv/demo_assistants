import { OpenAILLMService } from './OpenAILLMService';
import { ExternalServiceError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';

describe('OpenAILLMService', () => {
  let service: OpenAILLMService;
  let mockCreate: jest.Mock;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockCreate = jest.fn();
    const mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    service = new OpenAILLMService(mockOpenAI, mockLogger, 'gpt-4', {
      maxAttempts: 3,
      initialDelayMs: 0,
      maxDelayMs: 0
    });
  });

  it('returns completion content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello there' } }]
    });

    const result = await service.generateCompletion('Hi');
    expect(result).toBe('Hello there');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('retries transient failures before succeeding', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Recovered' } }]
      });

    const result = await service.generateCompletion('retry please');

    expect(result).toBe('Recovered');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('wraps repeated errors as ExternalServiceError', async () => {
    mockCreate.mockRejectedValue(new Error('Permanent failure'));

    await expect(service.generateCompletion('fail')).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
