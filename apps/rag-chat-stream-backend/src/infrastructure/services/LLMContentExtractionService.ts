import OpenAI from 'openai';
import { IContentExtractionService, ExtractionResult, ExtractedChunk } from '../../domain/services/IContentExtractionService';
import { KnowledgeSpaceMode, MODE_CONFIGS } from '../../domain/entities/KnowledgeSpaceMode';
import { ILogger } from '../../domain/services/ILogger';

export class LLMContentExtractionService implements IContentExtractionService {
  private readonly openai: OpenAI;

  constructor(
    apiKey: string,
    private readonly logger: ILogger
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  async extract(text: string, mode: KnowledgeSpaceMode): Promise<ExtractionResult> {
    const config = MODE_CONFIGS[mode];
    
    switch (config.extractionMethod) {
      case 'structured':
        return this.extractStructured(text, mode);
      case 'qa_extraction':
        return this.extractQA(text);
      case 'simple_split':
        return this.simpleSplit(text, config.chunkingStrategy);
      default:
        throw new Error(`Unknown extraction method: ${config.extractionMethod}`);
    }
  }

  private async extractStructured(text: string, mode: KnowledgeSpaceMode): Promise<ExtractionResult> {
    try {
      const prompt = mode === 'product_recommend' 
        ? this.getProductExtractionPrompt(text)
        : this.getGenericStructuredPrompt(text);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたは情報抽出の専門家です。JSON形式で正確に出力してください。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }

      const data = JSON.parse(jsonStr);
      const items = Array.isArray(data) ? data : [data];

      const chunks: ExtractedChunk[] = items.map((item: any, idx: number) => ({
        id: item.id || `chunk-${Date.now()}-${idx}`,
        content: this.formatChunkContent(item, mode),
        metadata: this.extractMetadata(item, mode),
      }));

      this.logger.info('Content extracted successfully', { mode, chunkCount: chunks.length });

      return {
        chunks,
        errors: [],
        summary: {
          totalChunks: chunks.length,
          successCount: chunks.length,
          failureCount: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to extract content', error as Error);
      return {
        chunks: [],
        errors: [(error as Error).message],
        summary: {
          totalChunks: 0,
          successCount: 0,
          failureCount: 1,
        },
      };
    }
  }

  private async extractQA(text: string): Promise<ExtractionResult> {
    try {
      const prompt = `以下のテキストからQ&Aペアを抽出してJSON配列で返してください：

${text}

出力形式:
[
  {
    "id": "qa-001",
    "question": "質問文",
    "answer": "回答文"
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたはQ&A抽出の専門家です。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }

      const qaPairs = JSON.parse(jsonStr);

      const chunks: ExtractedChunk[] = qaPairs.map((qa: any) => ({
        id: qa.id || `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: `Q: ${qa.question}\nA: ${qa.answer}`,
        metadata: {
          question: qa.question,
          answer: qa.answer,
          type: 'qa',
        },
      }));

      return {
        chunks,
        errors: [],
        summary: {
          totalChunks: chunks.length,
          successCount: chunks.length,
          failureCount: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to extract Q&A', error as Error);
      return {
        chunks: [],
        errors: [(error as Error).message],
        summary: {
          totalChunks: 0,
          successCount: 0,
          failureCount: 1,
        },
      };
    }
  }

  private simpleSplit(text: string, strategy: string): ExtractionResult {
    const chunks: ExtractedChunk[] = [];
    
    if (strategy === 'paragraph') {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      paragraphs.forEach((para, idx) => {
        chunks.push({
          id: `para-${idx}`,
          content: para.trim(),
          metadata: { index: idx, type: 'paragraph' },
        });
      });
    } else if (strategy === 'section') {
      // Simple section splitting by headers
      const sections = text.split(/\n(?=#+ )/);
      sections.forEach((section, idx) => {
        const lines = section.split('\n');
        const heading = lines[0]?.replace(/^#+\s*/, '') || '';
        chunks.push({
          id: `section-${idx}`,
          content: section.trim(),
          metadata: { heading, index: idx, type: 'section' },
        });
      });
    }

    return {
      chunks,
      errors: [],
      summary: {
        totalChunks: chunks.length,
        successCount: chunks.length,
        failureCount: 0,
      },
    };
  }

  private getProductExtractionPrompt(text: string): string {
    return `以下のテキストから製品情報を抽出してJSON配列で返してください。
各製品には以下の情報を含めてください：
- id: ユニークなID（prod-001, prod-002...の形式）
- name: 製品名
- price: 価格（数値、円マークなし）
- currency: 通貨コード（JPY, USDなど）
- category: カテゴリ（推測）
- description: 製品説明

テキスト:
${text}

出力形式（JSON配列のみ）:
[
  {
    "id": "prod-001",
    "name": "製品名",
    "price": 3300,
    "currency": "JPY",
    "category": "カテゴリ",
    "description": "説明文"
  }
]`;
  }

  private getGenericStructuredPrompt(text: string): string {
    return `以下のテキストから構造化データを抽出してJSON配列で返してください：\n\n${text}`;
  }

  private formatChunkContent(item: any, mode: KnowledgeSpaceMode): string {
    if (mode === 'product_recommend') {
      return `製品名: ${item.name}
価格: ${item.price}${item.currency || 'JPY'}
カテゴリ: ${item.category || '未分類'}
説明: ${item.description}`;
    }
    return JSON.stringify(item, null, 2);
  }

  private extractMetadata(item: any, mode: KnowledgeSpaceMode): Record<string, any> {
    const metadata: Record<string, any> = { mode };

    if (mode === 'product_recommend') {
      return {
        ...metadata,
        productId: item.id,
        productName: item.name,
        price: item.price,
        currency: item.currency || 'JPY',
        category: item.category,
      };
    }

    return metadata;
  }
}
