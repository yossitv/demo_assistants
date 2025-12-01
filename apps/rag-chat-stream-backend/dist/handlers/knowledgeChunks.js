"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const KnowledgeChunksController_1 = require("../adapters/controllers/KnowledgeChunksController");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
const qdrantClient = new js_client_rest_1.QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});
const logger = new CloudWatchLogger_1.CloudWatchLogger();
const controller = new KnowledgeChunksController_1.KnowledgeChunksController(qdrantClient, logger);
const handler = async (event) => {
    return controller.handle(event);
};
exports.handler = handler;
//# sourceMappingURL=knowledgeChunks.js.map