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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheerioCrawlerService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const retry_1 = require("../../shared/retry");
const errors_1 = require("../../shared/errors");
class CheerioCrawlerService {
    circuitBreaker;
    retryOptions;
    requestTimeoutMs = 10000; // 10 seconds
    constructor(retryOptions = {}) {
        this.circuitBreaker = new retry_1.CircuitBreaker();
        this.retryOptions = retryOptions;
    }
    async crawlUrl(url) {
        // Validate URL before making the request
        this.validateUrl(url);
        try {
            return await (0, retry_1.retryWithBackoff)(async () => {
                const response = await this.circuitBreaker.execute(() => axios_1.default.get(url, {
                    timeout: this.requestTimeoutMs,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; RAG-Crawler/1.0)'
                    }
                }));
                const $ = cheerio.load(response.data);
                // Remove script and style tags
                $('script, style').remove();
                const title = $('title').text() || 'Untitled';
                const content = $('body').text().replace(/\s+/g, ' ').trim();
                const domain = new URL(url).hostname;
                return {
                    url,
                    domain,
                    title,
                    content,
                    crawlDate: new Date()
                };
            }, this.retryOptions);
        }
        catch (error) {
            // Handle circuit breaker errors
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            // Handle axios-specific errors
            if (axios_1.default.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const errorMessage = error.response?.statusText || error.message;
                throw new errors_1.ExternalServiceError(`Failed to crawl URL ${url}: ${errorMessage}`, statusCode || 502);
            }
            // Handle unknown errors
            throw new errors_1.ExternalServiceError(`Failed to crawl URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`, 502);
        }
    }
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new errors_1.ExternalServiceError('URL is required and must be a string', 400);
        }
        try {
            const parsedUrl = new URL(url);
            // Only allow HTTP and HTTPS protocols
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new errors_1.ExternalServiceError(`Invalid URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed`, 400);
            }
        }
        catch (error) {
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`, 400);
        }
    }
}
exports.CheerioCrawlerService = CheerioCrawlerService;
//# sourceMappingURL=CheerioCrawlerService.js.map