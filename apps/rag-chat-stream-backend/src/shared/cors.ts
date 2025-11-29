import { APIGatewayProxyResult } from '../shared/types';

/**
 * CORS headers for API Gateway responses
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key,X-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Create a successful API Gateway response with CORS headers
 */
export function successResponse(
    statusCode: number,
    body: unknown
): APIGatewayProxyResult {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(body),
    };
}

/**
 * Create an error API Gateway response with CORS headers
 */
export function errorResponse(
    statusCode: number,
    message: string
): APIGatewayProxyResult {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: { message } }),
    };
}
