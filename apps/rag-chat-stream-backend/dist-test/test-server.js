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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = __importDefault(require("http"));
var DIContainer_1 = require("./src/infrastructure/di/DIContainer");
var PORT = 3001;
// Initialize DI Container
var container = DIContainer_1.DIContainer.getInstance();
var controller = container.getChatCompletionsStreamController();
var server = http_1.default.createServer(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body_1;
    return __generator(this, function (_a) {
        if (req.method === 'OPTIONS') {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return [2 /*return*/];
        }
        if (req.method === 'POST' && req.url === '/v1/chat/completions') {
            body_1 = '';
            req.on('data', function (chunk) {
                body_1 += chunk.toString();
            });
            req.on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
                var requestBody, event_1, responseStream, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            requestBody = JSON.parse(body_1);
                            event_1 = {
                                body: JSON.stringify(requestBody),
                                headers: {
                                    'Authorization': req.headers.authorization || '',
                                    'Content-Type': 'application/json',
                                },
                                httpMethod: 'POST',
                                path: '/v1/chat/completions',
                                queryStringParameters: null,
                                pathParameters: null,
                                stageVariables: null,
                                requestContext: {},
                                resource: '',
                                isBase64Encoded: false,
                                multiValueHeaders: {},
                                multiValueQueryStringParameters: null,
                            };
                            responseStream = {
                                write: function (data) {
                                    res.write(data);
                                },
                                end: function () {
                                    res.end();
                                },
                                setContentType: function (contentType) {
                                    res.setHeader('Content-Type', contentType);
                                },
                            };
                            // Set CORS headers
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                            // Handle request
                            return [4 /*yield*/, controller.handle(event_1, responseStream)];
                        case 1:
                            // Handle request
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            console.error('Error:', error_1);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: { message: 'Internal server error' } }));
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Not found' } }));
        }
        return [2 /*return*/];
    });
}); });
server.listen(PORT, function () {
    console.log("\uD83D\uDE80 Streaming test server running on http://localhost:".concat(PORT));
    console.log("\uD83D\uDCE1 Endpoint: POST http://localhost:".concat(PORT, "/v1/chat/completions"));
    console.log("\uD83D\uDD11 Use: Authorization: Bearer ".concat(process.env.TEST_API_KEY));
});
