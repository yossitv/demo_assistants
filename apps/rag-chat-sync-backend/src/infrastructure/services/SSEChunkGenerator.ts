type FinishReason = 'stop' | 'length' | 'content_filter' | null;

type ChunkDelta = {
  role?: 'assistant';
  content?: string;
  cited_urls?: string[];
};

type ChunkChoice = {
  index: number;
  delta: ChunkDelta;
  finish_reason: FinishReason;
};

type ChunkPayload = {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChunkChoice[];
};

export type SSEChunkMetadata = {
  id: string;
  model: string;
  created?: number;
};

export type SSEChunkOptions = {
  includeDoneMessage?: boolean;
  citedUrls?: string[];
};

export class SSEChunkGenerator {
  private readonly maxChunkBytes: number;
  private readonly encoder = new TextEncoder();

  constructor(maxChunkBytes: number = 1024) {
    if (maxChunkBytes <= 0) {
      throw new Error('maxChunkBytes must be greater than 0');
    }

    this.maxChunkBytes = maxChunkBytes;
  }

  generateFromText(
    content: string,
    metadata: SSEChunkMetadata,
    options: SSEChunkOptions = {}
  ): string[] {
    const created = metadata.created ?? Math.floor(Date.now() / 1000);
    const includeDoneMessage = options.includeDoneMessage !== false;

    const chunks: string[] = [];

    chunks.push(
      this.formatChunk(
        this.buildChunk(metadata.id, metadata.model, created, { role: 'assistant' })
      )
    );

    for (const part of this.splitUtf8Safe(content)) {
      chunks.push(
        this.formatChunk(
          this.buildChunk(metadata.id, metadata.model, created, { content: part })
        )
      );
    }

    const finalDelta: ChunkDelta = {};
    if (options.citedUrls && options.citedUrls.length > 0) {
      finalDelta.cited_urls = options.citedUrls;
    }

    chunks.push(
      this.formatChunk(
        this.buildChunk(metadata.id, metadata.model, created, finalDelta, 'stop')
      )
    );

    if (includeDoneMessage) {
      chunks.push('data: [DONE]\n\n');
    }

    return chunks;
  }

  private splitUtf8Safe(content: string): string[] {
    if (!content) {
      return [];
    }

    const parts: string[] = [];
    let current = '';
    let currentBytes = 0;

    // Avoid breaking multibyte characters across SSE payload boundaries
    for (const char of content) {
      const charBytes = this.encoder.encode(char).length;

      if (charBytes > this.maxChunkBytes) {
        throw new Error('Single character exceeds maxChunkBytes');
      }

      if (currentBytes + charBytes > this.maxChunkBytes) {
        parts.push(current);
        current = char;
        currentBytes = charBytes;
      } else {
        current += char;
        currentBytes += charBytes;
      }
    }

    if (current.length > 0) {
      parts.push(current);
    }

    return parts;
  }

  private buildChunk(
    id: string,
    model: string,
    created: number,
    delta: ChunkDelta,
    finishReason: FinishReason = null
  ): ChunkPayload {
    return {
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason
        }
      ]
    };
  }

  private formatChunk(payload: ChunkPayload): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
  }
}
