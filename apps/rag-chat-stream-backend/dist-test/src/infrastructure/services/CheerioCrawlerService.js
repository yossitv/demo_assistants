"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheerioCrawlerService = void 0;
var axios_1 = __importDefault(require("axios"));
var cheerio = __importStar(require("cheerio"));
var retry_1 = require("../../shared/retry");
var errors_1 = require("../../shared/errors");
var CheerioCrawlerService = /** @class */ (function () {
    function CheerioCrawlerService(retryOptions) {
        if (retryOptions === void 0) { retryOptions = {}; }
        this.requestTimeoutMs = 10000; // 10 seconds
        this.circuitBreaker = new retry_1.CircuitBreaker();
        this.retryOptions = retryOptions;
    }
    CheerioCrawlerService.prototype.crawlUrl = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, statusCode, errorMessage;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Validate URL before making the request
                        this.validateUrl(url);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var response, $, title, content, domain;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.circuitBreaker.execute(function () {
                                                return axios_1.default.get(url, {
                                                    timeout: _this.requestTimeoutMs,
                                                    headers: {
                                                        'User-Agent': 'Mozilla/5.0 (compatible; RAG-Crawler/1.0)'
                                                    }
                                                });
                                            })];
                                        case 1:
                                            response = _a.sent();
                                            $ = cheerio.load(response.data);
                                            // Remove script and style tags
                                            $('script, style').remove();
                                            title = $('title').text() || 'Untitled';
                                            content = $('body').text().replace(/\s+/g, ' ').trim();
                                            domain = new URL(url).hostname;
                                            return [2 /*return*/, {
                                                    url: url,
                                                    domain: domain,
                                                    title: title,
                                                    content: content,
                                                    crawlDate: new Date()
                                                }];
                                    }
                                });
                            }); }, this.retryOptions)];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3:
                        error_1 = _c.sent();
                        // Handle circuit breaker errors
                        if (error_1 instanceof errors_1.ExternalServiceError) {
                            throw error_1;
                        }
                        // Handle axios-specific errors
                        if (axios_1.default.isAxiosError(error_1)) {
                            statusCode = (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.status;
                            errorMessage = ((_b = error_1.response) === null || _b === void 0 ? void 0 : _b.statusText) || error_1.message;
                            throw new errors_1.ExternalServiceError("Failed to crawl URL ".concat(url, ": ").concat(errorMessage), statusCode || 502);
                        }
                        // Handle unknown errors
                        throw new errors_1.ExternalServiceError("Failed to crawl URL ".concat(url, ": ").concat(error_1 instanceof Error ? error_1.message : 'Unknown error'), 502);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CheerioCrawlerService.prototype.validateUrl = function (url) {
        if (!url || typeof url !== 'string') {
            throw new errors_1.ExternalServiceError('URL is required and must be a string', 400);
        }
        try {
            var parsedUrl = new URL(url);
            // Only allow HTTP and HTTPS protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new errors_1.ExternalServiceError("Invalid URL protocol: ".concat(parsedUrl.protocol, ". Only HTTP and HTTPS are allowed"), 400);
            }
        }
        catch (error) {
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError("Invalid URL format: ".concat(error instanceof Error ? error.message : 'Unknown error'), 400);
        }
    };
    return CheerioCrawlerService;
}());
exports.CheerioCrawlerService = CheerioCrawlerService;
