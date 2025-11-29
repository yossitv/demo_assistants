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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWithAgentUseCase = void 0;
var Conversation_1 = require("../domain/entities/Conversation");
var CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
var errors_1 = require("../shared/errors");
var ChatWithAgentUseCase = /** @class */ (function () {
    function ChatWithAgentUseCase(agentRepo, knowledgeSpaceRepo, conversationRepo, vectorRepo, embeddingService, llmService, logger) {
        this.agentRepo = agentRepo;
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.conversationRepo = conversationRepo;
        this.vectorRepo = vectorRepo;
        this.embeddingService = embeddingService;
        this.llmService = llmService;
        this.logger = logger;
        this.SIMILARITY_THRESHOLD = 0.35;
        this.TOP_K = 8;
        this.MAX_CONTEXT_CHUNKS = 5;
        this.MAX_CITED_URLS = 3;
        this.NO_INFO_MESSAGE = 'このサイトには情報がありませんでした。';
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    ChatWithAgentUseCase.prototype.execute = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var agent, lastUserMessage, queryEmbedding, allResults, _i, _a, ksId, ks, results, filteredResults, topResults, conversationId_1, conversation_1, contextMarkdown, citedUrls, prompt, logLevel, nodeEnv, assistantMessage, conversationId, conversation;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.agentRepo.findByTenantAndId(input.tenantId, input.agentId)];
                    case 1:
                        agent = _b.sent();
                        if (!agent) {
                            throw new errors_1.NotFoundError('Agent not found');
                        }
                        lastUserMessage = this.extractLastUserMessage(input.messages);
                        // Log chat request processing (Requirement 7.1)
                        this.logger.info('Processing chat request', {
                            tenantId: input.tenantId,
                            agentId: input.agentId,
                            userId: input.userId,
                            userMessage: lastUserMessage.substring(0, 200) + (lastUserMessage.length > 200 ? '...' : ''),
                            requestId: input.requestId
                        });
                        return [4 /*yield*/, this.embeddingService.generateEmbedding(lastUserMessage)];
                    case 2:
                        queryEmbedding = _b.sent();
                        allResults = [];
                        _i = 0, _a = agent.knowledgeSpaceIds;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        ksId = _a[_i];
                        return [4 /*yield*/, this.knowledgeSpaceRepo.findByTenantAndId(input.tenantId, ksId)];
                    case 4:
                        ks = _b.sent();
                        if (!ks) {
                            this.logger.warn('KnowledgeSpace not found', {
                                tenantId: input.tenantId,
                                agentId: input.agentId,
                                knowledgeSpaceId: ksId,
                                requestId: input.requestId
                            });
                            return [3 /*break*/, 6];
                        }
                        return [4 /*yield*/, this.vectorRepo.searchSimilar(ks.getNamespace(), queryEmbedding, this.TOP_K)];
                    case 5:
                        results = _b.sent();
                        allResults.push.apply(allResults, results);
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 3];
                    case 7:
                        filteredResults = allResults
                            .filter(function (r) { return r.score >= _this.SIMILARITY_THRESHOLD; })
                            .sort(function (a, b) { return b.score - a.score; })
                            .slice(0, this.MAX_CONTEXT_CHUNKS);
                        topResults = filteredResults.slice(0, 3);
                        if (this.structuredLogger && input.requestId) {
                            this.structuredLogger.logRAGSearch({
                                requestId: input.requestId,
                                tenantId: input.tenantId,
                                agentId: input.agentId,
                                hitCount: filteredResults.length,
                                topUrls: topResults.map(function (r) { return r.chunk.url; }),
                                topScores: topResults.map(function (r) { return r.score; }),
                                threshold: this.SIMILARITY_THRESHOLD
                            });
                        }
                        else {
                            this.logger.debug('RAG search completed', {
                                tenantId: input.tenantId,
                                agentId: input.agentId,
                                hitCount: filteredResults.length,
                                topUrls: topResults.map(function (r) { return r.chunk.url; }),
                                topScores: topResults.map(function (r) { return r.score; }),
                                threshold: this.SIMILARITY_THRESHOLD,
                                requestId: input.requestId
                            });
                        }
                        if (!(agent.strictRAG && filteredResults.length === 0)) return [3 /*break*/, 9];
                        conversationId_1 = this.generateConversationId();
                        conversation_1 = new Conversation_1.Conversation(conversationId_1, input.tenantId, input.agentId, input.userId, lastUserMessage, this.NO_INFO_MESSAGE, [], new Date(), false);
                        return [4 /*yield*/, this.conversationRepo.save(conversation_1)];
                    case 8:
                        _b.sent();
                        return [2 /*return*/, {
                                id: conversationId_1,
                                object: 'chat.completion',
                                model: input.agentId,
                                choices: [{
                                        message: {
                                            role: 'assistant',
                                            content: this.NO_INFO_MESSAGE,
                                            cited_urls: [],
                                            isRag: false,
                                        }
                                    }]
                            }];
                    case 9:
                        contextMarkdown = this.buildContextMarkdown(filteredResults);
                        citedUrls = this.extractCitedUrls(filteredResults);
                        prompt = this.buildPrompt(contextMarkdown, input.messages, lastUserMessage);
                        logLevel = process.env.LOG_LEVEL || 'INFO';
                        nodeEnv = process.env.NODE_ENV || 'development';
                        if (logLevel === 'DEBUG' || nodeEnv !== 'production') {
                            this.logger.debug('Final prompt constructed', {
                                tenantId: input.tenantId,
                                agentId: input.agentId,
                                requestId: input.requestId,
                                promptLength: prompt.length,
                                prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '') // Log first 500 chars
                            });
                        }
                        return [4 /*yield*/, this.llmService.generateCompletion(prompt)];
                    case 10:
                        assistantMessage = _b.sent();
                        conversationId = this.generateConversationId();
                        conversation = new Conversation_1.Conversation(conversationId, input.tenantId, input.agentId, input.userId, lastUserMessage, assistantMessage, citedUrls, new Date(), true);
                        return [4 /*yield*/, this.conversationRepo.save(conversation)];
                    case 11:
                        _b.sent();
                        return [2 /*return*/, {
                                id: conversationId,
                                object: 'chat.completion',
                                model: input.agentId,
                                choices: [{
                                        message: {
                                            role: 'assistant',
                                            content: assistantMessage,
                                            cited_urls: citedUrls,
                                            isRag: true,
                                        }
                                    }]
                            }];
                }
            });
        });
    };
    ChatWithAgentUseCase.prototype.extractLastUserMessage = function (messages) {
        var userMessages = messages.filter(function (m) { return m.role === 'user'; });
        if (userMessages.length === 0) {
            throw new Error('No user message found');
        }
        return userMessages[userMessages.length - 1].content;
    };
    ChatWithAgentUseCase.prototype.buildContextMarkdown = function (results) {
        var markdown = '# Context Documents (DO NOT DISCARD)\n\n';
        results.forEach(function (result, index) {
            markdown += "".concat(index + 1, ". [").concat(result.chunk.metadata.title, "](").concat(result.chunk.url, ")\n");
            markdown += "".concat(result.chunk.content, "\n\n");
        });
        return markdown;
    };
    ChatWithAgentUseCase.prototype.extractCitedUrls = function (results) {
        var urls = __spreadArray([], new Set(results.map(function (r) { return r.chunk.url; })), true);
        return urls.slice(0, this.MAX_CITED_URLS);
    };
    ChatWithAgentUseCase.prototype.buildPrompt = function (contextMarkdown, messages, latestUserMessage) {
        var history = messages.map(function (m) { return "".concat(m.role.toUpperCase(), ": ").concat(m.content); }).join('\n');
        return "SYSTEM: \u3042\u306A\u305F\u306F\u516C\u5F0F\u30B5\u30DD\u30FC\u30C8AI\u3067\u3059\u3002\n\u4E0E\u3048\u3089\u308C\u305F\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306E\u7BC4\u56F2\u5185\u306E\u307F\u3067\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306B\u60C5\u5831\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u5FC5\u305A\u6B21\u306E\u3088\u3046\u306B\u7B54\u3048\u3066\u304F\u3060\u3055\u3044\uFF1A\n\u300C\u3053\u306E\u30B5\u30A4\u30C8\u306B\u306F\u60C5\u5831\u304C\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u300D\n\nAGENT POLICY:\n- \u4E01\u5BE7\u306A\u30D3\u30B8\u30CD\u30B9\u53E3\u8ABF\u3067\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n- \u63A8\u6E2C\u3067\u56DE\u7B54\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\n- \u7B87\u6761\u66F8\u304D\u304C\u6709\u52B9\u306A\u5834\u5408\u306F\u7B87\u6761\u66F8\u304D\u3092\u5229\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\nCONTEXT:\n".concat(contextMarkdown, "\n\nCONVERSATION HISTORY:\n").concat(history, "\n\nUSER: ").concat(latestUserMessage, "\n\nTASK: \u4E0A\u8A18\u306ECONTEXT\u306E\u60C5\u5831\u3060\u3051\u306B\u57FA\u3065\u3044\u3066\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u306B\u65E5\u672C\u8A9E\u3067\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    };
    ChatWithAgentUseCase.prototype.generateConversationId = function () {
        return "conv_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 11));
    };
    return ChatWithAgentUseCase;
}());
exports.ChatWithAgentUseCase = ChatWithAgentUseCase;
