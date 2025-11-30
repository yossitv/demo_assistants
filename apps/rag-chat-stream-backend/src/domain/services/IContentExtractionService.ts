import { KnowledgeSpaceMode } from '../entities/KnowledgeSpaceMode';

export interface ExtractedChunk {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

export interface ExtractionResult {
  chunks: ExtractedChunk[];
  errors: string[];
  summary: {
    totalChunks: number;
    successCount: number;
    failureCount: number;
  };
}

export interface IContentExtractionService {
  extract(text: string, mode: KnowledgeSpaceMode): Promise<ExtractionResult>;
}
