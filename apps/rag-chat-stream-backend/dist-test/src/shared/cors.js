"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_HEADERS = void 0;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
/**
 * CORS headers for API Gateway responses
 */
exports.CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
/**
 * Create a successful API Gateway response with CORS headers
 */
function successResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: exports.CORS_HEADERS,
        body: JSON.stringify(body),
    };
}
/**
 * Create an error API Gateway response with CORS headers
 */
function errorResponse(statusCode, message) {
    return {
        statusCode: statusCode,
        headers: exports.CORS_HEADERS,
        body: JSON.stringify({ error: { message: message } }),
    };
}
