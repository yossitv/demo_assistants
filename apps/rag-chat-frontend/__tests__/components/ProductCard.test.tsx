import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

describe('ProductCard', () => {
  const mockProduct: Product = {
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

  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders product price', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('renders product description', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/Test description/)).toBeInTheDocument();
  });

  it('renders availability status', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('handles missing price', () => {
    const productWithoutPrice: Product = {
      id: 'test-2',
      name: 'Product Without Price',
      description: 'Description',
    };
    render(<ProductCard product={productWithoutPrice} />);
    expect(screen.getByText('Price not available')).toBeInTheDocument();
  });

  it('renders cited URLs when provided', () => {
    const citedUrls = ['https://example.com/source'];
    render(<ProductCard product={mockProduct} citedUrls={citedUrls} />);
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('renders brand badge', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
  });

  it('renders View Product link when productUrl exists', () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getByText('View Product').closest('a');
    expect(link).toHaveAttribute('href', 'https://example.com/product');
  });
});
