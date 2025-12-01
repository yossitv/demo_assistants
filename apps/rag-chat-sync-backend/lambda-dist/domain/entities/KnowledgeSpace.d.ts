import { Namespace } from '../value-objects/Namespace';
export declare class KnowledgeSpace {
    readonly tenantId: string;
    readonly knowledgeSpaceId: string;
    readonly name: string;
    readonly type: 'web';
    readonly sourceUrls: string[];
    readonly currentVersion: string;
    readonly createdAt: Date;
    constructor(tenantId: string, knowledgeSpaceId: string, name: string, type: 'web', sourceUrls: string[], currentVersion: string, createdAt?: Date);
    private validate;
    private isValidVersion;
    getNamespace(): Namespace;
}
//# sourceMappingURL=KnowledgeSpace.d.ts.map