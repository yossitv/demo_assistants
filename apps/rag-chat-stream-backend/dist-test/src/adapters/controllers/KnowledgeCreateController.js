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
exports.KnowledgeCreateController = void 0;
var validation_1 = require("../../shared/validation");
var errors_1 = require("../../shared/errors");
var cors_1 = require("../../shared/cors");
var CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
var apiKey_1 = require("../../shared/apiKey");
var KnowledgeCreateController = /** @class */ (function () {
    function KnowledgeCreateController(useCase, logger) {
        this.useCase = useCase;
        this.logger = logger || { debug: function () { }, info: function () { }, warn: function () { }, error: function () { } };
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    KnowledgeCreateController.prototype.handle = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var requestId, startTime, authContext, tenantId, userId, authMethod, validatedBody, result, durationMs, error_1, durationMs, tenantId, userId, authMethod;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        requestId = event.requestContext.requestId;
                        startTime = Date.now();
                        authContext = null;
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        authContext = this.extractAuthenticationContext(event);
                        if (!authContext) {
                            this.logUnauthorizedAttempt(requestId, event.path);
                            return [2 /*return*/, (0, cors_1.errorResponse)(401, 'Unauthorized')];
                        }
                        tenantId = authContext.tenantId, userId = authContext.userId, authMethod = authContext.authMethod;
                        validatedBody = (0, validation_1.validateKnowledgeCreateBody)(event.body);
                        // Log request summary with structured logging
                        if (this.structuredLogger) {
                            this.structuredLogger.logRequest({
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                method: event.httpMethod,
                                authMethod: authMethod
                            });
                        }
                        this.logger.info('Knowledge space creation request received', {
                            tenantId: tenantId,
                            userId: userId,
                            requestId: requestId,
                            urlCount: validatedBody.sourceUrls.length,
                            name: validatedBody.name,
                            authMethod: authMethod
                        });
                        return [4 /*yield*/, this.useCase.execute({
                                tenantId: tenantId,
                                name: validatedBody.name,
                                sourceUrls: validatedBody.sourceUrls,
                                requestId: requestId
                            })];
                    case 2:
                        result = _e.sent();
                        durationMs = Date.now() - startTime;
                        // Log response summary with timing
                        if (this.structuredLogger) {
                            this.structuredLogger.logResponse({
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                statusCode: 200,
                                durationMs: durationMs,
                                authMethod: authMethod
                            });
                        }
                        this.logger.info('Knowledge space creation completed', {
                            tenantId: tenantId,
                            userId: userId,
                            requestId: requestId,
                            knowledgeSpaceId: result.knowledgeSpaceId,
                            status: result.status,
                            successfulUrls: result.successfulUrls,
                            failedUrls: result.failedUrls,
                            durationMs: durationMs,
                            authMethod: authMethod
                        });
                        return [2 /*return*/, (0, cors_1.successResponse)(200, result)];
                    case 3:
                        error_1 = _e.sent();
                        durationMs = Date.now() - startTime;
                        if (error_1 instanceof errors_1.ValidationError) {
                            this.logger.info('Validation error', {
                                requestId: requestId,
                                error: error_1.message,
                                durationMs: durationMs
                            });
                            return [2 /*return*/, (0, cors_1.errorResponse)(400, error_1.message)];
                        }
                        tenantId = (authContext === null || authContext === void 0 ? void 0 : authContext.tenantId) || ((_b = (_a = event.requestContext.authorizer) === null || _a === void 0 ? void 0 : _a.claims) === null || _b === void 0 ? void 0 : _b['custom:tenant_id']);
                        userId = (authContext === null || authContext === void 0 ? void 0 : authContext.userId) || ((_d = (_c = event.requestContext.authorizer) === null || _c === void 0 ? void 0 : _c.claims) === null || _d === void 0 ? void 0 : _d.sub);
                        authMethod = (authContext === null || authContext === void 0 ? void 0 : authContext.authMethod) || 'none';
                        if (this.structuredLogger && tenantId) {
                            this.structuredLogger.logErrorWithContext('Error in KnowledgeCreateController', error_1, {
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                method: event.httpMethod,
                                authMethod: authMethod
                            });
                        }
                        else {
                            this.logger.error('Error in KnowledgeCreateController', error_1, {
                                requestId: requestId,
                                path: event.path,
                                method: event.httpMethod,
                                tenantId: tenantId,
                                userId: userId,
                                durationMs: durationMs,
                                authMethod: authMethod
                            });
                        }
                        return [2 /*return*/, (0, cors_1.errorResponse)(500, 'Internal server error')];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    KnowledgeCreateController.prototype.extractAuthenticationContext = function (event) {
        // Check for custom authorizer context (API key authentication)
        var authorizerContext = event.requestContext.authorizer;
        if ((authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.tenantId) && (authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.userId)) {
            return {
                tenantId: authorizerContext.tenantId,
                userId: authorizerContext.userId,
                authMethod: 'apikey'
            };
        }
        // Check for JWT claims (Cognito authentication)
        var claims = authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.claims;
        var tenantId = claims === null || claims === void 0 ? void 0 : claims['custom:tenant_id'];
        var userId = claims === null || claims === void 0 ? void 0 : claims.sub;
        if (tenantId && userId) {
            return { tenantId: tenantId, userId: userId, authMethod: 'jwt' };
        }
        // Fallback: validate API key from Authorization (preferred) or x-api-key (legacy)
        var apiKey = (0, apiKey_1.extractApiKeyFromHeaders)(event.headers).apiKey;
        var expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
        if (apiKey && (!expectedApiKey || apiKey === expectedApiKey)) {
            return { tenantId: 'default', userId: 'default', authMethod: 'apikey' };
        }
        return null;
    };
    KnowledgeCreateController.prototype.logUnauthorizedAttempt = function (requestId, path) {
        this.logger.info('Unauthorized access attempt', {
            requestId: requestId,
            path: path,
            reason: 'Missing tenantId in claims'
        });
    };
    return KnowledgeCreateController;
}());
exports.KnowledgeCreateController = KnowledgeCreateController;
