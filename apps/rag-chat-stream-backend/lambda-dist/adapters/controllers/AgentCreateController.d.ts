import { CreateAgentUseCase } from '../../use-cases/CreateAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class AgentCreateController {
    private readonly useCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: CreateAgentUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private extractAuthenticationContext;
    private logUnauthorizedAttempt;
}
//# sourceMappingURL=AgentCreateController.d.ts.map