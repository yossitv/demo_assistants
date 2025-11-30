export type AgentPreset = 'none' | 'product_recommendation';
export declare class Agent {
    readonly tenantId: string;
    readonly agentId: string;
    readonly name: string;
    readonly knowledgeSpaceIds: string[];
    readonly strictRAG: boolean;
    readonly description?: string | undefined;
    readonly systemPrompt?: string | undefined;
    readonly preset?: AgentPreset | undefined;
    readonly createdAt: Date;
    constructor(tenantId: string, agentId: string, name: string, knowledgeSpaceIds: string[], strictRAG: boolean, description?: string | undefined, systemPrompt?: string | undefined, preset?: AgentPreset | undefined, createdAt?: Date);
    private validate;
    canAnswerQuery(): boolean;
    getSystemPrompt(): string;
    private getProductRecommendationPrompt;
}
//# sourceMappingURL=Agent.d.ts.map