"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductParserService = void 0;
const crypto_1 = require("crypto");
class ProductParserService {
    parseMarkdown(content) {
        const items = this.extractItems(content);
        const products = [];
        const errors = [];
        items.forEach((item, index) => {
            try {
                const product = this.parseItem(item, index);
                if (product) {
                    products.push(product);
                }
            }
            catch (error) {
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
    extractItems(content) {
        const items = [];
        const lines = content.split('\n');
        let currentItem = [];
        let inItem = false;
        for (const line of lines) {
            if (line.trim() === '--- item start ---') {
                inItem = true;
                currentItem = [];
            }
            else if (line.trim() === '--- item end ---') {
                if (inItem && currentItem.length > 0) {
                    items.push(currentItem.join('\n'));
                }
                inItem = false;
                currentItem = [];
            }
            else if (inItem) {
                currentItem.push(line);
            }
        }
        return items;
    }
    parseItem(itemContent, _itemIndex) {
        const fields = {};
        const lines = itemContent.split('\n');
        let inDescription = false;
        let descriptionLines = [];
        for (const line of lines) {
            if (line.trim() === '### description') {
                inDescription = true;
                continue;
            }
            if (inDescription) {
                if (line.trim().startsWith('###') || line.trim().startsWith('---')) {
                    inDescription = false;
                }
                else {
                    descriptionLines.push(line);
                }
            }
            else {
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
        let tags;
        if (fields.tags) {
            const tagsMatch = fields.tags.match(/\[(.*)\]/);
            if (tagsMatch) {
                tags = tagsMatch[1].split(',').map(t => t.trim()).filter(t => t);
            }
        }
        return {
            id: fields.id || (0, crypto_1.randomUUID)(),
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
exports.ProductParserService = ProductParserService;
//# sourceMappingURL=ProductParserService.js.map