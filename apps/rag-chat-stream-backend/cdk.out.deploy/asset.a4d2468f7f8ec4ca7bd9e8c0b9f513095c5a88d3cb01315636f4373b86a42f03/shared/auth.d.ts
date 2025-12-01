export interface AuthenticationContext {
    tenantId: string;
    userId: string;
    authMethod: 'jwt' | 'apikey';
}
export declare class AuthenticationError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=auth.d.ts.map