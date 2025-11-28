export class Namespace {
  private readonly value: string;

  constructor(
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly version: string
  ) {
    this.value = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;
  }

  toString(): string {
    return this.value;
  }
}
