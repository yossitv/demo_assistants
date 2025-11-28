import { Agent } from '../entities/Agent';
/**
 * Repository interface for Agent persistence operations.
 * Defines the contract for storing and retrieving Agent entities.
 */
export interface IAgentRepository {
    /**
     * Persists an Agent entity to the data store.
     * @param agent - The Agent entity to save
     */
    save(agent: Agent): Promise<void>;
    /**
     * Retrieves an Agent by tenant ID and agent ID.
     * @param tenantId - The tenant identifier
     * @param agentId - The agent identifier
     * @returns The Agent entity if found, null otherwise
     */
    findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null>;
}
//# sourceMappingURL=IAgentRepository.d.ts.map