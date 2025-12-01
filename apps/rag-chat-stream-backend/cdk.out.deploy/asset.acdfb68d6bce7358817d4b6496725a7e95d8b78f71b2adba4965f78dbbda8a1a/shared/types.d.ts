export interface APIGatewayProxyEvent {
    body: string | null;
    headers: {
        [key: string]: string;
    };
    httpMethod: string;
    path: string;
    queryStringParameters: {
        [key: string]: string;
    } | null;
    requestContext: {
        authorizer?: {
            claims?: {
                sub?: string;
                'custom:tenant_id'?: string;
                [key: string]: string | undefined;
            };
        };
        requestId: string;
    };
}
export interface APIGatewayProxyResult {
    statusCode: number;
    headers?: {
        [key: string]: string;
    };
    body: string;
}
//# sourceMappingURL=types.d.ts.map