import { KnowledgeSpace } from '../entities/KnowledgeSpace';

/**
 * Repository interface for KnowledgeSpace persistence operations.
 * Defines the contract for storing and retrieving KnowledgeSpace entities.
 */
export interface IKnowledgeSpaceRepository {
  /**
   * Persists a KnowledgeSpace entity to the data store.
   * @param ks - The KnowledgeSpace entity to save
   */
  save(ks: KnowledgeSpace): Promise<void>;

  /**
   * Retrieves all KnowledgeSpaces for a given tenant.
   * @param tenantId - The tenant identifier
   * @returns Array of KnowledgeSpace entities belonging to the tenant
   */
  findByTenant(tenantId: string): Promise<KnowledgeSpace[]>;

  /**
   * Retrieves a specific KnowledgeSpace by tenant ID and knowledge space ID.
   * @param tenantId - The tenant identifier
   * @param ksId - The knowledge space identifier
   * @returns The KnowledgeSpace entity if found, null otherwise
   */
  findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null>;
}
