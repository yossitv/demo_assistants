"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAgentUseCase = void 0;
var Agent_1 = require("../domain/entities/Agent");
var CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
var CreateAgentUseCase = /** @class */ (function () {
    function CreateAgentUseCase(agentRepo, logger) {
        this.agentRepo = agentRepo;
        this.logger = logger;
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    CreateAgentUseCase.prototype.execute = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var agent, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('Creating agent', {
                            tenantId: input.tenantId,
                            name: input.name,
                            knowledgeSpaceCount: input.knowledgeSpaceIds.length,
                            strictRAG: input.strictRAG,
                            requestId: input.requestId
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        agent = new Agent_1.Agent(input.tenantId, this.generateId(), input.name, input.knowledgeSpaceIds, input.strictRAG, input.description, new Date());
                        return [4 /*yield*/, this.agentRepo.save(agent)];
                    case 2:
                        _a.sent();
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
                        return [2 /*return*/, {
                                agentId: agent.agentId,
                                status: 'created'
                            }];
                    case 3:
                        error_1 = _a.sent();
                        this.logger.error('Failed to create agent', error_1, {
                            tenantId: input.tenantId,
                            name: input.name,
                            requestId: input.requestId
                        });
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CreateAgentUseCase.prototype.generateId = function () {
        return "agent_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 11));
    };
    return CreateAgentUseCase;
}());
exports.CreateAgentUseCase = CreateAgentUseCase;
