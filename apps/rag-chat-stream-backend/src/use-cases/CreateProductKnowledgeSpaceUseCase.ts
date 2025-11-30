import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { Chunk } from '../domain/entities/Chunk';
import { Namespace } from '../domain/value-objects/Namespace';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { IContentExtractionService } from '../domain/services/IContentExtractionService';
import { ILogger } from '../domain/services/ILogger';
import { KnowledgeSpaceMode } from '../domain/entities/KnowledgeSpaceMode';
import { randomUUID } from 'crypto';

export interface CreateProductKnowledgeSpaceInput {
  tenantId: string;
  name: string;
  fileContent: string;
  mode?: KnowledgeSpaceMode;
  requestId?: string;
}

export interface CreateProductKnowledgeSpaceOutput {
  knowledgeSpaceId: string;
  name: string;
  type: 'product';
  status: 'completed' | 'partial' | 'error';
  documentCount: number;
  summary: {
    successCount: number;
    failureCount: number;
    errors: string[];
  };
}

export class CreateProductKnowledgeSpaceUseCase {
  constructor(
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly vectorRepo: IVectorRepository,
    private readonly extractionService: IContentExtractionService,
    private readonly embeddingService: IEmbeddingService,
    private readonly logger: ILogger
  ) {}

  async execute(input: CreateProductKnowledgeSpaceInput): Promise<CreateProductKnowledgeSpaceOutput> {
    const mode = input.mode || 'product_recommend';
    
    this.logger.info('Creating knowledge space', {
      tenantId: input.tenantId,
      name: input.name,
      mode,
      requestId: input.requestId
    });

    // Extract content using LLM
    const extractionResult = await this.extractionService.extract(input.fileContent, mode);
    
    this.logger.info('Content extracted', {
      totalChunks: extractionResult.summary.totalChunks,
      successCount: extractionResult.summary.successCount,
      failureCount: extractionResult.summary.failureCount
    });

    // Determine status
    let status: 'completed' | 'partial' | 'error';
    if (extractionResult.summary.failureCount === 0 && extractionResult.summary.successCount > 0) {
      status = 'completed';
    } else if (extractionResult.summary.successCount > 0) {
      status = 'partial';
    } else {
      status = 'error';
    }

    const knowledgeSpaceId = randomUUID();
    const currentVersion = this.getCurrentVersion();

    // Create chunks with embeddings
    const chunks: Chunk[] = [];
    if (extractionResult.chunks.length > 0) {
      this.logger.info('Generating embeddings', { count: extractionResult.chunks.length });
      
      const texts = extractionResult.chunks.map(c => c.content);
      const embeddings = await this.embeddingService.generateEmbeddings(texts);
      
      for (let i = 0; i < extractionResult.chunks.length; i++) {
        const extractedChunk = extractionResult.chunks[i];
        const chunk = new Chunk(
          randomUUID(),
          input.tenantId,
          knowledgeSpaceId,
          '',
          'file',
          extractedChunk.content,
          embeddings[i],
          { 
            title: extractedChunk.metadata.productName || extractedChunk.metadata.question || `Chunk ${i}`,
            ...extractedChunk.metadata,
            version: currentVersion,
          },
          new Date()
        );
        chunks.push(chunk);
      }

      this.logger.info('Storing vectors', { count: chunks.length });
      
      const namespace = new Namespace(input.tenantId, knowledgeSpaceId, currentVersion);
      await this.vectorRepo.upsertChunks(namespace, chunks);
    }

    // Create and save knowledge space
    const knowledgeSpace = new KnowledgeSpace(
      input.tenantId,
      knowledgeSpaceId,
      input.name,
      'product',
      [],
      currentVersion,
      new Date(),
      status,
      extractionResult.chunks.length,
      {
        sourceType: 'file',
        summary: {
          successCount: extractionResult.summary.successCount,
          failureCount: extractionResult.summary.failureCount,
          errors: extractionResult.errors.map((e, idx) => ({
            itemIndex: idx,
            reason: e,
          })),
        },
      }
    );

    this.logger.info('Saving knowledge space to DynamoDB', {
      tenantId: input.tenantId,
      knowledgeSpaceId,
      tableName: process.env.KNOWLEDGE_SPACES_TABLE_NAME
    });

    await this.knowledgeSpaceRepo.save(knowledgeSpace);

    this.logger.info('Successfully saved knowledge space to DynamoDB', {
      tenantId: input.tenantId,
      knowledgeSpaceId
    });

    return {
      knowledgeSpaceId,
      name: input.name,
      type: 'product',
      status,
      documentCount: extractionResult.chunks.length,
      summary: {
        successCount: extractionResult.summary.successCount,
        failureCount: extractionResult.summary.failureCount,
        errors: extractionResult.errors,
      },
    };
  }

  private getCurrentVersion(): string {
    return new Date().toISOString().split('T')[0];
  }
}
