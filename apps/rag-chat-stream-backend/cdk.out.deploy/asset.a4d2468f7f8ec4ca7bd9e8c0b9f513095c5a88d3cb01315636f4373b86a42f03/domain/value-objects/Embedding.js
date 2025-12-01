"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Embedding = void 0;
class Embedding {
    vector;
    constructor(vector) {
        this.vector = vector;
        if (vector.length !== 1536) {
            throw new Error('Embedding must have 1536 dimensions');
        }
    }
    isValid() {
        return this.vector.length === 1536 && this.vector.every(v => typeof v === 'number');
    }
    cosineSimilarity(other) {
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
exports.Embedding = Embedding;
//# sourceMappingURL=Embedding.js.map