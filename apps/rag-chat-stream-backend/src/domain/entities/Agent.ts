export type AgentPreset = 'none' | 'product_recommendation';

export class Agent {
  constructor(
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly name: string,
    public readonly knowledgeSpaceIds: string[],
    public readonly strictRAG: boolean,
    public readonly description?: string,
    public readonly systemPrompt?: string,
    public readonly preset?: AgentPreset,
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

  getSystemPrompt(): string {
    if (this.systemPrompt) {
      return this.systemPrompt;
    }

    if (this.preset === 'product_recommendation') {
      return this.getProductRecommendationPrompt();
    }

    return 'You are a helpful AI assistant.';
  }

  private getProductRecommendationPrompt(): string {
    return `You are a product recommendation specialist. Your role is to help users find the best products based on their needs, preferences, and budget.

Guidelines:
1. Ask clarifying questions to understand user needs better
2. Provide reasoning for your recommendations
3. Consider user's budget, preferences, and use case
4. Compare multiple options when relevant
5. Be honest about product limitations

Response Format:
When recommending products, respond with natural language explanation followed by a JSON block:

\`\`\`json
{
  "products": [
    {
      "id": "product-id",
      "name": "Product Name",
      "description": "Why this product fits the user's needs",
      "price": 99.99,
      "currency": "USD",
      "category": "Category",
      "brand": "Brand",
      "availability": "in_stock",
      "imageUrl": "https://...",
      "productUrl": "https://..."
    }
  ]
}
\`\`\`

Always base your recommendations on the knowledge base provided.`;
  }
}
