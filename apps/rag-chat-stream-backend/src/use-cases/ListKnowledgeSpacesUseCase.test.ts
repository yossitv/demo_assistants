import { ListKnowledgeSpacesUseCase } from './ListKnowledgeSpacesUseCase';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { ILogger } from '../domain/services/ILogger';

describe('ListKnowledgeSpacesUseCase', () => {
  let knowledgeSpaceRepo: jest.Mocked<IKnowledgeSpaceRepository>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    knowledgeSpaceRepo = {
      save: jest.fn(),
      findByTenant: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IKnowledgeSpaceRepository>;

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<ILogger>;
  });

  it('maps repository entities to DTOs', async () => {
    const ks = new KnowledgeSpace('tenant-1', 'ks-1', 'KS', 'web', ['https://example.com'], '2024-01-01', new Date('2024-01-01T00:00:00.000Z'));
    knowledgeSpaceRepo.findByTenant.mockResolvedValue([ks]);

    const useCase = new ListKnowledgeSpacesUseCase(knowledgeSpaceRepo, logger);
    const result = await useCase.execute({ tenantId: 'tenant-1' });

    expect(result.knowledgeSpaces).toHaveLength(1);
    expect(result.knowledgeSpaces[0]).toMatchObject({
      knowledgeSpaceId: 'ks-1',
      name: 'KS',
      type: 'web'
    });
  });
});
