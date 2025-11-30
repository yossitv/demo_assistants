"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
/**
 * Lambda handler for POST /v1/chat/completions
 *
 * Processes chat requests with RAG (Retrieval-Augmented Generation).
 * Requires Cognito JWT with custom:tenant_id and sub claims.
 * Returns OpenAI-compatible chat completion with cited sources.
 */
const handler = async (event) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getChatController();
    return controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=chat.js.map