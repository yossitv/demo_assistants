import { ListKnowledgeSpacesUseCase } from '../../use-cases/ListKnowledgeSpacesUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class KnowledgeListController {
    private readonly useCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: ListKnowledgeSpacesUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private extractAuthenticationContext;
    private logUnauthorizedAttempt;
}
//# sourceMappingURL=KnowledgeListController.d.ts.map