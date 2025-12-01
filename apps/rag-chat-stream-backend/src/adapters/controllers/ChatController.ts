import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { validateChatRequestBody } from '../../shared/validation';
import { successResponse, errorResponse } from '../../shared/cors';
import { ValidationError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { AuthenticationContext } from '../../shared/auth';
import { validateApiKey } from '../../shared/apiKeyCheck';
import { verifyJwt } from '../../shared/jwtVerify';

export class ChatController {
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

      this.logger.info('Chat request received', {
        tenantId,
        userId,
        requestId,
        agentId: validatedBody.model,
        messageCount: validatedBody.messages.length,
        hasSystemMessage: validatedBody.messages.some(m => m.role === 'system'),
        authMethod
      });

      const result = await this.useCase.execute({
        tenantId,
        userId,
        agentId: validatedBody.model,
        messages: validatedBody.messages,
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

      this.logger.info('Chat request completed', {
        tenantId,
        userId,
        requestId,
        agentId: validatedBody.model,
        citedUrlCount: result.choices[0]?.message?.cited_urls?.length || 0,
        conversationId: result.id,
        durationMs,
        authMethod
      });

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
          'Error in ChatController',
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
        this.logger.error('Error in ChatController', error as Error, {
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

  private logUnauthorizedAttempt(requestId: string, path: string): void {
    this.logger.info('Unauthorized access attempt', {
      requestId,
      path,
      reason: 'Missing authentication credentials'
    });
  }
}
