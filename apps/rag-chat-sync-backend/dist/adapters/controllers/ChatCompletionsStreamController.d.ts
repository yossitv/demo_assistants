import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
export declare class ChatCompletionsStreamController {
    private readonly useCase;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(useCase: ChatWithAgentUseCase, logger?: ILogger);
    handle(event: APIGatewayProxyEvent, responseStream: awslambda.HttpResponseStream): Promise<void>;
    private createSSEStream;
    private writeJsonError;
    private streamCompletion;
    private chunkContent;
    private extractAuthenticationContext;
    private decodeJwtWithoutVerification;
}
//# sourceMappingURL=ChatCompletionsStreamController.d.ts.map