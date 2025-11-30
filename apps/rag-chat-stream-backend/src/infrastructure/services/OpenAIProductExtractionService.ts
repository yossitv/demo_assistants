import OpenAI from 'openai';
import { IProductExtractionService, ProductExtractionResult } from '../../domain/services/IProductExtractionService';
import { Product } from '../../domain/entities/Product';
import { ILogger } from '../../domain/services/ILogger';

export class OpenAIProductExtractionService implements IProductExtractionService {
  private readonly openai: OpenAI;

  constructor(
    apiKey: string,
    private readonly logger: ILogger
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  async extractFromText(text: string): Promise<ProductExtractionResult> {
    try {
      const prompt = `以下のテキストから製品情報を抽出してJSON配列で返してください。
各製品には以下の情報を含めてください：
- id: ユニークなID（prod-001, prod-002...の形式）
- name: 製品名
- price: 価格（数値、円マークなし）
- currency: 通貨コード（JPY, USDなど）
- category: カテゴリ（推測）
- description: 製品説明

テキスト:
${text}

出力形式（JSON配列のみ、他の説明は不要）:
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'あなたは製品情報を抽出する専門家です。JSON形式で正確に出力してください。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract JSON from markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }

      const productsData = JSON.parse(jsonStr);
      
      if (!Array.isArray(productsData)) {
        throw new Error('Response is not an array');
      }

      const products: Product[] = productsData.map((p: any) => ({
        id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: p.name || 'Unknown Product',
        description: p.description || '',
        category: p.category,
        price: p.price,
        currency: p.currency || 'JPY',
        availability: 'in_stock',
        updatedAt: new Date().toISOString(),
      }));

      this.logger.info('Products extracted successfully', { count: products.length });

      return {
        products,
        errors: [],
      };
    } catch (error) {
      this.logger.error('Failed to extract products', error as Error);
      return {
        products: [],
        errors: [(error as Error).message],
      };
    }
  }
}
