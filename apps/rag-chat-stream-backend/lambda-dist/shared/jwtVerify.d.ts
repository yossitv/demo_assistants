import { ILogger } from '../domain/services/ILogger';
export interface JwtPayload {
    sub: string;
    'custom:tenant_id': string;
    [key: string]: unknown;
}
export interface JwtVerificationResult {
    isValid: boolean;
    payload?: JwtPayload;
    error?: string;
}
export declare function verifyJwt(token: string, logger?: ILogger): JwtVerificationResult;
//# sourceMappingURL=jwtVerify.d.ts.map