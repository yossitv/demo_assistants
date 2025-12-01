import { ApiError } from './error';
import {
  ChatResponse,
  CreateAgentResponse,
  CreateKnowledgeSpaceResponse,
  ListKnowledgeSpacesResponse,
  OpenAIChatCompletionResponse,
  BackendCreateKnowledgeSpaceResponse,
  BackendListKnowledgeSpacesResponse,
  BackendCreateAgentResponse,
} from './types';

/**
 * API Client configuration interface
 */
interface ApiClientConfig {
  baseUrl?: string;
  jwtToken?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Request options interface
 */
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * API Client class for interacting with the backend API
 */
export class ApiClient {
  private baseUrl: string;
  private jwtToken?: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config?: ApiClientConfig) {
    // Read from environment variables with fallback to config or defaults
    this.baseUrl =
      config?.baseUrl ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:3000/api';

    this.jwtToken =
      config?.jwtToken ||
      process.env.NEXT_PUBLIC_JWT_TOKEN;

    this.apiKey =
      config?.apiKey ||
      process.env.NEXT_PUBLIC_API_KEY ||
      process.env.NEXT_PUBLIC_TEST_API_KEY;

    this.timeout = config?.timeout || 30000; // 30 seconds default

    // Ensure baseUrl doesn't end with a slash
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  /**
   * Set or update the JWT token
   */
  setToken(token: string): void {
    this.jwtToken = token;
  }

  /**
   * Clear the JWT token
   */
  clearToken(): void {
    this.jwtToken = undefined;
  }

  /**
   * Set or update the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Clear the API key
   */
  clearApiKey(): void {
    this.apiKey = undefined;
  }

  /**
   * Private fetch wrapper with authentication and error handling
   */
  private async fetch<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, headers = {} } = options;

