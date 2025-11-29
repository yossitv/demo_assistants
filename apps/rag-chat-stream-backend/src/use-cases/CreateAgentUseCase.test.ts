import { CreateAgentUseCase } from './CreateAgentUseCase';
import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { ILogger } from '../domain/services/ILogger';

describe('CreateAgentUseCase', () => {
  let agentRepo: jest.Mocked<IAgentRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    agentRepo = {
      save: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IAgentRepository>;

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<ILogger>;
  });

  it('saves agent with generated id', async () => {
    const useCase = new CreateAgentUseCase(agentRepo, logger);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Agent A',
      knowledgeSpaceIds: ['ks-1'],
      strictRAG: true,
      description: 'desc'
    });

    expect(result.status).toBe('created');
    expect(result.agentId).toMatch(/agent_/);
    expect(agentRepo.save).toHaveBeenCalledTimes(1);
  });
});
