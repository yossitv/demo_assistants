import { ChatWithAgentOutput, ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent } from '../../shared/types';
import { validateChatRequestBody } from '../../shared/validation';
import { ValidationError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { buildSSEHeaders, SSE_HEADERS, STREAM_CHUNK_SIZE } from '../../shared/streaming';
import {
  createContentChunk,
  createFinalChunk,
  createInitialChunk,
  formatSseEvent,
  splitAnswerIntoChunks,
  SSE_DONE_EVENT
} from '../../shared/sse';
import { CORS_HEADERS } from '../../shared/cors';
import { AuthenticationContext } from '../../shared/auth';
import { validateApiKey } from '../../shared/apiKeyCheck';
import { verifyJwt } from '../../shared/jwtVerify';

const noopLogger: ILogger = { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };

export class ChatCompletionsStreamController {
  private readonly logger: ILogger;
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly useCase: ChatWithAgentUseCase,
    logger?: ILogger
  ) {
    this.logger = logger || noopLogger;
    if (logger instanceof CloudWatchLogger) {
      this.structuredLogger = logger;
    }
  }

  async handle(event: APIGatewayProxyEvent, responseStream: awslambda.HttpResponseStream): Promise<void> {
    const requestId = event.requestContext.requestId;
    const startTime = Date.now();
    let authContext: AuthenticationContext | null = null;

    try {
      authContext = this.extractAuthenticationContext(event);

      if (!authContext) {
        this.writeJsonError(responseStream, 401, 'Unauthorized');
        return;
      }

      const { tenantId, userId, authMethod } = authContext;
      const validatedBody = validateChatRequestBody(event.body);

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

      this.logger.info('Streaming chat request received', {
        tenantId,
        userId,
        requestId,
        agentId: validatedBody.model,
        messageCount: validatedBody.messages.length,
        authMethod
      });

      const result = await this.useCase.execute({
        tenantId,
        userId,
        agentId: validatedBody.model,
        messages: validatedBody.messages,
        requestId
      });

      const stream = this.createSSEStream(responseStream);
      this.streamCompletion(stream, result);

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

      this.logger.info('Streaming chat request completed', {
        tenantId,
        userId,
        requestId,
        agentId: validatedBody.model,
        citedUrlCount: result.choices[0]?.message?.cited_urls?.length || 0,
        conversationId: result.id,
        durationMs,
        authMethod
      });
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;

      if (error instanceof ValidationError) {
        this.logger.info('Validation error', {
          requestId,
          error: error.message,
          durationMs
        });
        this.writeJsonError(responseStream, 400, error.message);
        return;
      }

      const tenantId = authContext?.tenantId;
      const userId = authContext?.userId;
      const authMethod = authContext?.authMethod || 'none';

      if (this.structuredLogger && tenantId) {
        this.structuredLogger.logErrorWithContext(
          'Error in ChatCompletionsStreamController',
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
        this.logger.error('Error in ChatCompletionsStreamController', error as Error, {
          requestId,
          path: event.path,
          method: event.httpMethod,
          tenantId,
          userId,
          durationMs,
          authMethod
        });
      }

      this.writeJsonError(responseStream, 500, 'Internal server error');
    }
  }

  private createSSEStream(responseStream: awslambda.HttpResponseStream): awslambda.HttpResponseStream {
    const streamWithHeaders = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: buildSSEHeaders(CORS_HEADERS)
    });
    streamWithHeaders.setContentType(SSE_HEADERS['Content-Type']);
    return streamWithHeaders;
  }

  private writeJsonError(responseStream: awslambda.HttpResponseStream, statusCode: number, message: string): void {
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });

    stream.write(JSON.stringify({ error: { message } }));
    stream.end();
  }

  private streamCompletion(stream: awslambda.HttpResponseStream, result: ChatWithAgentOutput): void {
    const choice = result.choices[0]?.message;
    const content = choice?.content || '';
    const citedUrls = choice?.cited_urls || [];
    const created = Math.floor(Date.now() / 1000);

    const initialChunk = createInitialChunk({ id: result.id, model: result.model, created });
    stream.write(formatSseEvent(initialChunk));

    this.chunkContent(content).forEach(chunk => {
      const payload = createContentChunk({
        id: result.id,
        model: result.model,
        content: chunk,
        created
      });
      stream.write(formatSseEvent(payload));
    });

    const finalChunk = createFinalChunk({ id: result.id, model: result.model, created });
    const finalDelta = finalChunk.choices[0].delta as Record<string, unknown>;
    if (citedUrls.length > 0) {
      finalDelta.cited_urls = citedUrls;
    }
    if (typeof choice?.isRag === 'boolean') {
      finalDelta.isRag = choice.isRag;
    }
    finalChunk.choices[0].delta = finalDelta as any;
    stream.write(formatSseEvent(finalChunk));

    stream.write(SSE_DONE_EVENT);
    stream.end();
  }

  private chunkContent(content: string): string[] {
    return splitAnswerIntoChunks(content, STREAM_CHUNK_SIZE);
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
}
