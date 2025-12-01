import { HeaderMap } from './apiKey';
import { ILogger } from '../domain/services/ILogger';
export interface BearerAuthContext {
    tenantId: string;
    userId: string;
    authMethod: 'bearer';
}
export interface BearerValidationOptions {
    expectedToken?: string;
}
export declare const extractAuthorizationHeader: (headers: HeaderMap) => {
    headerName?: string;
    value?: string;
};
export declare const parseBearerToken: (authorizationHeader?: string) => string | undefined;
export declare const buildTokenPreview: (token: string) => string;
export declare const validateBearerToken: (headers: HeaderMap, logger?: ILogger, options?: BearerValidationOptions) => BearerAuthContext;
//# sourceMappingURL=bearerAuth.d.ts.map