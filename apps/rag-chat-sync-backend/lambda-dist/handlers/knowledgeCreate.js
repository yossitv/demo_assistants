"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
/**
 * Lambda handler for POST /v1/knowledge/create
 *
 * Creates a new KnowledgeSpace by crawling URLs and storing embeddings.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
const handler = async (event) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getKnowledgeCreateController();
    return controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=knowledgeCreate.js.map