import { Conversation } from '../entities/Conversation';
/**
 * Repository interface for Conversation persistence operations.
 * Defines the contract for storing conversation logs.
 */
export interface IConversationRepository {
    /**
     * Persists a Conversation entity to the data store.
     * Used for logging chat interactions for debugging and usage tracking.
     * @param conversation - The Conversation entity to save
     */
    save(conversation: Conversation): Promise<void>;
}
//# sourceMappingURL=IConversationRepository.d.ts.map