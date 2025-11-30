/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message interface
 */
export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  cited_urls?: string[];
  createdAt?: string;
}

/**
 * Agent interface
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  strictRAG: boolean;
  knowledgeSpaceId: string;
  createdAt?: string;
  updatedAt?: string;
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
 * Parse error for product uploads
 */
export interface ParseError {
  itemIndex: number;
  field?: string;
  reason: string;
}

/**
 * Knowledge Space interface
 */
export interface KnowledgeSpace {
  id: string;
  name: string;
  type: KnowledgeSpaceType;
  lastUpdatedAt: string;
  createdAt?: string;
  documentCount?: number;
  urls?: string[];
  status?: KnowledgeSpaceStatus;
  successfulUrls?: number;
  failedUrls?: number;
  errors?: Array<{ url: string; error: string }>;
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
 * Chat request payload (OpenAI-compatible format)
 * This is sent to the backend as { model: agentId, messages: [...] }
 */
export interface ChatRequest {
  model: string; // Agent ID
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
}

/**
 * Chat response payload
 * Transformed from OpenAI format for easier consumption by the frontend
 */
export interface ChatResponse {
  message: Message;
  conversationId?: string;
  sessionId?: string;
  agentId: string;
}

/**
 * Create Agent request payload
 */
export interface CreateAgentRequest {
  name: string;
  knowledgeSpaceIds: string[];
  strictRAG?: boolean;
  description?: string;
}

/**
 * Create Agent response payload
 */
export interface CreateAgentResponse {
  agent: Agent;
  status?: string;
}

/**
 * Create Knowledge Space request payload
 */
export interface CreateKnowledgeSpaceRequest {
  name: string;
  sourceUrls: string[];
}

/**
 * Create Knowledge Space response payload
 */
export interface CreateKnowledgeSpaceResponse {
  knowledgeSpace: KnowledgeSpace;
  status?: 'completed' | 'partial';
  successfulUrls?: number;
  failedUrls?: number;
  errors?: Array<{ url: string; error: string }>;
}

/**
 * List Knowledge Spaces response payload
 */
export interface ListKnowledgeSpacesResponse {
  knowledgeSpaces: KnowledgeSpace[];
  total?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Update Agent request payload
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  strictRAG?: boolean;
  knowledgeSpaceId?: string;
}

/**
 * Update Agent response payload
 */
export interface UpdateAgentResponse {
  agent: Agent;
}

/**
 * Get Agent response payload
 */
export interface GetAgentResponse {
  agent: Agent;
}

/**
 * List Agents response payload
 */
export interface ListAgentsResponse {
  agents: Agent[];
  total?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Delete Agent response payload
 */
export interface DeleteAgentResponse {
  success: boolean;
  message?: string;
}

/**
 * Delete Knowledge Space response payload
 */
export interface DeleteKnowledgeSpaceResponse {
  success: boolean;
  message?: string;
}

/**
 * Backend API types - OpenAI-compatible formats
 */

/**
 * OpenAI chat completion response format (from backend)
 */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
      cited_urls: string[];
    };
  }>;
}

/**
 * Backend knowledge space response format
 */
export interface BackendKnowledgeSpace {
  knowledgeSpaceId: string;
  name: string;
  type: 'web' | 'document' | 'product' | 'custom';
  lastUpdatedAt: string;
}

/**
 * Backend create knowledge space response
 */
export interface BackendCreateKnowledgeSpaceResponse {
  knowledgeSpaceId: string;
  status: 'completed' | 'partial';
  successfulUrls: number;
  failedUrls: number;
  errors?: Array<{ url: string; error: string }>;
}

/**
 * Backend list knowledge spaces response
 */
export interface BackendListKnowledgeSpacesResponse {
  knowledgeSpaces: BackendKnowledgeSpace[];
}

/**
 * Backend create agent response
 */
export interface BackendCreateAgentResponse {
  agentId: string;
  status: 'created' | string;
}
