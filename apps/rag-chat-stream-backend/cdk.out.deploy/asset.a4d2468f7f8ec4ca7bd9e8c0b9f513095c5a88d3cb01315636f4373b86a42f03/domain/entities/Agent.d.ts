export declare class Agent {
    readonly tenantId: string;
    readonly agentId: string;
    readonly name: string;
    readonly knowledgeSpaceIds: string[];
    readonly strictRAG: boolean;
    readonly description?: string | undefined;
    readonly createdAt: Date;
    constructor(tenantId: string, agentId: string, name: string, knowledgeSpaceIds: string[], strictRAG: boolean, description?: string | undefined, createdAt?: Date);
    private validate;
    canAnswerQuery(): boolean;
}
//# sourceMappingURL=Agent.d.ts.map