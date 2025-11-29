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
exports.OpenAIEmbeddingService = void 0;
var Embedding_1 = require("../../domain/value-objects/Embedding");
var retry_1 = require("../../shared/retry");
var errors_1 = require("../../shared/errors");
var OpenAIEmbeddingService = /** @class */ (function () {
    function OpenAIEmbeddingService(openai, logger, model, retryOptions) {
        if (model === void 0) { model = 'text-embedding-3-small'; }
        if (retryOptions === void 0) { retryOptions = {}; }
        this.openai = openai;
        this.logger = logger;
        this.model = model;
        this.circuitBreaker = new retry_1.CircuitBreaker();
        this.retryOptions = retryOptions;
    }
    OpenAIEmbeddingService.prototype.generateEmbedding = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, textLength, error_1, duration;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        textLength = text.length;
                        this.logger.debug('Generating embedding', {
                            model: this.model,
                            textLength: textLength
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var response, duration;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.circuitBreaker.execute(function () {
                                                return _this.openai.embeddings.create({
                                                    model: _this.model,
                                                    input: text
                                                });
                                            })];
                                        case 1:
                                            response = _a.sent();
                                            duration = Date.now() - startTime;
                                            this.logger.debug('Embedding generated successfully', {
                                                model: this.model,
                                                textLength: textLength,
                                                embeddingDimensions: response.data[0].embedding.length,
                                                durationMs: duration
                                            });
                                            return [2 /*return*/, new Embedding_1.Embedding(response.data[0].embedding)];
                                    }
                                });
                            }); }, this.retryOptions)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        duration = Date.now() - startTime;
                        this.logger.error('Failed to generate embedding', error_1, {
                            model: this.model,
                            textLength: textLength,
                            durationMs: duration
                        });
                        if (error_1 instanceof errors_1.ExternalServiceError) {
                            throw error_1;
                        }
                        throw new errors_1.ExternalServiceError('Failed to generate embedding', 503);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OpenAIEmbeddingService.prototype.generateEmbeddings = function (texts) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, textCount, totalTextLength, error_2, duration;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        textCount = texts.length;
                        totalTextLength = texts.reduce(function (sum, text) { return sum + text.length; }, 0);
                        this.logger.debug('Generating embeddings batch', {
                            model: this.model,
                            textCount: textCount,
                            totalTextLength: totalTextLength,
                            averageTextLength: Math.round(totalTextLength / textCount)
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var response, duration;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.circuitBreaker.execute(function () {
                                                return _this.openai.embeddings.create({
                                                    model: _this.model,
                                                    input: texts
                                                });
                                            })];
                                        case 1:
                                            response = _a.sent();
                                            duration = Date.now() - startTime;
                                            this.logger.debug('Embeddings batch generated successfully', {
                                                model: this.model,
                                                textCount: textCount,
                                                totalTextLength: totalTextLength,
                                                embeddingDimensions: response.data[0].embedding.length,
                                                durationMs: duration
                                            });
                                            return [2 /*return*/, response.data.map(function (item) { return new Embedding_1.Embedding(item.embedding); })];
                                    }
                                });
                            }); }, this.retryOptions)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_2 = _a.sent();
                        duration = Date.now() - startTime;
                        this.logger.error('Failed to generate embeddings batch', error_2, {
                            model: this.model,
                            textCount: textCount,
                            totalTextLength: totalTextLength,
                            durationMs: duration
                        });
                        if (error_2 instanceof errors_1.ExternalServiceError) {
                            throw error_2;
                        }
                        throw new errors_1.ExternalServiceError('Failed to generate embeddings', 503);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return OpenAIEmbeddingService;
}());
exports.OpenAIEmbeddingService = OpenAIEmbeddingService;
