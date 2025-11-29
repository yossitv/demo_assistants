"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChatRequestBody = exports.validateAgentCreateBody = exports.validateKnowledgeCreateBody = exports.chatRequestSchema = exports.agentCreateSchema = exports.knowledgeCreateSchema = void 0;
const zod_1 = require("zod");
const errors_1 = require("./errors");
const urlSchema = zod_1.z.string().url({ message: 'Invalid URL format' }).refine(value => value.startsWith('http://') || value.startsWith('https://'), { message: 'URL must start with http:// or https://' });
const chatMessageSchema = zod_1.z.object({
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
        .refine(msgs => msgs.some(m => m.role === 'user'), 'messages must include a user message')
});
const parseJsonBody = (body) => {
    try {
        return JSON.parse(body || '{}');
    }
    catch {
        throw new errors_1.ValidationError('Request body must be valid JSON');
    }
};
const validateKnowledgeCreateBody = (body) => {
    const parsed = parseJsonBody(body);
    const result = exports.knowledgeCreateSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(result.error.errors[0]?.message || 'Invalid request body');
    }
    return result.data;
};
exports.validateKnowledgeCreateBody = validateKnowledgeCreateBody;
const validateAgentCreateBody = (body) => {
    const parsed = parseJsonBody(body);
    const result = exports.agentCreateSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(result.error.errors[0]?.message || 'Invalid request body');
    }
    return result.data;
};
exports.validateAgentCreateBody = validateAgentCreateBody;
const validateChatRequestBody = (body) => {
    const parsed = parseJsonBody(body);
    const result = exports.chatRequestSchema.safeParse(parsed);
    if (!result.success) {
        throw new errors_1.ValidationError(result.error.errors[0]?.message || 'Invalid request body');
    }
    return result.data;
};
exports.validateChatRequestBody = validateChatRequestBody;
//# sourceMappingURL=validation.js.map