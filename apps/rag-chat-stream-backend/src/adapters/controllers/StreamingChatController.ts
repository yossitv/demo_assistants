import { ChatWithAgentOutput, ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ChatRequestBody, chatRequestSchema } from '../../shared/validation';
import { CORS_HEADERS, errorResponse, successResponse } from '../../shared/cors';
import { ValidationError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { buildSSEHeaders, DONE_SSE_EVENT, formatSSEData, STREAM_CHUNK_SIZE } from '../../shared/streaming';
import { AuthenticationContext } from '../../shared/auth';
import { validateApiKey } from '../../shared/apiKeyCheck';
import { verifyJwt } from '../../shared/jwtVerify';

export class StreamingChatController {
  private readonly logger: ILogger;
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly useCase: ChatWithAgentUseCase,
    logger?: ILogger
  ) {
    this.logger = logger || { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };
    if (logger instanceof CloudWatchLogger) {
      this.structuredLogger = logger;
    }
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const requestId = event.requestContext.requestId;
    const startTime = Date.now();
    let authContext: AuthenticationContext | null = null;

    try {
      authContext = this.extractAuthenticationContext(event);

      if (!authContext) {
        this.logUnauthorizedAttempt(requestId, event.path);
        return errorResponse(401, 'Unauthorized');
      }

      const { chatRequest, stream } = this.validateRequest(event.body);
      const { tenantId, userId, authMethod } = authContext;

      if (this.structuredLogger) {
        this.structuredLogger.logRequest({
          requestId,
          tenantId,
          userId,
          path: event.path,
          method: event.httpMethod,
          authMethod
        });
      }

      this.logger.info('Chat request received', {
        tenantId,
        userId,
        requestId,
        agentId: chatRequest.model,
        messageCount: chatRequest.messages.length,
        stream,
        authMethod
      });

      const result = await this.useCase.execute({
        tenantId,
        userId,
        agentId: chatRequest.model,
        messages: chatRequest.messages,
        requestId
      });

      const durationMs = Date.now() - startTime;

      if (this.structuredLogger) {
        this.structuredLogger.logResponse({
          requestId,
          tenantId,
          userId,
          path: event.path,
          statusCode: 200,
          durationMs,
          authMethod
        });
      }

      this.logger.info(stream ? 'Streaming chat response generated' : 'Chat response generated', {
        tenantId,
        userId,
        requestId,
        agentId: chatRequest.model,
        durationMs,
        stream,
        authMethod
      });

      if (stream) {
        return this.buildStreamResult(result);
      }

      return successResponse(200, result);
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;

      if (error instanceof ValidationError) {
        this.logger.info('Validation error', {
          requestId,
          error: error.message,
          durationMs
        });
        return errorResponse(400, error.message);
      }

      const tenantId = authContext?.tenantId;
      const userId = authContext?.userId;
      const authMethod = authContext?.authMethod || 'none';

      if (this.structuredLogger && tenantId) {
        this.structuredLogger.logErrorWithContext(
          'Error in StreamingChatController',
          error as Error,
          {
            requestId,
            tenantId,
            userId,
            path: event.path,
            method: event.httpMethod,
            authMethod
          }
        );
      } else {
        this.logger.error('Error in StreamingChatController', error as Error, {
          requestId,
          path: event.path,
          method: event.httpMethod,
          tenantId,
          userId,
          durationMs,
          authMethod
        });
      }

      return errorResponse(500, 'Internal server error');
    }
  }

  private validateRequest(body: string | null): { chatRequest: ChatRequestBody; stream: boolean } {
    const parsed = this.parseJsonBody(body);
    const stream = this.extractStreamFlag(parsed.stream);

    const result = chatRequestSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0]?.message || 'Invalid request body');
    }

    return { chatRequest: result.data, stream };
  }

  private parseJsonBody(body: string | null): any {
    try {
      return JSON.parse(body || '{}');
    } catch {
      throw new ValidationError('Request body must be valid JSON');
    }
  }

  private extractStreamFlag(value: unknown): boolean {
    if (value === undefined) {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    throw new ValidationError('stream must be a boolean');
  }

  private extractAuthenticationContext(event: APIGatewayProxyEvent): AuthenticationContext | null {
    // Check for custom authorizer context (API key authentication)
    const authorizerContext = event.requestContext.authorizer as any;
    if (authorizerContext?.tenantId && authorizerContext?.userId) {
      return {
        tenantId: authorizerContext.tenantId,
        userId: authorizerContext.userId,
        authMethod: 'apikey'
      };
    }

    // Try JWT verification
    const authHeader = Object.entries(event.headers || {}).find(
      ([headerName]) => headerName.toLowerCase() === 'authorization'
    )?.[1];

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const jwtResult = verifyJwt(token, this.logger);
      
      if (jwtResult.isValid && jwtResult.payload) {
        return {
          tenantId: jwtResult.payload['custom:tenant_id'],
          userId: jwtResult.payload.sub,
          authMethod: 'jwt'
        };
      }
    }

    // Try API key validation
    const apiKeyResult = validateApiKey(event.headers || {}, this.logger);
    if (apiKeyResult.isValid && apiKeyResult.tenantId && apiKeyResult.userId) {
      return {
        tenantId: apiKeyResult.tenantId,
        userId: apiKeyResult.userId,
        authMethod: 'apikey'
      };
    }

    return null;
  }

  private buildStreamResult(result: ChatWithAgentOutput): APIGatewayProxyResult {
    const message = result.choices[0]?.message;
    const content = message?.content ?? '';
    const chunks = this.chunkContent(content);

    const streamEvents = chunks.map(chunk => formatSSEData({
      id: result.id,
      object: 'chat.completion.chunk',
      model: result.model,
      choices: [{
        index: 0,
        delta: { content: chunk },
        finish_reason: null
      }]
    }));

    const finalChunk = formatSSEData({
      id: result.id,
      object: 'chat.completion.chunk',
      model: result.model,
      choices: [{
        index: 0,
        delta: {
          cited_urls: message?.cited_urls ?? [],
          isRag: message?.isRag ?? false
        },
        finish_reason: 'stop'
      }]
    });

    const body = [...streamEvents, finalChunk, DONE_SSE_EVENT].join('');

    return {
      statusCode: 200,
      headers: buildSSEHeaders(CORS_HEADERS),
      body
    };
  }

  private chunkContent(content: string): string[] {
    if (!content) {
      return [''];
    }

    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += STREAM_CHUNK_SIZE) {
      chunks.push(content.slice(i, i + STREAM_CHUNK_SIZE));
    }
    return chunks;
  }

  private logUnauthorizedAttempt(requestId: string, path: string): void {
    this.logger.info('Unauthorized access attempt', {
      requestId,
      path,
      reason: 'Missing authentication credentials'
    });
  }
}
