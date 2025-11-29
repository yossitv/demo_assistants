"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
function validateApiKey(headers, logger) {
    const requestId = headers['x-request-id'] || 'unknown';
    const timestamp = new Date().toISOString();
    const expectedApiKey = process.env.RAG_STREAM_API_KEY || process.env.EXPECTED_API_KEY;
    if (!expectedApiKey) {
        const reason = 'RAG_STREAM_API_KEY/EXPECTED_API_KEY not configured';
        logger?.warn('API key validation failed', { requestId, timestamp, reason, hasApiKey: false });
        return { isValid: false, reason };
    }
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader) {
        const reason = 'No Authorization header';
        logger?.warn('API key validation failed', { requestId, timestamp, reason, hasApiKey: false });
        return { isValid: false, reason };
    }
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!apiKey) {
        const reason = 'Empty API key';
        logger?.warn('API key validation failed', { requestId, timestamp, reason, hasApiKey: false });
        return { isValid: false, reason };
    }
    if (apiKey !== expectedApiKey) {
        const reason = 'Invalid API key';
        logger?.warn('API key validation failed', { requestId, timestamp, reason, hasApiKey: true });
        return { isValid: false, reason };
    }
    logger?.info('API key validation succeeded', { requestId, timestamp, hasApiKey: true });
    return {
        isValid: true,
        tenantId: 'api-key-tenant',
        userId: 'api-key-user'
    };
}
//# sourceMappingURL=apiKeyCheck.js.map