import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { Chunk } from '../domain/entities/Chunk';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { IProductParserService } from '../domain/services/IProductParserService';
import { ILogger } from '../domain/services/ILogger';
import { ParseError, SCHEMA_VERSION } from '../domain/entities/Product';
import { randomUUID } from 'crypto';

export interface CreateProductKnowledgeSpaceInput {
  tenantId: string;
  name: string;
  fileContent: string;
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
    errors: ParseError[];
  };
}

export class CreateProductKnowledgeSpaceUseCase {
  constructor(
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly vectorRepo: IVectorRepository,
    private readonly parserService: IProductParserService,
    private readonly embeddingService: IEmbeddingService,
    private readonly logger: ILogger
  ) {}

  async execute(input: CreateProductKnowledgeSpaceInput): Promise<CreateProductKnowledgeSpaceOutput> {
    this.logger.info('Creating product knowledge space', {
      tenantId: input.tenantId,
      name: input.name,
      requestId: input.requestId
    });

    // Parse products from markdown
    const parseResult = this.parserService.parseMarkdown(input.fileContent);
    
    this.logger.info('Parsed products', {
      totalItems: parseResult.summary.totalItems,
      successCount: parseResult.summary.successCount,
      failureCount: parseResult.summary.failureCount
    });

    // Determine status
    let status: 'completed' | 'partial' | 'error';
    if (parseResult.summary.failureCount === 0) {
      status = 'completed';
    } else if (parseResult.summary.successCount > 0) {
      status = 'partial';
    } else {
      status = 'error';
    }

    const knowledgeSpaceId = randomUUID();
    const currentVersion = this.getCurrentVersion();

    // Create chunks from products
    const chunks: Chunk[] = [];
    if (parseResult.products.length > 0) {
      this.logger.info('Embedding products', { count: parseResult.products.length });
      
      const texts = parseResult.products.map(p => this.formatProductAsChunk(p));
      const embeddings = await this.embeddingService.generateEmbeddings(texts);
      
      for (let i = 0; i < parseResult.products.length; i++) {
        const product = parseResult.products[i];
        const chunk = new Chunk(
          randomUUID(),
          input.tenantId,
          knowledgeSpaceId,
          product.productUrl || '',
          product.brand || 'product',
          texts[i],
          embeddings[i],
          { 
            title: product.name,
            version: currentVersion,
            productId: product.id,
            productName: product.name
          },
          new Date()
        );
        chunks.push(chunk);
      }

      this.logger.info('Storing product vectors', { count: chunks.length });
      
      const namespace = { tenantId: input.tenantId, knowledgeSpaceId, version: currentVersion };
      await this.vectorRepo.upsertChunks(namespace as any, chunks);
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
      parseResult.products.length,
      {
        sourceType: 'file',
        schemaVersion: SCHEMA_VERSION,
        summary: {
          successCount: parseResult.summary.successCount,
          failureCount: parseResult.summary.failureCount,
          errors: parseResult.errors
        }
      }
    );

    await this.knowledgeSpaceRepo.save(knowledgeSpace);

    this.logger.info('Product knowledge space created', {
      knowledgeSpaceId,
      status,
      documentCount: parseResult.products.length
    });

    return {
      knowledgeSpaceId,
      name: input.name,
      type: 'product',
      status,
      documentCount: parseResult.products.length,
      summary: {
        successCount: parseResult.summary.successCount,
        failureCount: parseResult.summary.failureCount,
        errors: parseResult.errors
      }
    };
  }

  private formatProductAsChunk(product: any): string {
    const parts = [
      product.name,
      product.description
    ];
    
    if (product.category) parts.push(`Category: ${product.category}`);
    if (product.brand) parts.push(`Brand: ${product.brand}`);
    if (product.price) parts.push(`Price: ${product.price} ${product.currency || 'USD'}`);
    if (product.availability) parts.push(`Availability: ${product.availability}`);
    if (product.tags?.length) parts.push(`Tags: ${product.tags.join(', ')}`);
    
    return parts.join('\n');
  }

  private getCurrentVersion(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}
