"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChatRequestBody = exports.validateAgentCreateBody = exports.validateKnowledgeCreateBody = exports.chatRequestSchema = exports.agentCreateSchema = exports.knowledgeCreateSchema = void 0;
var zod_1 = require("zod");
var errors_1 = require("./errors");
var urlSchema = zod_1.z.string().url({ message: 'Invalid URL format' }).refine(function (value) { return value.startsWith('http://') || value.startsWith('https://'); }, { message: 'URL must start with http:// or https://' });
var chatMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['system', 'user', 'assistant']),
    content: zod_1.z.string().min(1, 'Message content is required').max(4000)
});
exports.knowledgeCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'name is required').max(100),
    sourceUrls: zod_1.z.array(urlSchema).nonempty('sourceUrls must include at least one URL').max(50)
});
exports.agentCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'name is required').max(100),
    knowledgeSpaceIds: zod_1.z.array(zod_1.z.string().min(1)).nonempty('knowledgeSpaceIds cannot be empty'),
    description: zod_1.z.string().max(500).optional(),
    strictRAG: zod_1.z.boolean().optional().default(true)
});
exports.chatRequestSchema = zod_1.z.object({
    model: zod_1.z.string().min(1, 'model is required'),
    messages: zod_1.z.array(chatMessageSchema)
        .nonempty('messages must include at least one entry')
        .refine(function (msgs) { return msgs.some(function (m) { return m.role === 'user'; }); }, 'messages must include a user message')
});
var parseJsonBody = function (body) {
    try {
        return JSON.parse(body || '{}');
    }
    catch (_a) {
        throw new errors_1.ValidationError('Request body must be valid JSON');
    }
};
var validateKnowledgeCreateBody = function (body) {
    var _a;
    var parsed = parseJsonBody(body);
    var result = exports.knowledgeCreateSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(((_a = result.error.errors[0]) === null || _a === void 0 ? void 0 : _a.message) || 'Invalid request body');
    }
    return result.data;
};
exports.validateKnowledgeCreateBody = validateKnowledgeCreateBody;
var validateAgentCreateBody = function (body) {
    var _a;
    var parsed = parseJsonBody(body);
    var result = exports.agentCreateSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(((_a = result.error.errors[0]) === null || _a === void 0 ? void 0 : _a.message) || 'Invalid request body');
    }
    return result.data;
};
exports.validateAgentCreateBody = validateAgentCreateBody;
var validateChatRequestBody = function (body) {
    var _a;
    var parsed = parseJsonBody(body);
    var result = exports.chatRequestSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(((_a = result.error.errors[0]) === null || _a === void 0 ? void 0 : _a.message) || 'Invalid request body');
    }
    return result.data;
};
exports.validateChatRequestBody = validateChatRequestBody;
