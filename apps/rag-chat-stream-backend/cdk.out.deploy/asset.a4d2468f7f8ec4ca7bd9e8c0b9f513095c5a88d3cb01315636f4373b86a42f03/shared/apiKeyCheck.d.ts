import { ILogger } from '../domain/services/ILogger';
export interface ApiKeyValidationResult {
    isValid: boolean;
    tenantId?: string;
    userId?: string;
    reason?: string;
}
export declare function validateApiKey(headers: Record<string, string | undefined>, logger?: ILogger): ApiKeyValidationResult;
//# sourceMappingURL=apiKeyCheck.d.ts.map