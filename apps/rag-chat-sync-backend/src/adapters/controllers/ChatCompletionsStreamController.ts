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
import { extractApiKeyFromHeaders } from '../../shared/apiKey';
import { CORS_HEADERS } from '../../shared/cors';

type AuthenticationContext = {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
};

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

      const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
      const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
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
    const authorizerContext = event.requestContext.authorizer as any;
    if (authorizerContext?.tenantId && authorizerContext?.userId) {
      return {
        tenantId: authorizerContext.tenantId,
        userId: authorizerContext.userId,
        authMethod: 'apikey'
      };
    }

    const claims = authorizerContext?.claims;
    const tenantId = claims?.['custom:tenant_id'];
    const userId = claims?.sub;

    const authHeader = Object.entries(event.headers || {}).find(
      ([headerName]) => headerName.toLowerCase() === 'authorization'
    )?.[1];

    if (!tenantId || !userId) {
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      const decodedClaims = bearerToken ? this.decodeJwtWithoutVerification(bearerToken) : null;
      const decodedTenantId = decodedClaims?.['custom:tenant_id'] as string | undefined;
      const decodedUserId = decodedClaims?.sub as string | undefined;

      if (decodedTenantId && decodedUserId) {
        return { tenantId: decodedTenantId, userId: decodedUserId, authMethod: 'jwt' };
      }
    }

    if (tenantId && userId) {
      return { tenantId, userId, authMethod: 'jwt' };
    }

    const { apiKey } = extractApiKeyFromHeaders(event.headers);
    const expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
    const apiKeyIsValid = apiKey && (!expectedApiKey || apiKey === expectedApiKey);

    if (apiKeyIsValid) {
      return {
        tenantId: 'default',
        userId: 'default',
        authMethod: 'apikey'
      };
    }

    return null;
  }

  private decodeJwtWithoutVerification(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
