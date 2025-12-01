import { CreateProductKnowledgeSpaceUseCase } from '../../use-cases/CreateProductKnowledgeSpaceUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class ProductKnowledgeCreateController {
    private readonly useCase;
    private readonly logger;
    constructor(useCase: CreateProductKnowledgeSpaceUseCase, logger: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private parseMultipartFormData;
}
//# sourceMappingURL=ProductKnowledgeCreateController.d.ts.map