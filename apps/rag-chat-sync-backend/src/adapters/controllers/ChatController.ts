import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { validateChatRequestBody } from '../../shared/validation';
import { successResponse, errorResponse } from '../../shared/cors';
import { ValidationError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { extractApiKeyFromHeaders } from '../../shared/apiKey';

type AuthenticationContext = {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
};

export class ChatController {
  private readonly logger: ILogger;
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly useCase: ChatWithAgentUseCase,
    logger?: ILogger
  ) {
    this.logger = logger || { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };
    // Check if logger is CloudWatchLogger for structured logging
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

      // Log request summary
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

      // Log response summary with timing
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

      // Log error with full context
      const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
      const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
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

    // Check for JWT claims (Cognito authentication)
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

    // Fallback: validate API key from Authorization (preferred) or x-api-key (legacy)
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

  private logUnauthorizedAttempt(requestId: string, path: string): void {
    this.logger.info('Unauthorized access attempt', {
      requestId,
      path,
      reason: 'Missing authentication credentials'
    });
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
