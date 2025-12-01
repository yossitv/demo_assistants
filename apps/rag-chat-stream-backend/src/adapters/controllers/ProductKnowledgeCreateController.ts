import { CreateProductKnowledgeSpaceUseCase } from '../../use-cases/CreateProductKnowledgeSpaceUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { successResponse, errorResponse } from '../../shared/cors';
import { ILogger } from '../../domain/services/ILogger';

export class ProductKnowledgeCreateController {
  constructor(
    private readonly useCase: CreateProductKnowledgeSpaceUseCase,
    private readonly logger: ILogger
  ) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const requestId = event.requestContext.requestId;

    try {
      // Extract tenant ID from authorizer context
      const tenantId = event.requestContext.authorizer?.claims?.['custom:tenant_id'];
      if (!tenantId) {
        return errorResponse(401, 'Unauthorized');
      }

      // Parse multipart form data
      const { name, fileContent } = this.parseMultipartFormData(event);

      if (!name || !fileContent) {
        return errorResponse(400, 'Missing required fields: name and file');
      }

      this.logger.info('Product knowledge space creation request', {
        tenantId,
        name,
        requestId,
        fileSize: fileContent.length
      });

      const result = await this.useCase.execute({
        tenantId,
        name,
        fileContent,
        requestId
      });

      this.logger.info('Product knowledge space created', {
        tenantId,
        knowledgeSpaceId: result.knowledgeSpaceId,
        status: result.status,
        documentCount: result.documentCount
      });

      return successResponse(200, result);
    } catch (error) {
      this.logger.error(
        'Failed to create product knowledge space',
        error instanceof Error ? error : new Error(String(error)),
        { requestId }
      );

      return errorResponse(500, 'Internal server error');
    }
  }

  private parseMultipartFormData(event: APIGatewayProxyEvent): { name?: string; fileContent?: string } {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return {};
    }

    const body = (event as any).isBase64Encoded 
      ? Buffer.from(event.body || '', 'base64').toString('utf-8')
      : event.body || '';

    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return {};
    }

    const boundary = boundaryMatch[1];
    const parts = body.split(`--${boundary}`);

    let name: string | undefined;
    let fileContent: string | undefined;

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        if (!nameMatch) continue;

        const fieldName = nameMatch[1];
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const contentEnd = part.lastIndexOf('\r\n');
        const content = part.substring(contentStart, contentEnd);

        if (fieldName === 'name') {
          name = content.trim();
        } else if (fieldName === 'file') {
          fileContent = content;
        }
      }
    }

    return { name, fileContent };
  }
}