    // Construct full URL
    const url = `${this.baseUrl}${path}`;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Prefer API key when both are present to satisfy the custom authorizer expectations
    if (this.apiKey) {
      requestHeaders['Authorization'] = this.apiKey;
      // Also set x-api-key for API Gateway apiKeyRequired endpoints (defensive)
      requestHeaders['x-api-key'] = this.apiKey;
    } else if (this.jwtToken) {
      // Fallback to JWT bearer if no API key is provided
      requestHeaders['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      // Make the request
      const response = await fetch(url, fetchOptions);

      // Handle non-ok responses
      if (!response.ok) {
        throw await ApiError.fromResponse(response);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return this.validateResponse<T>(data);
      }

      // Handle non-JSON responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        // If parsing fails, return the text wrapped in an object
        return { data: text } as T;
      }
    } catch (error) {
      // Handle network errors and other fetch errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ApiError(
          `Request timeout after ${this.timeout}ms`,
          undefined,
          error
        );
      }

      // Handle other network errors
      throw ApiError.fromNetworkError(error);
    }
  }

  /**
   * Validate and sanitize API response
   */
  private validateResponse<T>(data: unknown): T {
    if (data === null || data === undefined) {
      throw new ApiError('Invalid API response: null or undefined');
    }

    // Basic type validation could be expanded with a schema validator like Zod
    return data as T;
  }

  /**
   * Send a chat message to an agent using OpenAI-compatible format
   * Supports both single message and full conversation history
   */
  async chat(
    agentId: string,
    message: string | Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    conversationId?: string
  ): Promise<ChatResponse> {
    if (!agentId || agentId.trim() === '') {
      throw new ApiError('Agent ID is required');
    }

    // Validate message input
    let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

    if (typeof message === 'string') {
      // Single message - convert to array format
      if (!message || message.trim() === '') {
        throw new ApiError('Message content is required');
      }
      messages = [
        {
          role: 'user' as const,
          content: message.trim(),
        },
      ];
    } else {
      // Full conversation history provided
      if (!Array.isArray(message) || message.length === 0) {
        throw new ApiError('Messages array cannot be empty');
      }
      messages = message;
    }

    // Format request as OpenAI-compatible chat completion
    const request = {
      model: agentId,
      messages,
    };

    // Call the OpenAI-compatible endpoint
    const openAIResponse = await this.fetch<OpenAIChatCompletionResponse>({
      method: 'POST',
      path: '/v1/chat/completions',
      body: request,
    });

    // Transform OpenAI response to our ChatResponse format
    const assistantMessage = openAIResponse.choices[0]?.message;
    if (!assistantMessage) {
      throw new ApiError('Invalid response from API: missing message');
    }

    return {
      message: {
        id: openAIResponse.id,
        content: assistantMessage.content,
        role: 'assistant',
        cited_urls: assistantMessage.cited_urls,
      },
      conversationId: openAIResponse.id,
      agentId: openAIResponse.model,
    };
  }

  /**
   * Create a new agent
   */
  async createAgent(
    knowledgeSpaceIds: string[],
    name: string,
    description: string,
    strictRAG: boolean = true
  ): Promise<CreateAgentResponse> {
    if (!knowledgeSpaceIds || knowledgeSpaceIds.length === 0) {
      throw new ApiError('At least one Knowledge Space ID is required');
    }

    if (!name || name.trim() === '') {
      throw new ApiError('Agent name is required');
    }

    // Backend uses knowledgeSpaceIds array
    const request = {
      name: name.trim(),
      knowledgeSpaceIds,
      description: description?.trim(),
      strictRAG,
    };

    // Call the /v1/agent/create endpoint
    const response = await this.fetch<BackendCreateAgentResponse>({
      method: 'POST',
      path: '/v1/agent/create',
      body: request,
    });

    // Transform backend response to our format
    return {
      agent: {
        id: response.agentId,
        name: name.trim(),
        description: description?.trim() || '',
        strictRAG,
        knowledgeSpaceId: knowledgeSpaceIds[0],
      },
      status: response.status,
    };
  }

  /**
   * Create a new knowledge space
   */
  async createKnowledgeSpace(
    name: string,
    urls: string[]
  ): Promise<CreateKnowledgeSpaceResponse> {
    if (!name || name.trim() === '') {
      throw new ApiError('Knowledge Space name is required');
    }

    if (!urls || urls.length === 0) {
      throw new ApiError('At least one URL is required');
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      throw new ApiError('No valid URLs provided');
    }

    if (validUrls.length !== urls.length) {
      console.warn(`${urls.length - validUrls.length} invalid URLs were filtered out`);
    }

    // Use backend API format with sourceUrls
    const request = {
      name: name.trim(),
      sourceUrls: validUrls,
    };

    // Call the /v1/knowledge/create endpoint
    const response = await this.fetch<BackendCreateKnowledgeSpaceResponse>({
      method: 'POST',
      path: '/v1/knowledge/create',
      body: request,
    });

    // Transform backend response to our format
    return {
      knowledgeSpace: {
        id: response.knowledgeSpaceId,
        name: name.trim(),
        type: 'web',
        lastUpdatedAt: new Date().toISOString(),
        urls: validUrls,
      },
      status: response.status,
      successfulUrls: response.successfulUrls,
      failedUrls: response.failedUrls,
      errors: response.errors,
    };
  }

  /**
   * List all knowledge spaces
   */
  async listKnowledgeSpaces(
    page?: number,
    pageSize?: number
  ): Promise<ListKnowledgeSpacesResponse> {
    // Call the /v1/knowledge/list endpoint
    const response = await this.fetch<BackendListKnowledgeSpacesResponse>({
      method: 'GET',
      path: '/v1/knowledge/list',
    });

    // Transform backend response to our format
    return {
      knowledgeSpaces: response.knowledgeSpaces.map(ks => ({
        id: ks.knowledgeSpaceId,
        name: ks.name,
        type: ks.type as 'web' | 'document' | 'custom',
        lastUpdatedAt: ks.lastUpdatedAt,
      })),
      total: response.knowledgeSpaces.length,
      page,
      pageSize,
    };
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<CreateAgentResponse> {
    if (!agentId || agentId.trim() === '') {
      throw new ApiError('Agent ID is required');
    }

    return this.fetch<CreateAgentResponse>({
      method: 'GET',
      path: `/agents/${agentId}`,
    });
  }

  /**
   * Get a specific knowledge space by ID
   */
  async getKnowledgeSpace(knowledgeSpaceId: string): Promise<CreateKnowledgeSpaceResponse> {
    if (!knowledgeSpaceId || knowledgeSpaceId.trim() === '') {
      throw new ApiError('Knowledge Space ID is required');
    }

    return this.fetch<CreateKnowledgeSpaceResponse>({
      method: 'GET',
      path: `/knowledge-spaces/${knowledgeSpaceId}`,
    });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    if (!agentId || agentId.trim() === '') {
      throw new ApiError('Agent ID is required');
    }

    await this.fetch<void>({
      method: 'DELETE',
      path: `/agents/${agentId}`,
    });
  }

  /**
   * Delete a knowledge space
   */
  async deleteKnowledgeSpace(knowledgeSpaceId: string): Promise<void> {
    if (!knowledgeSpaceId || knowledgeSpaceId.trim() === '') {
      throw new ApiError('Knowledge Space ID is required');
    }

    await this.fetch<void>({
      method: 'DELETE',
      path: `/knowledge-spaces/${knowledgeSpaceId}`,
    });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
