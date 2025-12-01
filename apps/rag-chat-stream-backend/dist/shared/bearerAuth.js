"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBearerToken = exports.buildTokenPreview = exports.parseBearerToken = exports.extractAuthorizationHeader = void 0;
const crypto_1 = require("crypto");
const errors_1 = require("./errors");
const BEARER_REGEX = /^Bearer\s+(.+)$/i;
const extractAuthorizationHeader = (headers) => {
    if (!headers) {
        return {};
    }
    const normalized = Object.entries(headers).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
            acc[key.toLowerCase()] = value;
        }
        return acc;
    }, {});
    if (normalized.authorization === undefined) {
        return {};
    }
    return { headerName: 'authorization', value: normalized.authorization.trim() };
};
exports.extractAuthorizationHeader = extractAuthorizationHeader;
const parseBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        return undefined;
    }
    const match = authorizationHeader.match(BEARER_REGEX);
    if (!match) {
        return undefined;
    }
    const token = match[1].trim();
    return token || undefined;
};
exports.parseBearerToken = parseBearerToken;
const buildTokenPreview = (token) => {
    const hash = (0, crypto_1.createHash)('sha256').update(token).digest('hex').slice(0, 8);
    const prefix = token.slice(0, 4);
    return `${prefix ? `${prefix}...` : ''}sha256:${hash}`;
};
exports.buildTokenPreview = buildTokenPreview;
const validateBearerToken = (headers, logger, options = {}) => {
    const { value: authorization, headerName } = (0, exports.extractAuthorizationHeader)(headers);
    const token = (0, exports.parseBearerToken)(authorization);
    const logMeta = {
        hasAuthorizationHeader: authorization !== undefined,
        headerName,
        tokenPreview: token ? (0, exports.buildTokenPreview)(token) : undefined,
    };
    if (!authorization || !token) {
        logger?.warn('Missing or malformed Authorization header', logMeta);
        throw new errors_1.AuthenticationError('Unauthorized');
    }
    const expectedToken = options.expectedToken
        ?? process.env.EXPECTED_API_KEY
        ?? process.env.TAUVS_API_KEY
        ?? process.env.RAG_STREAM_API_KEY;
    if (!expectedToken) {
        logger?.error('EXPECTED_API_KEY is not configured', undefined, logMeta);
        throw new errors_1.InternalError('EXPECTED_API_KEY is not configured');
    }
    if (token !== expectedToken) {
        logger?.warn('Bearer token mismatch', logMeta);
        throw new errors_1.AuthorizationError('Forbidden');
    }
    logger?.info('Bearer token authenticated', logMeta);
    return {
        tenantId: 'tauvs',
        userId: 'tauvs-service',
        authMethod: 'bearer',
    };
};
exports.validateBearerToken = validateBearerToken;
//# sourceMappingURL=bearerAuth.js.map