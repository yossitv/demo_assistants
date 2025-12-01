"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
const handler = async (event) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getProductKnowledgeCreateController();
    return await controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=productKnowledgeCreate.js.map