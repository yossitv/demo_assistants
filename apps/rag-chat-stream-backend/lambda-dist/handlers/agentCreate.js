"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
/**
 * Lambda handler for POST /v1/agent/create
 *
 * Creates a new Agent linked to one or more KnowledgeSpaces.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
const handler = async (event) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getAgentCreateController();
    return controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=agentCreate.js.map