import * as fc from 'fast-check';
import { Embedding } from './Embedding';

/**
 * Feature: rag-chat-backend-mvp, Property 10: Embedding consistency
 * Validates: Requirements 1.5
 * 
 * For any text, generating embeddings multiple times should produce vectors 
 * with the same dimensions (1536) and high cosine similarity (>0.99).
 * 
 * Note: Since we cannot actually call OpenAI API in property tests, we test
 * the Embedding value object's consistency properties directly.
 */
describe('Property 10: Embedding consistency', () => {
  // Configure property tests to run 100 iterations
  const numRuns = 100;

  it('should maintain 1536 dimensions for all valid embeddings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float(), { minLength: 1536, maxLength: 1536 }),
        (vector) => {
          const embedding = new Embedding(vector);
          return embedding.vector.length === 1536 && embedding.isValid();
        }
      ),
      { numRuns }
    );
  });

  it('should reject embeddings with incorrect dimensions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).filter(n => n !== 1536),
        (wrongSize) => {
          const vector = new Array(wrongSize).fill(0.5);
          try {
            new Embedding(vector);
            return false; // Should have thrown
          } catch (error) {
            return error instanceof Error && 
                   error.message === 'Embedding must have 1536 dimensions';
          }
        }
      ),
      { numRuns }
    );
  });

  it('should compute cosine similarity correctly for identical embeddings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 1536, maxLength: 1536 })
          .filter(vector => vector.some(v => v !== 0) && vector.every(v => !isNaN(v))), // Exclude all-zero and NaN vectors
        (vector) => {
          const embedding1 = new Embedding(vector);
          const embedding2 = new Embedding([...vector]); // Copy to ensure different instance
          const similarity = embedding1.cosineSimilarity(embedding2);
          
          // Identical embeddings should have similarity very close to 1.0
          // Allow small floating point error
          return Math.abs(similarity - 1.0) < 0.0001;
        }
      ),
      { numRuns }
    );
  });

  it('should compute cosine similarity correctly for orthogonal embeddings', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10) })
          .filter(v => !isNaN(v)), // Exclude NaN values
        (scale) => {
          // Create two orthogonal vectors in 1536-dimensional space
          const vector1 = new Array(1536).fill(0);
          const vector2 = new Array(1536).fill(0);
          
          vector1[0] = scale;
          vector2[1] = scale;
          
          const embedding1 = new Embedding(vector1);
          const embedding2 = new Embedding(vector2);
          const similarity = embedding1.cosineSimilarity(embedding2);
          
          // Orthogonal vectors should have similarity close to 0
          return Math.abs(similarity) < 0.0001;
        }
      ),
      { numRuns }
    );
  });

  it('should compute cosine similarity symmetrically', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 1536, maxLength: 1536 })
          .filter(vector => vector.some(v => v !== 0) && vector.every(v => !isNaN(v))), // Exclude all-zero and NaN vectors
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 1536, maxLength: 1536 })
          .filter(vector => vector.some(v => v !== 0) && vector.every(v => !isNaN(v))), // Exclude all-zero and NaN vectors
        (vector1, vector2) => {
          const embedding1 = new Embedding(vector1);
          const embedding2 = new Embedding(vector2);
          
          const sim1to2 = embedding1.cosineSimilarity(embedding2);
          const sim2to1 = embedding2.cosineSimilarity(embedding1);
          
          // Cosine similarity should be symmetric
          return Math.abs(sim1to2 - sim2to1) < 0.0001;
        }
      ),
      { numRuns }
    );
  });

  it('should have cosine similarity in range [-1, 1]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 1536, maxLength: 1536 })
          .filter(vector => vector.some(v => v !== 0) && vector.every(v => !isNaN(v))), // Exclude all-zero and NaN vectors
        fc.array(fc.float({ min: -1, max: 1 }), { minLength: 1536, maxLength: 1536 })
          .filter(vector => vector.some(v => v !== 0) && vector.every(v => !isNaN(v))), // Exclude all-zero and NaN vectors
        (vector1, vector2) => {
          const embedding1 = new Embedding(vector1);
          const embedding2 = new Embedding(vector2);
          
          const similarity = embedding1.cosineSimilarity(embedding2);
          
          // Cosine similarity must be in [-1, 1]
          return similarity >= -1 && similarity <= 1;
        }
      ),
      { numRuns }
    );
  });

  it('should validate that all vector elements are numbers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float(), { minLength: 1536, maxLength: 1536 }),
        (vector) => {
          const embedding = new Embedding(vector);
          return embedding.isValid();
        }
      ),
      { numRuns }
    );
  });
});
