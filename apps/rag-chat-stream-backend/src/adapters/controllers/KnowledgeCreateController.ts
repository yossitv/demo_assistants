import { CreateKnowledgeSpaceUseCase } from '../../use-cases/CreateKnowledgeSpaceUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { validateKnowledgeCreateBody } from '../../shared/validation';
import { ValidationError } from '../../shared/errors';
import { successResponse, errorResponse } from '../../shared/cors';
import { ILogger } from '../../domain/services/ILogger';
import { CloudWatchLogger } from '../../infrastructure/services/CloudWatchLogger';
import { AuthenticationContext } from '../../shared/auth';
import { validateApiKey } from '../../shared/apiKeyCheck';
import { verifyJwt } from '../../shared/jwtVerify';

export class KnowledgeCreateController {
  private readonly logger: ILogger;
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly useCase: CreateKnowledgeSpaceUseCase,
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
      const validatedBody = validateKnowledgeCreateBody(event.body);

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

      this.logger.info('Knowledge space creation request received', {
        tenantId,
        userId,
        requestId,
        urlCount: validatedBody.sourceUrls.length,
        name: validatedBody.name,
        authMethod
      });

      const result = await this.useCase.execute({
        tenantId,
        name: validatedBody.name,
        sourceUrls: validatedBody.sourceUrls,
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

      this.logger.info('Knowledge space creation completed', {
        tenantId,
        userId,
        requestId,
        knowledgeSpaceId: result.knowledgeSpaceId,
        status: result.status,
        successfulUrls: result.successfulUrls,
        failedUrls: result.failedUrls,
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
          'Error in KnowledgeCreateController',
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
        this.logger.error('Error in KnowledgeCreateController', error as Error, {
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
      reason: 'Missing tenantId in claims'
    });
  }


}
