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
exports.CreateKnowledgeSpaceUseCase = void 0;
var KnowledgeSpace_1 = require("../domain/entities/KnowledgeSpace");
var Chunk_1 = require("../domain/entities/Chunk");
var CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
var CreateKnowledgeSpaceUseCase = /** @class */ (function () {
    function CreateKnowledgeSpaceUseCase(knowledgeSpaceRepo, vectorRepo, crawlerService, chunkingService, embeddingService, logger) {
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.vectorRepo = vectorRepo;
        this.crawlerService = crawlerService;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.logger = logger;
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    CreateKnowledgeSpaceUseCase.prototype.execute = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var knowledgeSpace, allChunks, errors, successfulUrls, i, url, crawled, textChunks, _i, textChunks_1, text, embedding, chunk, error_1, errorMessage, status_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('Creating knowledge space', {
                            tenantId: input.tenantId,
                            name: input.name,
                            sourceUrlCount: input.sourceUrls.length,
                            sourceUrls: input.sourceUrls,
                            requestId: input.requestId
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 15, , 16]);
                        knowledgeSpace = new KnowledgeSpace_1.KnowledgeSpace(input.tenantId, this.generateId(), input.name, 'web', input.sourceUrls, this.getCurrentVersion(), new Date());
                        allChunks = [];
                        errors = [];
                        successfulUrls = 0;
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < input.sourceUrls.length)) return [3 /*break*/, 11];
                        url = input.sourceUrls[i];
                        // Log crawl start with structured logging
                        if (this.structuredLogger && input.requestId) {
                            this.structuredLogger.logCrawlProgress({
                                requestId: input.requestId,
                                tenantId: input.tenantId,
                                url: url,
                                urlIndex: i + 1,
                                totalUrls: input.sourceUrls.length,
                                status: 'started'
                            });
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 9, , 10]);
                        return [4 /*yield*/, this.crawlerService.crawlUrl(url)];
                    case 4:
                        crawled = _a.sent();
                        textChunks = this.chunkingService.chunkText(crawled.content, {
                            minTokens: 400,
                            maxTokens: 600,
                            overlapTokens: 75
                        });
                        _i = 0, textChunks_1 = textChunks;
                        _a.label = 5;
                    case 5:
                        if (!(_i < textChunks_1.length)) return [3 /*break*/, 8];
                        text = textChunks_1[_i];
                        return [4 /*yield*/, this.embeddingService.generateEmbedding(text)];
                    case 6:
                        embedding = _a.sent();
                        chunk = new Chunk_1.Chunk(this.generateChunkId(), knowledgeSpace.tenantId, knowledgeSpace.knowledgeSpaceId, crawled.url, crawled.domain, text, embedding, { title: crawled.title, version: knowledgeSpace.currentVersion }, crawled.crawlDate);
                        allChunks.push(chunk);
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8:
                        successfulUrls++;
                        // Log crawl completion with structured logging
                        if (this.structuredLogger && input.requestId) {
                            this.structuredLogger.logCrawlProgress({
                                requestId: input.requestId,
                                tenantId: input.tenantId,
                                url: url,
                                urlIndex: i + 1,
                                totalUrls: input.sourceUrls.length,
                                chunkCount: textChunks.length,
                                status: 'completed'
                            });
                        }
                        else {
                            this.logger.debug('URL processed successfully', {
                                tenantId: input.tenantId,
                                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                                url: url,
                                urlIndex: i + 1,
                                totalUrls: input.sourceUrls.length,
                                chunksCreated: textChunks.length,
                                requestId: input.requestId
                            });
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        errors.push({ url: url, error: errorMessage });
                        // Log crawl failure with structured logging
                        if (this.structuredLogger && input.requestId) {
                            this.structuredLogger.logCrawlProgress({
                                requestId: input.requestId,
                                tenantId: input.tenantId,
                                url: url,
                                urlIndex: i + 1,
                                totalUrls: input.sourceUrls.length,
                                status: 'failed',
                                errorMessage: errorMessage
                            });
                        }
                        else {
                            this.logger.error('Failed to process URL', error_1, {
                                tenantId: input.tenantId,
                                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                                url: url,
                                urlIndex: i + 1,
                                totalUrls: input.sourceUrls.length,
                                requestId: input.requestId
                            });
                        }
                        return [3 /*break*/, 10];
                    case 10:
                        i++;
                        return [3 /*break*/, 2];
                    case 11:
                        // Check if at least one URL succeeded
                        if (successfulUrls === 0) {
                            this.logger.error('All URLs failed to process', new Error('All URLs failed'), {
                                tenantId: input.tenantId,
                                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                                totalUrls: input.sourceUrls.length,
                                failedUrls: errors.length,
                                errors: errors,
                                requestId: input.requestId
                            });
                            throw new Error("All URLs failed to process. Failed URLs: ".concat(errors.length, ". ") +
                                "Errors: ".concat(errors.map(function (f) { return "".concat(f.url, ": ").concat(f.error); }).join('; ')));
                        }
                        this.logger.info('URL processing summary', {
                            tenantId: input.tenantId,
                            knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                            successfulUrls: successfulUrls,
                            failedUrls: errors.length,
                            totalUrls: input.sourceUrls.length,
                            requestId: input.requestId
                        });
                        if (!(allChunks.length > 0)) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.vectorRepo.upsertChunks(knowledgeSpace.getNamespace(), allChunks)];
                    case 12:
                        _a.sent();
                        this.logger.debug('Chunks stored in vector DB', {
                            tenantId: input.tenantId,
                            knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                            chunkCount: allChunks.length,
                            requestId: input.requestId
                        });
                        _a.label = 13;
                    case 13: 
                    // 4. Save KnowledgeSpace metadata
                    return [4 /*yield*/, this.knowledgeSpaceRepo.save(knowledgeSpace)];
                    case 14:
                        // 4. Save KnowledgeSpace metadata
                        _a.sent();
                        status_1 = errors.length > 0 && errors.length < input.sourceUrls.length
                            ? 'partial'
                            : errors.length === 0
                                ? 'completed'
                                : 'completed';
                        this.logger.info('Knowledge space created successfully', {
                            tenantId: input.tenantId,
                            knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                            name: input.name,
                            status: status_1,
                            totalUrls: input.sourceUrls.length,
                            successfulUrls: successfulUrls,
                            failedUrls: errors.length,
                            totalChunks: allChunks.length,
                            requestId: input.requestId
                        });
                        return [2 /*return*/, {
                                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                                status: status_1,
                                successfulUrls: successfulUrls,
                                failedUrls: errors.length,
                                errors: errors.length > 0 ? errors : undefined
                            }];
                    case 15:
                        error_2 = _a.sent();
                        this.logger.error('Failed to create knowledge space', error_2, {
                            tenantId: input.tenantId,
                            name: input.name,
                            sourceUrls: input.sourceUrls,
                            requestId: input.requestId
                        });
                        throw error_2;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    CreateKnowledgeSpaceUseCase.prototype.generateId = function () {
        return "ks_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 11));
    };
    CreateKnowledgeSpaceUseCase.prototype.generateChunkId = function () {
        // Generate UUID v4 for Qdrant compatibility
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    CreateKnowledgeSpaceUseCase.prototype.getCurrentVersion = function () {
        var now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    return CreateKnowledgeSpaceUseCase;
}());
exports.CreateKnowledgeSpaceUseCase = CreateKnowledgeSpaceUseCase;
