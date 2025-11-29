import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class ChatController {
    private readonly useCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: ChatWithAgentUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private extractAuthenticationContext;
    private logUnauthorizedAttempt;
}
//# sourceMappingURL=ChatController.d.ts.map