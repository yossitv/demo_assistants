import * as fc from 'fast-check';
import { Namespace } from './Namespace';

/**
 * Feature: rag-chat-backend-mvp, Property 3: Namespace isolation
 * Validates: Requirements 8.1, 8.2
 * 
 * For any two different tenants or KnowledgeSpaces, chunks stored in one 
 * namespace should never appear in search results for another namespace.
 * 
 * This test verifies that namespace strings are unique and properly formatted
 * to ensure isolation at the vector database level.
 */
describe('Property 3: Namespace isolation', () => {
  // Configure property tests to run 100 iterations
  const numRuns = 100;

  it('should generate unique namespace strings for different tenants', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        (tenant1, tenant2, knowledgeSpaceId, date) => {
          // Skip if tenants are the same
          fc.pre(tenant1 !== tenant2);
          
          const version = date.toISOString().split('T')[0];
          const namespace1 = new Namespace(tenant1, knowledgeSpaceId, version);
          const namespace2 = new Namespace(tenant2, knowledgeSpaceId, version);
          
          // Different tenants should produce different namespace strings
          return namespace1.toString() !== namespace2.toString();
        }
      ),
      { numRuns }
    );
  });

  it('should generate unique namespace strings for different KnowledgeSpaces', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        (tenantId, ks1, ks2, date) => {
          // Skip if KnowledgeSpaces are the same
          fc.pre(ks1 !== ks2);
          
          const version = date.toISOString().split('T')[0];
          const namespace1 = new Namespace(tenantId, ks1, version);
          const namespace2 = new Namespace(tenantId, ks2, version);
          
          // Different KnowledgeSpaces should produce different namespace strings
          return namespace1.toString() !== namespace2.toString();
        }
      ),
      { numRuns }
    );
  });

  it('should generate unique namespace strings for different versions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        fc.date(),
        (tenantId, knowledgeSpaceId, date1, date2) => {
          const version1 = date1.toISOString().split('T')[0];
          const version2 = date2.toISOString().split('T')[0];
          
          // Skip if versions are the same
          fc.pre(version1 !== version2);
          
          const namespace1 = new Namespace(tenantId, knowledgeSpaceId, version1);
          const namespace2 = new Namespace(tenantId, knowledgeSpaceId, version2);
          
          // Different versions should produce different namespace strings
          return namespace1.toString() !== namespace2.toString();
        }
      ),
      { numRuns }
    );
  });

  it('should follow the format t_{tenantId}_ks_{knowledgeSpaceId}_{version}', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        (tenantId, knowledgeSpaceId, date) => {
          const version = date.toISOString().split('T')[0];
          const namespace = new Namespace(tenantId, knowledgeSpaceId, version);
          const namespaceString = namespace.toString();
          
          // Verify format
          const expectedFormat = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;
          return namespaceString === expectedFormat;
        }
      ),
      { numRuns }
    );
  });

  it('should preserve tenant, knowledgeSpace, and version information', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        (tenantId, knowledgeSpaceId, date) => {
          const version = date.toISOString().split('T')[0];
          const namespace = new Namespace(tenantId, knowledgeSpaceId, version);
          
          // Verify that the namespace object preserves the input values
          return (
            namespace.tenantId === tenantId &&
            namespace.knowledgeSpaceId === knowledgeSpaceId &&
            namespace.version === version
          );
        }
      ),
      { numRuns }
    );
  });

  it('should generate consistent namespace strings for identical inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.date(),
        (tenantId, knowledgeSpaceId, date) => {
          const version = date.toISOString().split('T')[0];
          const namespace1 = new Namespace(tenantId, knowledgeSpaceId, version);
          const namespace2 = new Namespace(tenantId, knowledgeSpaceId, version);
          
          // Same inputs should produce same namespace strings
          return namespace1.toString() === namespace2.toString();
        }
      ),
      { numRuns }
    );
  });

  it('should ensure no namespace collision across all combinations', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date()
        ),
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date()
        ),
        ([tenant1, ks1, date1], [tenant2, ks2, date2]) => {
          const version1 = date1.toISOString().split('T')[0];
          const version2 = date2.toISOString().split('T')[0];
          
          // Skip if all components are identical
          fc.pre(
            tenant1 !== tenant2 || 
            ks1 !== ks2 || 
            version1 !== version2
          );
          
          const namespace1 = new Namespace(tenant1, ks1, version1);
          const namespace2 = new Namespace(tenant2, ks2, version2);
          
          // Different inputs should produce different namespace strings
          return namespace1.toString() !== namespace2.toString();
        }
      ),
      { numRuns }
    );
  });
});
