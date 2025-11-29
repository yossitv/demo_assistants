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
exports.DynamoDBKnowledgeSpaceRepository = void 0;
var lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
var KnowledgeSpace_1 = require("../../domain/entities/KnowledgeSpace");
var retry_1 = require("../../shared/retry");
var DynamoDBKnowledgeSpaceRepository = /** @class */ (function () {
    function DynamoDBKnowledgeSpaceRepository(dynamoDB, tableName, logger) {
        this.dynamoDB = dynamoDB;
        this.tableName = tableName;
        this.logger = logger;
    }
    DynamoDBKnowledgeSpaceRepository.prototype.save = function (ks) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('Saving knowledge space to DynamoDB', {
                            tenantId: ks.tenantId,
                            knowledgeSpaceId: ks.knowledgeSpaceId,
                            tableName: this.tableName
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.dynamoDB.send(new lib_dynamodb_1.PutCommand({
                                                TableName: this.tableName,
                                                Item: {
                                                    tenantId: ks.tenantId,
                                                    knowledgeSpaceId: ks.knowledgeSpaceId,
                                                    name: ks.name,
                                                    type: ks.type,
                                                    sourceUrls: ks.sourceUrls,
                                                    currentVersion: ks.currentVersion,
                                                    createdAt: ks.createdAt.toISOString()
                                                }
                                            }))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, { logger: this.logger })];
                    case 2:
                        _a.sent();
                        this.logger.info('Successfully saved knowledge space to DynamoDB', {
                            tenantId: ks.tenantId,
                            knowledgeSpaceId: ks.knowledgeSpaceId
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.logger.error('Failed to save knowledge space to DynamoDB', error_1 instanceof Error ? error_1 : new Error(String(error_1)), {
                            tenantId: ks.tenantId,
                            knowledgeSpaceId: ks.knowledgeSpaceId,
                            tableName: this.tableName
                        });
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DynamoDBKnowledgeSpaceRepository.prototype.findByTenant = function (tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, knowledgeSpaces, error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('Finding knowledge spaces by tenant in DynamoDB', {
                            tenantId: tenantId,
                            tableName: this.tableName
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.dynamoDB.send(new lib_dynamodb_1.QueryCommand({
                                                TableName: this.tableName,
                                                KeyConditionExpression: 'tenantId = :tenantId',
                                                ExpressionAttributeValues: {
                                                    ':tenantId': tenantId
                                                }
                                            }))];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }, { logger: this.logger })];
                    case 2:
                        result = _a.sent();
                        knowledgeSpaces = (result.Items || []).map(function (item) { return new KnowledgeSpace_1.KnowledgeSpace(item.tenantId, item.knowledgeSpaceId, item.name, item.type, item.sourceUrls, item.currentVersion, new Date(item.createdAt)); });
                        this.logger.info('Successfully retrieved knowledge spaces from DynamoDB', {
                            tenantId: tenantId,
                            count: knowledgeSpaces.length
                        });
                        return [2 /*return*/, knowledgeSpaces];
                    case 3:
                        error_2 = _a.sent();
                        this.logger.error('Failed to find knowledge spaces by tenant in DynamoDB', error_2 instanceof Error ? error_2 : new Error(String(error_2)), {
                            tenantId: tenantId,
                            tableName: this.tableName
                        });
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DynamoDBKnowledgeSpaceRepository.prototype.findByTenantAndId = function (tenantId, ksId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.info('Finding knowledge space in DynamoDB', {
                            tenantId: tenantId,
                            knowledgeSpaceId: ksId,
                            tableName: this.tableName
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retryWithBackoff)(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.dynamoDB.send(new lib_dynamodb_1.GetCommand({
                                                TableName: this.tableName,
                                                Key: { tenantId: tenantId, knowledgeSpaceId: ksId }
                                            }))];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }, { logger: this.logger })];
                    case 2:
                        result = _a.sent();
                        if (!result.Item) {
                            this.logger.info('Knowledge space not found in DynamoDB', {
                                tenantId: tenantId,
                                knowledgeSpaceId: ksId
                            });
                            return [2 /*return*/, null];
                        }
                        this.logger.info('Successfully retrieved knowledge space from DynamoDB', {
                            tenantId: tenantId,
                            knowledgeSpaceId: ksId
                        });
                        return [2 /*return*/, new KnowledgeSpace_1.KnowledgeSpace(result.Item.tenantId, result.Item.knowledgeSpaceId, result.Item.name, result.Item.type, result.Item.sourceUrls, result.Item.currentVersion, new Date(result.Item.createdAt))];
                    case 3:
                        error_3 = _a.sent();
                        this.logger.error('Failed to find knowledge space in DynamoDB', error_3 instanceof Error ? error_3 : new Error(String(error_3)), {
                            tenantId: tenantId,
                            knowledgeSpaceId: ksId,
                            tableName: this.tableName
                        });
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return DynamoDBKnowledgeSpaceRepository;
}());
exports.DynamoDBKnowledgeSpaceRepository = DynamoDBKnowledgeSpaceRepository;
