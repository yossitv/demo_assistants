"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.retryWithBackoff = exports.CircuitBreaker = void 0;
exports.isRetryableError = isRetryableError;
var errors_1 = require("./errors");
var defaultRetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000
};
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
/**
 * Determines if an error is retryable based on error type and status code
 * Retries on:
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.)
 * - 429 (Rate Limit)
 * - 503 (Service Unavailable)
 * - 502 (Bad Gateway)
 * - 504 (Gateway Timeout)
 *
 * Does NOT retry on:
 * - 4xx errors (except 429)
 * - Circuit breaker errors
 */
function isRetryableError(error) {
    var _a;
    // Don't retry circuit breaker errors
    if (error instanceof errors_1.ExternalServiceError && error.message.includes('Circuit breaker')) {
        return false;
    }
    // Check for network errors
    if (error && typeof error === 'object') {
        var err = error;
        // Common network error codes
        var networkErrorCodes = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ENETUNREACH',
            'EAI_AGAIN'
        ];
        if (err.code && networkErrorCodes.includes(err.code)) {
            return true;
        }
        // Check HTTP status codes
        var statusCode = err.status || err.statusCode || ((_a = err.response) === null || _a === void 0 ? void 0 : _a.status);
        if (statusCode) {
            // Retry on rate limits and service unavailable
            if (statusCode === 429 || statusCode === 503 || statusCode === 502 || statusCode === 504) {
                return true;
            }
            // Don't retry on 4xx errors (except 429)
            if (statusCode >= 400 && statusCode < 500) {
                return false;
            }
        }
        // Retry on timeout errors
        if (err.message && (err.message.includes('timeout') ||
            err.message.includes('ETIMEDOUT') ||
            err.message.includes('ECONNRESET'))) {
            return true;
        }
    }
    // Default: retry on unknown errors (conservative approach)
    return true;
}
var CircuitBreaker = /** @class */ (function () {
    function CircuitBreaker(failureThreshold, cooldownMs, logger) {
        if (failureThreshold === void 0) { failureThreshold = 5; }
        if (cooldownMs === void 0) { cooldownMs = 30000; }
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
        this.logger = logger;
        this.failureCount = 0;
        this.openUntil = 0;
    }
    Object.defineProperty(CircuitBreaker.prototype, "isOpen", {
        get: function () {
            return Date.now() < this.openUntil;
        },
        enumerable: false,
        configurable: true
    });
    CircuitBreaker.prototype.execute = function (operation) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isOpen) {
                            if (this.logger) {
                                this.logger.info('Circuit breaker is open, skipping external call', {
                                    cooldownMs: this.cooldownMs,
                                    opensUntil: new Date(this.openUntil).toISOString()
                                });
                            }
                            throw new errors_1.ExternalServiceError('Circuit breaker open, skipping external call');
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, operation()];
                    case 2:
                        result = _a.sent();
                        // Reset failure count on success
                        if (this.failureCount > 0 && this.logger) {
                            this.logger.info('Circuit breaker operation succeeded, resetting failure count', {
                                previousFailureCount: this.failureCount
                            });
                        }
                        this.failureCount = 0;
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _a.sent();
                        this.failureCount += 1;
                        if (this.failureCount >= this.failureThreshold) {
                            this.openUntil = Date.now() + this.cooldownMs;
                            if (this.logger) {
                                this.logger.error('Circuit breaker opened due to consecutive failures', error_1 instanceof Error ? error_1 : new Error(String(error_1)), {
                                    failureThreshold: this.failureThreshold,
                                    cooldownMs: this.cooldownMs,
                                    opensUntil: new Date(this.openUntil).toISOString()
                                });
                            }
                            this.failureCount = 0;
                        }
                        else if (this.logger) {
                            this.logger.info('Circuit breaker operation failed', {
                                failureCount: this.failureCount,
                                failureThreshold: this.failureThreshold,
                                error: error_1 instanceof Error ? error_1.message : String(error_1)
                            });
                        }
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return CircuitBreaker;
}());
exports.CircuitBreaker = CircuitBreaker;
/**
 * Retries an operation with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 *
 * Exponential backoff formula: delay = initialDelayMs * (2 ** attempt)
 * - attempt 0: initialDelayMs * 1 = 1000ms
 * - attempt 1: initialDelayMs * 2 = 2000ms
 * - attempt 2: initialDelayMs * 4 = 4000ms
 */
var retryWithBackoff = function (operation_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([operation_1], args_1, true), void 0, function (operation, options) {
        var _a, maxAttempts, initialDelayMs, maxDelayMs, logger, lastError, attempt, error_2, delay;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = __assign(__assign({}, defaultRetryOptions), options), maxAttempts = _a.maxAttempts, initialDelayMs = _a.initialDelayMs, maxDelayMs = _a.maxDelayMs, logger = _a.logger;
                    attempt = 0;
                    _b.label = 1;
                case 1:
                    if (!(attempt < maxAttempts)) return [3 /*break*/, 7];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 6]);
                    if (attempt > 0 && logger) {
                        logger.info("Retry attempt ".concat(attempt + 1, "/").concat(maxAttempts));
                    }
                    return [4 /*yield*/, operation()];
                case 3: return [2 /*return*/, _b.sent()];
                case 4:
                    error_2 = _b.sent();
                    lastError = error_2;
                    // Don't retry on non-retryable errors
                    if (!isRetryableError(error_2)) {
                        if (logger) {
                            logger.info('Error is not retryable, failing immediately', { error: error_2 });
                        }
                        throw error_2;
                    }
                    // Don't retry if we've exhausted attempts
                    if (attempt === maxAttempts - 1) {
                        if (logger) {
                            logger.error('Max retry attempts exhausted', error_2 instanceof Error ? error_2 : new Error(String(error_2)), {
                                totalAttempts: maxAttempts,
                                error: error_2 instanceof Error ? error_2.message : String(error_2)
                            });
                        }
                        return [3 /*break*/, 7];
                    }
                    delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
                    if (logger) {
                        logger.info("Retry attempt ".concat(attempt + 1, "/").concat(maxAttempts, " failed, retrying in ").concat(delay, "ms"), {
                            attemptNumber: attempt + 1,
                            maxAttempts: maxAttempts,
                            delayMs: delay,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        });
                    }
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 6:
                    attempt++;
                    return [3 /*break*/, 1];
                case 7: throw lastError;
            }
        });
    });
};
exports.retryWithBackoff = retryWithBackoff;
