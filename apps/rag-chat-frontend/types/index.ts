/**
 * Message interface for chat messages
 */
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  cited_urls?: string[];
  createdAt: string;
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
  createdAt: string;
}

/**
 * Knowledge Space type options
 */
export type KnowledgeSpaceType = 'web' | 'document' | 'product' | 'custom';

/**
 * Knowledge Space status
 */
export type KnowledgeSpaceStatus = 'processing' | 'completed' | 'partial' | 'error';

/**
 * KnowledgeSpace interface for knowledge spaces
 */
export interface KnowledgeSpace {
  id: string;
  name: string;
  type: KnowledgeSpaceType;
  status?: KnowledgeSpaceStatus;
  documentCount?: number;
  lastUpdatedAt: string;
  metadata?: {
    sourceType?: 'url' | 'file';
    schemaVersion?: string;
    summary?: {
      successCount: number;
      failureCount: number;
      errors: ParseError[];
    };
  };
}

/**
 * Parse error for product uploads
 */
export interface ParseError {
  itemIndex: number;
  field?: string;
  reason: string;
}

/**
 * Product schema (v1)
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  category?: string;
  price?: number;
  currency?: string;
  availability?: string;
  tags?: string[];
  imageUrl?: string;
  productUrl?: string;
  brand?: string;
  updatedAt?: string;
}

/**
 * Agent preset types
 */
export type AgentPreset = 'none' | 'product_recommendation';
