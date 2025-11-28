export class Embedding {
  constructor(public readonly vector: number[]) {
    if (vector.length !== 1536) {
      throw new Error('Embedding must have 1536 dimensions');
    }
  }

  isValid(): boolean {
    return this.vector.length === 1536 && this.vector.every(v => typeof v === 'number');
  }

  cosineSimilarity(other: Embedding): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < this.vector.length; i++) {
      dotProduct += this.vector[i] * other.vector[i];
      normA += this.vector[i] * this.vector[i];
      normB += other.vector[i] * other.vector[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
