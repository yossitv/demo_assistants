import { Namespace } from '../value-objects/Namespace';

export class KnowledgeSpace {
  constructor(
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly name: string,
    public readonly type: 'web',
    public readonly sourceUrls: string[],
    public readonly currentVersion: string,
    public readonly createdAt: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.tenantId || !this.knowledgeSpaceId) {
      throw new Error('KnowledgeSpace must have tenantId and knowledgeSpaceId');
    }
    if (this.sourceUrls.length === 0) {
      throw new Error('KnowledgeSpace must have at least one source URL');
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
