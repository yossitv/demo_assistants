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
exports.QdrantVectorRepository = void 0;
var Chunk_1 = require("../../domain/entities/Chunk");
var Embedding_1 = require("../../domain/value-objects/Embedding");
var retry_1 = require("../../shared/retry");
var errors_1 = require("../../shared/errors");
var QdrantVectorRepository = /** @class */ (function () {
    function QdrantVectorRepository(qdrantClient, logger) {
        this.qdrantClient = qdrantClient;
        this.logger = logger;
        this.circuitBreaker = new retry_1.CircuitBreaker();
    }
    QdrantVectorRepository.prototype.upsertChunks = function (namespace, chunks) {
        return __awaiter(this, void 0, void 0, function () {
            var collectionName, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        collectionName = namespace.toString();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        this.logger.debug('Upserting chunks to Qdrant', {
                            collection: collectionName,
                            chunkCount: chunks.length
                        });
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var _this = this;
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, this.circuitBreaker.execute(function () { return __awaiter(_this, void 0, void 0, function () {
                                            var points;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, this.ensureCollection(collectionName)];
                                                    case 1:
                                                        _a.sent();
                                                        points = chunks.map(function (chunk) { return ({
                                                            id: chunk.id, // Chunk ID should already be a UUID
                                                            vector: chunk.embedding.vector,
                                                            payload: {
                                                                chunkId: chunk.id, // Store original ID in payload for reference
                                                                tenantId: chunk.tenantId,
                                                                knowledgeSpaceId: chunk.knowledgeSpaceId,
                                                                url: chunk.url,
                                                                domain: chunk.domain,
                                                                crawlDate: chunk.crawlDate.toISOString(),
                                                                content: chunk.content,
                                                                metadata: chunk.metadata
                                                            }
                                                        }); });
                                                        return [4 /*yield*/, this.qdrantClient.upsert(collectionName, {
                                                                wait: true,
                                                                points: points
                                                            })];
                                                    case 2:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })];
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        this.logger.debug('Successfully upserted chunks to Qdrant', {
                            collection: collectionName,
                            chunkCount: chunks.length
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.logger.error('Failed to upsert chunks to Qdrant', error_1 instanceof Error ? error_1 : new Error(String(error_1)), {
                            collection: collectionName,
                            chunkCount: chunks.length
                        });
                        if (error_1 instanceof errors_1.ExternalServiceError) {
                            throw error_1;
                        }
                        throw new errors_1.ExternalServiceError('Failed to upsert chunks to vector store', 503);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    QdrantVectorRepository.prototype.searchSimilar = function (namespace, queryEmbedding, topK) {
        return __awaiter(this, void 0, void 0, function () {
            var collectionName, results, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        collectionName = namespace.toString();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        // Ensure collection exists for read paths as well to avoid NotFound errors on cold-started namespaces
                        return [4 /*yield*/, this.ensureCollection(collectionName)];
                    case 2:
                        // Ensure collection exists for read paths as well to avoid NotFound errors on cold-started namespaces
                        _a.sent();
                        this.logger.debug('Searching similar chunks in Qdrant', {
                            collection: collectionName,
                            topK: topK,
                            vectorDimension: queryEmbedding.vector.length
                        });
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var _this = this;
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, this.circuitBreaker.execute(function () {
                                            return _this.qdrantClient.search(collectionName, {
                                                vector: queryEmbedding.vector,
                                                limit: topK,
                                                with_payload: true,
                                                with_vector: true
                                            });
                                        })];
                                });
                            }); })];
                    case 3:
                        results = _a.sent();
                        this.logger.debug('Successfully retrieved similar chunks from Qdrant', {
                            collection: collectionName,
                            resultCount: results.length
                        });
                        return [2 /*return*/, results.map(function (result) { return ({
                                chunk: new Chunk_1.Chunk(result.id, result.payload.tenantId, result.payload.knowledgeSpaceId, result.payload.url, result.payload.domain, result.payload.content, new Embedding_1.Embedding(result.vector), result.payload.metadata, new Date(result.payload.crawlDate)),
                                score: result.score
                            }); })];
                    case 4:
                        error_2 = _a.sent();
                        this.logger.error('Failed to search similar chunks in Qdrant', error_2 instanceof Error ? error_2 : new Error(String(error_2)), {
                            collection: collectionName,
                            topK: topK
                        });
                        if (error_2 instanceof errors_1.ExternalServiceError) {
                            throw error_2;
                        }
                        throw new errors_1.ExternalServiceError('Failed to search similar chunks', 503);
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    QdrantVectorRepository.prototype.ensureCollection = function (collectionName) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.qdrantClient.getCollection(collectionName)];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        _a = _b.sent();
                        this.logger.debug('Creating new Qdrant collection', {
                            collection: collectionName,
                            vectorSize: 1536,
                            distance: 'Cosine'
                        });
                        return [4 /*yield*/, this.qdrantClient.createCollection(collectionName, {
                                vectors: {
                                    size: 1536,
                                    distance: 'Cosine'
                                }
                            })];
                    case 3:
                        _b.sent();
                        this.logger.debug('Successfully created Qdrant collection', {
                            collection: collectionName
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return QdrantVectorRepository;
}());
exports.QdrantVectorRepository = QdrantVectorRepository;
