import { APIGatewayProxyResult } from '../shared/types';
/**
 * CORS headers for API Gateway responses
 */
export declare const CORS_HEADERS: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
};
/**
 * Create a successful API Gateway response with CORS headers
 */
export declare function successResponse(statusCode: number, body: unknown): APIGatewayProxyResult;
/**
 * Create an error API Gateway response with CORS headers
 */
export declare function errorResponse(statusCode: number, message: string): APIGatewayProxyResult;
//# sourceMappingURL=cors.d.ts.map