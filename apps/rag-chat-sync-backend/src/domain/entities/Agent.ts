export class Agent {
  constructor(
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly name: string,
    public readonly knowledgeSpaceIds: string[],
    public readonly strictRAG: boolean,
    public readonly description?: string,
    public readonly createdAt: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.tenantId || !this.agentId) {
      throw new Error('Agent must have tenantId and agentId');
    }
    if (this.knowledgeSpaceIds.length === 0) {
      throw new Error('Agent must be linked to at least one KnowledgeSpace');
    }
  }

  canAnswerQuery(): boolean {
    return this.knowledgeSpaceIds.length > 0;
  }
}
