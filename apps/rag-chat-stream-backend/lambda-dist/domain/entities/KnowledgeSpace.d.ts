import { Namespace } from '../value-objects/Namespace';
import { ParseError } from './Product';
export type KnowledgeSpaceType = 'web' | 'product' | 'document' | 'custom';
export type KnowledgeSpaceStatus = 'processing' | 'completed' | 'partial' | 'error';
export interface KnowledgeSpaceMetadata {
    sourceType?: 'url' | 'file';
    schemaVersion?: string;
    summary?: {
        successCount: number;
        failureCount: number;
        errors: ParseError[];
    };
}
export declare class KnowledgeSpace {
    readonly tenantId: string;
    readonly knowledgeSpaceId: string;
    readonly name: string;
    readonly type: KnowledgeSpaceType;
    readonly sourceUrls: string[];
    readonly currentVersion: string;
    readonly createdAt: Date;
    readonly status?: KnowledgeSpaceStatus | undefined;
    readonly documentCount?: number | undefined;
    readonly metadata?: KnowledgeSpaceMetadata | undefined;
    constructor(tenantId: string, knowledgeSpaceId: string, name: string, type: KnowledgeSpaceType, sourceUrls: string[], currentVersion: string, createdAt?: Date, status?: KnowledgeSpaceStatus | undefined, documentCount?: number | undefined, metadata?: KnowledgeSpaceMetadata | undefined);
    private validate;
    private isValidVersion;
    getNamespace(): Namespace;
}
//# sourceMappingURL=KnowledgeSpace.d.ts.map