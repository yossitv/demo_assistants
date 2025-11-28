import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IConversationRepository } from '../domain/repositories/IConversationRepository';
import { IVectorRepository, SearchResult } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILLMService } from '../domain/services/ILLMService';
import { ILogger } from '../domain/services/ILogger';
import { Conversation } from '../domain/entities/Conversation';
import { CloudWatchLogger } from '../infrastructure/services/CloudWatchLogger';
import { NotFoundError } from '../shared/errors';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatWithAgentInput {
  tenantId: string;
  userId: string;
  agentId: string;
  messages: ChatMessage[];
  requestId?: string;
}

export interface ChatWithAgentOutput {
  id: string;
  object: 'chat.completion';
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
      cited_urls: string[];
      isRag: boolean;
    };
  }>;
}

export class ChatWithAgentUseCase {
  private readonly SIMILARITY_THRESHOLD = 0.35;
  private readonly TOP_K = 8;
  private readonly MAX_CONTEXT_CHUNKS = 5;
  private readonly MAX_CITED_URLS = 3;
  private readonly NO_INFO_MESSAGE = 'このサイトには情報がありませんでした。';
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly vectorRepo: IVectorRepository,
    private readonly embeddingService: IEmbeddingService,
    private readonly llmService: ILLMService,
    private readonly logger: ILogger
  ) {
    // Check if logger is CloudWatchLogger for structured logging
    if (logger instanceof CloudWatchLogger) {
      this.structuredLogger = logger;
    }
  }

  async execute(input: ChatWithAgentInput): Promise<ChatWithAgentOutput> {
    // 1. Load agent
    const agent = await this.agentRepo.findByTenantAndId(input.tenantId, input.agentId);
    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // 2. Extract last user message
    const lastUserMessage = this.extractLastUserMessage(input.messages);

    // Log chat request processing (Requirement 7.1)
    this.logger.info('Processing chat request', {
      tenantId: input.tenantId,
      agentId: input.agentId,
      userId: input.userId,
      userMessage: lastUserMessage.substring(0, 200) + (lastUserMessage.length > 200 ? '...' : ''),
      requestId: input.requestId
    });

    // 3. Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(lastUserMessage);

    // 4. Search across all linked KnowledgeSpaces
    const allResults: SearchResult[] = [];
    for (const ksId of agent.knowledgeSpaceIds) {
      const ks = await this.knowledgeSpaceRepo.findByTenantAndId(input.tenantId, ksId);
      if (!ks) {
        this.logger.warn('KnowledgeSpace not found', {
          tenantId: input.tenantId,
          agentId: input.agentId,
          knowledgeSpaceId: ksId,
          requestId: input.requestId
        });
        continue;
      }

      const results = await this.vectorRepo.searchSimilar(
        ks.getNamespace(),
        queryEmbedding,
        this.TOP_K
      );
      allResults.push(...results);
    }

    // 5. Filter and sort results
    const filteredResults = allResults
      .filter(r => r.score >= this.SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_CHUNKS);

    // Log RAG search results with structured logging
    const topResults = filteredResults.slice(0, 3);
    if (this.structuredLogger && input.requestId) {
      this.structuredLogger.logRAGSearch({
        requestId: input.requestId,
        tenantId: input.tenantId,
        agentId: input.agentId,
        hitCount: filteredResults.length,
        topUrls: topResults.map(r => r.chunk.url),
        topScores: topResults.map(r => r.score),
        threshold: this.SIMILARITY_THRESHOLD
      });
    } else {
      this.logger.debug('RAG search completed', {
        tenantId: input.tenantId,
        agentId: input.agentId,
        hitCount: filteredResults.length,
        topUrls: topResults.map(r => r.chunk.url),
        topScores: topResults.map(r => r.score),
        threshold: this.SIMILARITY_THRESHOLD,
        requestId: input.requestId
      });
    }

    // 6. Handle strict RAG with no results
    if (agent.strictRAG && filteredResults.length === 0) {
      const conversationId = this.generateConversationId();
      const conversation = new Conversation(
        conversationId,
        input.tenantId,
        input.agentId,
        input.userId,
        lastUserMessage,
        this.NO_INFO_MESSAGE,
        [],
        new Date(),
        false,
      );
      await this.conversationRepo.save(conversation);

      return {
        id: conversationId,
        object: 'chat.completion',
        model: input.agentId,
        choices: [{
          message: {
            role: 'assistant',
            content: this.NO_INFO_MESSAGE,
            cited_urls: [],
            isRag: false,
          }
        }]
      };
    }

    // 7. Build context and prompt
    const contextMarkdown = this.buildContextMarkdown(filteredResults);
    const citedUrls = this.extractCitedUrls(filteredResults);
    const prompt = this.buildPrompt(contextMarkdown, input.messages, lastUserMessage);

    // Log prompt in non-production environments for debugging
    const logLevel = process.env.LOG_LEVEL || 'INFO';
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (logLevel === 'DEBUG' || nodeEnv !== 'production') {
      this.logger.debug('Final prompt constructed', {
        tenantId: input.tenantId,
        agentId: input.agentId,
        requestId: input.requestId,
        promptLength: prompt.length,
        prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '') // Log first 500 chars
      });
    }

    // 8. Generate LLM response
    const assistantMessage = await this.llmService.generateCompletion(prompt);

    // 9. Save conversation
    const conversationId = this.generateConversationId();
    const conversation = new Conversation(
      conversationId,
      input.tenantId,
      input.agentId,
      input.userId,
      lastUserMessage,
      assistantMessage,
      citedUrls,
      new Date(),
      true,
    );
    await this.conversationRepo.save(conversation);

    return {
      id: conversationId,
      object: 'chat.completion',
      model: input.agentId,
      choices: [{
        message: {
          role: 'assistant',
          content: assistantMessage,
          cited_urls: citedUrls,
          isRag: true,
        }
      }]
    };
  }

  private extractLastUserMessage(messages: ChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      throw new Error('No user message found');
    }
    return userMessages[userMessages.length - 1].content;
  }

  private buildContextMarkdown(results: SearchResult[]): string {
    let markdown = '# Context Documents (DO NOT DISCARD)\n\n';
    results.forEach((result, index) => {
      markdown += `${index + 1}. [${result.chunk.metadata.title}](${result.chunk.url})\n`;
      markdown += `${result.chunk.content}\n\n`;
    });
    return markdown;
  }

  private extractCitedUrls(results: SearchResult[]): string[] {
    const urls = [...new Set(results.map(r => r.chunk.url))];
    return urls.slice(0, this.MAX_CITED_URLS);
  }

  private buildPrompt(contextMarkdown: string, messages: ChatMessage[], latestUserMessage: string): string {
    const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    
    return `SYSTEM: あなたは公式サポートAIです。
与えられたコンテキストの範囲内のみで回答してください。
コンテキストに情報がない場合は、必ず次のように答えてください：
「このサイトには情報がありませんでした。」

AGENT POLICY:
- 丁寧なビジネス口調で回答してください。
- 推測で回答しないでください。
- 箇条書きが有効な場合は箇条書きを利用してください。

CONTEXT:
${contextMarkdown}

CONVERSATION HISTORY:
${history}

USER: ${latestUserMessage}

TASK: 上記のCONTEXTの情報だけに基づいて、ユーザーの質問に日本語で回答してください。`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
