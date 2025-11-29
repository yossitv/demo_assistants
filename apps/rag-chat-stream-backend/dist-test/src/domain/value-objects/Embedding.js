"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Embedding = void 0;
var Embedding = /** @class */ (function () {
    function Embedding(vector) {
        this.vector = vector;
        if (vector.length !== 1536) {
            throw new Error('Embedding must have 1536 dimensions');
        }
    }
    Embedding.prototype.isValid = function () {
        return this.vector.length === 1536 && this.vector.every(function (v) { return typeof v === 'number'; });
    };
    Embedding.prototype.cosineSimilarity = function (other) {
        var dotProduct = 0;
        var normA = 0;
        var normB = 0;
        for (var i = 0; i < this.vector.length; i++) {
            dotProduct += this.vector[i] * other.vector[i];
            normA += this.vector[i] * this.vector[i];
            normB += other.vector[i] * other.vector[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };
    return Embedding;
}());
exports.Embedding = Embedding;
