"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
/**
 * Lambda handler for GET /v1/knowledge/list
 *
 * Lists all KnowledgeSpaces for a tenant.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
const handler = async (event) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getKnowledgeListController();
    return controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=knowledgeList.js.map