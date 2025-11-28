/**
 * Message interface for chat messages
 */
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  cited_urls?: string[];
  createdAt: Date;
}

/**
 * Agent interface for AI agents
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  strictRAG: boolean;
  knowledgeSpaceId: string;
  createdAt: Date;
}

/**
 * Knowledge Space type options
 */
export type KnowledgeSpaceType = 'web' | 'document' | 'custom';

/**
 * KnowledgeSpace interface for knowledge spaces
 */
export interface KnowledgeSpace {
  id: string;
  name: string;
  type: KnowledgeSpaceType;
  lastUpdatedAt: Date;
}
