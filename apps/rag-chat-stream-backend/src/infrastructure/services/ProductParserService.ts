import { IProductParserService } from '../../domain/services/IProductParserService';
import { Product, ParseResult, ParseError } from '../../domain/entities/Product';
import { randomUUID } from 'crypto';

export class ProductParserService implements IProductParserService {
  parseMarkdown(content: string): ParseResult {
    const items = this.extractItems(content);
    const products: Product[] = [];
    const errors: ParseError[] = [];

    items.forEach((item, index) => {
      try {
        const product = this.parseItem(item, index);
        if (product) {
          products.push(product);
        }
      } catch (error) {
        errors.push({
          itemIndex: index,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    return {
      products,
      errors,
      summary: {
        totalItems: items.length,
        successCount: products.length,
        failureCount: errors.length,
      },
    };
  }

  private extractItems(content: string): string[] {
    const items: string[] = [];
    const lines = content.split('\n');
    let currentItem: string[] = [];
    let inItem = false;

    for (const line of lines) {
      if (line.trim() === '--- item start ---') {
        inItem = true;
        currentItem = [];
      } else if (line.trim() === '--- item end ---') {
        if (inItem && currentItem.length > 0) {
          items.push(currentItem.join('\n'));
        }
        inItem = false;
        currentItem = [];
      } else if (inItem) {
        currentItem.push(line);
      }
    }

    return items;
  }

  private parseItem(itemContent: string, _itemIndex: number): Product | null {
    const fields: Record<string, string> = {};
    const lines = itemContent.split('\n');
    let inDescription = false;
    let descriptionLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === '### description') {
        inDescription = true;
        continue;
      }

      if (inDescription) {
        if (line.trim().startsWith('###') || line.trim().startsWith('---')) {
          inDescription = false;
        } else {
          descriptionLines.push(line);
        }
      } else {
        const match = line.match(/^(\w+):\s*(.*)$/);
        if (match) {
          fields[match[1]] = match[2].trim();
        }
      }
    }

    // Use description block if available, otherwise use description field
    const description = descriptionLines.length > 0
      ? descriptionLines.join('\n').trim()
      : fields.description || '';

    const name = fields.name || '';

    // Validate required fields
    if (!name || !description) {
      throw new Error(`Missing required fields: ${!name ? 'name' : 'description'}`);
    }

    // Truncate fields
    const truncatedName = name.slice(0, 200);
    const truncatedDescription = description.slice(0, 2000);

    // Parse tags
    let tags: string[] | undefined;
    if (fields.tags) {
      const tagsMatch = fields.tags.match(/\[(.*)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(',').map(t => t.trim()).filter(t => t);
      }
    }

    return {
      id: fields.id || randomUUID(),
      name: truncatedName,
      description: truncatedDescription,
      category: fields.category,
      price: fields.price ? parseFloat(fields.price) : undefined,
      currency: fields.currency,
      availability: fields.availability,
      tags,
      imageUrl: fields.imageUrl,
      productUrl: fields.productUrl,
      brand: fields.brand,
      updatedAt: new Date().toISOString(),
    };
  }
}
