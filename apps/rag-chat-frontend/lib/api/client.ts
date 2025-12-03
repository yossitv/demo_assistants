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

export interface ChatStreamChunk {
  content?: string;
  citedUrls?: string[];
}

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

    // Add authentication header
    if (this.jwtToken) {
      requestHeaders['Authorization'] = `Bearer ${this.jwtToken}`;
    } else if (this.apiKey) {
      requestHeaders['Authorization'] = this.apiKey;
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
      console.log('API Request:', { url, method, headers: requestHeaders, body });
      const response = await fetch(url, fetchOptions);
      console.log('API Response:', { status: response.status, statusText: response.statusText });

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

      // Handle non-JSON responses (including SSE format from stream mode API Gateway)
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      // Try to parse as SSE format (for stream: false responses from stream-enabled API Gateway)
      if (text.includes('data: ') && text.includes('[DONE]')) {
        try {
          const lines = text.split('\n').filter(line => line.startsWith('data: '));
          const lastDataLine = lines[lines.length - 2]; // Second to last (before [DONE])
          if (lastDataLine) {
            const jsonStr = lastDataLine.slice(6); // Remove "data: "
            return JSON.parse(jsonStr) as T;
          }
        } catch (e) {
          console.error('Failed to parse SSE format:', e);
        }
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
      stream: false,
    };

    // Call the OpenAI-compatible endpoint
    const openAIResponse = await this.fetch<OpenAIChatCompletionResponse>({
      method: 'POST',
      path: '/v1/chat/completions',
      body: request,
    });

    console.log('Chat response:', openAIResponse);

    // Transform OpenAI response to our ChatResponse format
    const assistantMessage = openAIResponse.choices?.[0]?.message;
    if (!assistantMessage) {
      console.error('Invalid response structure:', openAIResponse);
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
    strictRAG: boolean = true,
    preset?: 'none' | 'product_recommendation',
    systemPrompt?: string
  ): Promise<CreateAgentResponse> {
    if (!knowledgeSpaceIds || knowledgeSpaceIds.length === 0) {
      throw new ApiError('At least one Knowledge Space ID is required');
    }

    if (!name || name.trim() === '') {
      throw new ApiError('Agent name is required');
    }

    // Backend uses knowledgeSpaceIds array
    const request: any = {
      name: name.trim(),
      knowledgeSpaceIds,
      description: description?.trim(),
      strictRAG,
    };

    // Add optional fields
    if (preset && preset !== 'none') {
      request.preset = preset;
    }
    if (systemPrompt) {
      request.systemPrompt = systemPrompt;
    }

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
   * Update an agent
   */
  async updateAgent(agentId: string, data: {
    name: string;
    description?: string;
    systemPrompt?: string;
    knowledgeSpaceIds: string[];
    strictRAG?: boolean;
  }): Promise<CreateAgentResponse> {
    if (!agentId || agentId.trim() === '') {
      throw new ApiError('Agent ID is required');
    }

    if (!data.name || data.name.trim() === '') {
      throw new ApiError('Agent name is required');
    }

    if (!data.knowledgeSpaceIds || data.knowledgeSpaceIds.length === 0) {
      throw new ApiError('At least one Knowledge Space ID is required');
    }

    const response = await this.fetch<BackendCreateAgentResponse>({
      method: 'PUT',
      path: `/v1/agent/${agentId}`,
      body: data,
    });

    return {
      agent: {
        id: response.agentId,
        name: data.name.trim(),
        description: data.description?.trim() || '',
        strictRAG: data.strictRAG ?? true,
        knowledgeSpaceId: data.knowledgeSpaceIds[0],
      },
      status: response.status,
    };
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
      path: `/v1/agent/${agentId}`,
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
      path: `/v1/knowledge/${knowledgeSpaceId}`,
    });
  }

  /**
   * Get chunks for a knowledge space
   */
  async getKnowledgeChunks(knowledgeSpaceId: string): Promise<{ knowledgeSpaceId: string; chunkCount: number; chunks: any[] }> {
    if (!knowledgeSpaceId || knowledgeSpaceId.trim() === '') {
      throw new ApiError('Knowledge Space ID is required');
    }

    return this.fetch<{ knowledgeSpaceId: string; chunkCount: number; chunks: any[] }>({
      method: 'GET',
      path: `/v1/knowledge/${knowledgeSpaceId}/chunks`,
    });
  }

  /**
   * Stream chat messages using SSE
   */
  async *chatStream(
    agentId: string,
    message: string | Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<ChatStreamChunk, void, unknown> {
    if (!agentId || agentId.trim() === '') {
      throw new ApiError('Agent ID is required');
    }

    let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

    if (typeof message === 'string') {
      if (!message || message.trim() === '') {
        throw new ApiError('Message content is required');
      }
      messages = [{ role: 'user' as const, content: message.trim() }];
    } else {
      if (!Array.isArray(message) || message.length === 0) {
        throw new ApiError('Messages array cannot be empty');
      }
      messages = message;
    }

    const request = {
      model: agentId,
      messages,
      stream: true,
    };

    const url = `${this.baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    } else if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    if (!response.body) {
      throw new ApiError('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta || json.choices?.[0]?.message;
            const content = delta?.content;
            const citedUrls = delta?.cited_urls;

            if (content || (citedUrls && citedUrls.length > 0)) {
              yield { content, citedUrls };
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
