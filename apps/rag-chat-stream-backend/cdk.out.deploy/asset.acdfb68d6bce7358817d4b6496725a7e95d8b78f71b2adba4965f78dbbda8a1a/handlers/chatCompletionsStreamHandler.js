"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const DIContainer_1 = require("../infrastructure/di/DIContainer");
/**
 * Lambda handler for streaming chat completions (/v1/chat/completions/stream)
 */
exports.handler = awslambda.streamifyResponse(async (event, responseStream) => {
    const container = DIContainer_1.DIContainer.getInstance();
    const controller = container.getChatCompletionsStreamController();
    await controller.handle(event, responseStream);
});
//# sourceMappingURL=chatCompletionsStreamHandler.js.map