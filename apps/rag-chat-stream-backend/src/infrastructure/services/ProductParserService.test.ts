import { ProductParserService } from './ProductParserService';

describe('ProductParserService', () => {
  let service: ProductParserService;

  beforeEach(() => {
    service = new ProductParserService();
  });

  describe('parseMarkdown', () => {
    it('should parse valid products', () => {
      const markdown = `
--- item start ---
id: test-001
name: Test Product
category: Electronics
price: 99.99
currency: USD
availability: in_stock
tags: [tag1, tag2]
brand: TestBrand
### description
Test description
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe('test-001');
      expect(result.products[0].name).toBe('Test Product');
      expect(result.products[0].price).toBe(99.99);
      expect(result.products[0].tags).toEqual(['tag1', 'tag2']);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.failureCount).toBe(0);
    });

    it('should handle missing optional fields', () => {
      const markdown = `
--- item start ---
name: Minimal Product
### description
Minimal description
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Minimal Product');
      expect(result.products[0].id).toBeDefined();
      expect(result.products[0].price).toBeUndefined();
    });

    it('should skip items with missing required fields', () => {
      const markdown = `
--- item start ---
name: Product Without Description
--- item end ---

--- item start ---
### description
Description without name
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.summary.failureCount).toBe(2);
    });

    it('should truncate long fields', () => {
      const longName = 'A'.repeat(300);
      const longDescription = 'B'.repeat(3000);
      
      const markdown = `
--- item start ---
name: ${longName}
### description
${longDescription}
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toHaveLength(200);
      expect(result.products[0].description).toHaveLength(2000);
    });

    it('should parse multiple products', () => {
      const markdown = `
--- item start ---
name: Product 1
### description
Description 1
--- item end ---

--- item start ---
name: Product 2
### description
Description 2
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(2);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.successCount).toBe(2);
    });

    it('should handle partial failures', () => {
      const markdown = `
--- item start ---
name: Valid Product
### description
Valid description
--- item end ---

--- item start ---
name: Invalid Product
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.failureCount).toBe(1);
    });

    it('should parse tags array', () => {
      const markdown = `
--- item start ---
name: Product
tags: [electronics, laptop, business]
### description
Description
--- item end ---
`;

      const result = service.parseMarkdown(markdown);

      expect(result.products[0].tags).toEqual(['electronics', 'laptop', 'business']);
    });

    it('should handle empty input', () => {
      const result = service.parseMarkdown('');

      expect(result.products).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
    });
  });
});
