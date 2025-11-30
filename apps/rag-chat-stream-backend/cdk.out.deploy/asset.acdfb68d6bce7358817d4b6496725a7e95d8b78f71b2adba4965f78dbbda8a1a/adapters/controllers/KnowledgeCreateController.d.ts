import { CreateKnowledgeSpaceUseCase } from '../../use-cases/CreateKnowledgeSpaceUseCase';
import { CreateProductKnowledgeSpaceUseCase } from '../../use-cases/CreateProductKnowledgeSpaceUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class KnowledgeCreateController {
    private readonly useCase;
    private readonly productUseCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: CreateKnowledgeSpaceUseCase, productUseCase: CreateProductKnowledgeSpaceUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private extractAuthenticationContext;
    private logUnauthorizedAttempt;
    private handleMultipartUpload;
    private parseMultipartFormData;
}
//# sourceMappingURL=KnowledgeCreateController.d.ts.map