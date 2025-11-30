import React from 'react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  citedUrls?: string[];
}

export default function ProductCard({ product, citedUrls }: ProductCardProps) {
  const {
    name,
    description,
    price,
    currency = 'USD',
    category,
    brand,
    availability,
    imageUrl,
    productUrl,
    tags,
  } = product;

  const formatPrice = (price?: number, currency?: string) => {
    if (price === undefined) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'in_stock':
        return 'text-green-600 bg-green-50';
      case 'out_of_stock':
        return 'text-red-600 bg-red-50';
      case 'preorder':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getAvailabilityLabel = (availability?: string) => {
    switch (availability) {
      case 'in_stock':
        return 'In Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'preorder':
        return 'Pre-order';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '';
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Brand & Category */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {brand && <span className="font-medium">{brand}</span>}
          {brand && category && <span>•</span>}
          {category && <span>{category}</span>}
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {name}
        </h3>

        {/* Price & Availability */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">
            {formatPrice(price, currency)}
          </div>
          {availability && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(
                availability
              )}`}
            >
              {getAvailabilityLabel(availability)}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {description}
        </p>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-100">
          {productUrl ? (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              View Product
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
            >
              No Product Link
            </button>
          )}
        </div>

        {/* Citations */}
        {citedUrls && citedUrls.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Source:</p>
            <div className="space-y-1">
              {citedUrls.slice(0, 2).map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-600 hover:text-blue-700 truncate"
                >
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
