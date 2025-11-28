export class Conversation {
  constructor(
    public readonly conversationId: string,
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly userId: string,
    public readonly lastUserMessage: string,
    public readonly lastAssistantMessage: string,
    public readonly referencedUrls: string[],
    public readonly createdAt: Date = new Date(),
    public readonly isRag: boolean = true,
  ) {}
}
