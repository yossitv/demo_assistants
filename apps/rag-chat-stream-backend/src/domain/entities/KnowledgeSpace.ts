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

export class KnowledgeSpace {
  constructor(
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly name: string,
    public readonly type: KnowledgeSpaceType,
    public readonly sourceUrls: string[],
    public readonly currentVersion: string,
    public readonly createdAt: Date = new Date(),
    public readonly status?: KnowledgeSpaceStatus,
    public readonly documentCount?: number,
    public readonly metadata?: KnowledgeSpaceMetadata
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.tenantId || !this.knowledgeSpaceId) {
      throw new Error('KnowledgeSpace must have tenantId and knowledgeSpaceId');
    }
    if (this.type === 'web' && this.sourceUrls.length === 0) {
      throw new Error('Web KnowledgeSpace must have at least one source URL');
    }
    if (!this.isValidVersion(this.currentVersion)) {
      throw new Error('currentVersion must be in YYYY-MM-DD format');
    }
  }

  private isValidVersion(version: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(version);
  }

  getNamespace(): Namespace {
    return new Namespace(this.tenantId, this.knowledgeSpaceId, this.currentVersion);
  }
}
