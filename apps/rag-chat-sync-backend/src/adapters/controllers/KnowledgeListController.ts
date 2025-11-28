import { ListKnowledgeSpacesUseCase } from '../../use-cases/ListKnowledgeSpacesUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { successResponse, errorResponse } from '../../shared/cors';
import { extractApiKeyFromHeaders } from '../../shared/apiKey';

type AuthenticationContext = {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
};

export class KnowledgeListController {
  private readonly logger: ILogger;
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly useCase: ListKnowledgeSpacesUseCase,
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

      // Log request summary with structured logging
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

      this.logger.info('Knowledge list request received', {
        tenantId,
        userId,
        requestId,
        authMethod
      });

      const result = await this.useCase.execute({ tenantId });

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

      this.logger.info('Knowledge list request completed', {
        tenantId,
        userId,
        requestId,
        knowledgeSpaceCount: result.knowledgeSpaces.length,
        durationMs,
        authMethod
      });

      return successResponse(200, result);
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;

      // Log error with full context
      const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
      const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
      const authMethod = authContext?.authMethod || 'none';

      if (this.structuredLogger && tenantId) {
        this.structuredLogger.logErrorWithContext(
          'Error in KnowledgeListController',
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
        this.logger.error('Error in KnowledgeListController', error as Error, {
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

    if (tenantId && userId) {
      return { tenantId, userId, authMethod: 'jwt' };
    }

    // Fallback: validate API key from Authorization (preferred) or x-api-key (legacy)
    const { apiKey } = extractApiKeyFromHeaders(event.headers);
    const expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
    if (apiKey && (!expectedApiKey || apiKey === expectedApiKey)) {
      return { tenantId: 'default', userId: 'default', authMethod: 'apikey' };
    }

    return null;
  }

  private logUnauthorizedAttempt(requestId: string, path: string): void {
    this.logger.info('Unauthorized access attempt', {
      requestId,
      path,
      reason: 'Missing tenantId in claims'
    });
  }
}
