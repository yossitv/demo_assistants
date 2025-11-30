"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    tenantId;
    agentId;
    name;
    knowledgeSpaceIds;
    strictRAG;
    description;
    systemPrompt;
    preset;
    createdAt;
    constructor(tenantId, agentId, name, knowledgeSpaceIds, strictRAG, description, systemPrompt, preset, createdAt = new Date()) {
        this.tenantId = tenantId;
        this.agentId = agentId;
        this.name = name;
        this.knowledgeSpaceIds = knowledgeSpaceIds;
        this.strictRAG = strictRAG;
        this.description = description;
        this.systemPrompt = systemPrompt;
        this.preset = preset;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.tenantId || !this.agentId) {
            throw new Error('Agent must have tenantId and agentId');
        }
        if (this.knowledgeSpaceIds.length === 0) {
            throw new Error('Agent must be linked to at least one KnowledgeSpace');
        }
    }
    canAnswerQuery() {
        return this.knowledgeSpaceIds.length > 0;
    }
    getSystemPrompt() {
        if (this.systemPrompt) {
            return this.systemPrompt;
        }
        if (this.preset === 'product_recommendation') {
            return this.getProductRecommendationPrompt();
        }
        return 'You are a helpful AI assistant.';
    }
    getProductRecommendationPrompt() {
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
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map