import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class StreamingChatController {
    private readonly useCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: ChatWithAgentUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private validateRequest;
    private parseJsonBody;
    private extractStreamFlag;
    private extractAuthenticationContext;
    private buildStreamResult;
    private chunkContent;
    private logUnauthorizedAttempt;
}
//# sourceMappingURL=StreamingChatController.d.ts.map