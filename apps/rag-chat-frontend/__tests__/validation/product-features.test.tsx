/**
 * Product Features Validation Tests
 * 
 * Validates that all product recommendation features are properly implemented
 */

import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import ProductCard from '@/components/ProductCard';
import ProductUploadForm from '@/components/ProductUploadForm';
import { Product } from '@/types';

describe('Product Features Validation', () => {
  describe('ProductCard Component', () => {
    it('should render product with all fields', () => {
      const product: Product = {
        id: 'test-1',
        name: 'Test Product',
        description: 'Test description',
        category: 'Electronics',
        price: 99.99,
        currency: 'USD',
        availability: 'in_stock',
        brand: 'TestBrand',
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        tags: ['tag1', 'tag2'],
      };

      render(<ProductCard product={product} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText(/Test description/)).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      const product: Product = {
        id: 'test-2',
        name: 'Minimal Product',
        description: 'Minimal description',
      };

      render(<ProductCard product={product} />);

      expect(screen.getByText('Minimal Product')).toBeInTheDocument();
      expect(screen.getByText('Price not available')).toBeInTheDocument();
    });

    it('should display cited URLs when provided', () => {
      const product: Product = {
        id: 'test-3',
        name: 'Product with Source',
        description: 'Description',
      };

      const citedUrls = ['https://example.com/source'];

      render(<ProductCard product={product} citedUrls={citedUrls} />);

      expect(screen.getByText(/Source:/)).toBeInTheDocument();
    });
  });

  describe('ProductUploadForm Component', () => {
    it('should render file upload form', () => {
      render(<ProductUploadForm />);

      expect(screen.getByText(/Upload Product Catalog/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
    });

    it('should display file size limit', () => {
      render(<ProductUploadForm />);

      expect(screen.getByText(/10MB/i)).toBeInTheDocument();
    });

    it('should show accepted file types', () => {
      render(<ProductUploadForm />);

      expect(screen.getByText(/\.md/i)).toBeInTheDocument();
    });
  });

  describe('Type Definitions', () => {
    it('should have Product type with all required fields', () => {
      const product: Product = {
        id: 'test',
        name: 'Test',
        description: 'Test',
      };

      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.description).toBeDefined();
    });

    it('should support optional Product fields', () => {
      const product: Product = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: 'Category',
        price: 100,
        currency: 'USD',
        availability: 'in_stock',
        tags: ['tag'],
        imageUrl: 'url',
        productUrl: 'url',
        brand: 'Brand',
        updatedAt: new Date().toISOString(),
      };

      expect(product.category).toBeDefined();
      expect(product.price).toBeDefined();
      expect(product.tags).toHaveLength(1);
    });
  });
});
