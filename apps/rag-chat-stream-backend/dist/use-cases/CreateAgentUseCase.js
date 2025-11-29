"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAgentUseCase = void 0;
const Agent_1 = require("../domain/entities/Agent");
const CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
class CreateAgentUseCase {
    agentRepo;
    logger;
    structuredLogger;
    constructor(agentRepo, logger) {
        this.agentRepo = agentRepo;
        this.logger = logger;
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    async execute(input) {
        this.logger.info('Creating agent', {
            tenantId: input.tenantId,
            name: input.name,
            knowledgeSpaceCount: input.knowledgeSpaceIds.length,
            strictRAG: input.strictRAG,
            requestId: input.requestId
        });
        try {
            const agent = new Agent_1.Agent(input.tenantId, this.generateId(), input.name, input.knowledgeSpaceIds, input.strictRAG, input.description, new Date());
            await this.agentRepo.save(agent);
            // Log agent creation with structured logging
            if (this.structuredLogger && input.requestId) {
                this.structuredLogger.logAgentCreation({
                    requestId: input.requestId,
                    tenantId: input.tenantId,
                    agentId: agent.agentId,
                    agentName: agent.name,
                    knowledgeSpaceIds: agent.knowledgeSpaceIds,
                    strictRAG: agent.strictRAG
                });
            }
            else {
                this.logger.info('Agent created successfully', {
                    tenantId: input.tenantId,
                    agentId: agent.agentId,
                    name: input.name,
                    knowledgeSpaceIds: input.knowledgeSpaceIds,
                    strictRAG: input.strictRAG,
                    requestId: input.requestId
                });
            }
            return {
                agentId: agent.agentId,
                status: 'created'
            };
        }
        catch (error) {
            this.logger.error('Failed to create agent', error, {
                tenantId: input.tenantId,
                name: input.name,
                requestId: input.requestId
            });
            throw error;
        }
    }
    generateId() {
        return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
exports.CreateAgentUseCase = CreateAgentUseCase;
//# sourceMappingURL=CreateAgentUseCase.js.map