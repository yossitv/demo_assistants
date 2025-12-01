export declare class AuthenticationError extends Error {
    constructor(message?: string);
}
export declare class AuthorizationError extends Error {
    constructor(message?: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class ExternalServiceError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare class InternalError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map