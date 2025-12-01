import React, { useState } from 'react';
import { KnowledgeSpace, KnowledgeSpaceType, KnowledgeSpaceStatus } from '@/lib/api/types';
import ErrorMessage from '@/components/ErrorMessage';

interface KnowledgeSpaceListProps {
  knowledgeSpaces?: KnowledgeSpace[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}

const formatDate = (date: string | Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const TypeBadge: React.FC<{ type: KnowledgeSpaceType }> = ({ type }) => {
  const colors = {
    web: 'bg-blue-100 text-blue-800',
    document: 'bg-purple-100 text-purple-800',
    product: 'bg-green-100 text-green-800',
    custom: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  );
};

const StatusIndicator: React.FC<{ status?: KnowledgeSpaceStatus }> = ({ status }) => {
  if (!status) return null;

  const config = {
    processing: { color: 'text-yellow-500', label: 'Processing' },
    completed: { color: 'text-green-500', label: 'Completed' },
    partial: { color: 'text-orange-500', label: 'Partial' },
    error: { color: 'text-red-500', label: 'Error' },
  };

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={color}>{label}</span>
    </div>
  );
};

const KnowledgeSpaceCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-6 bg-gray-200 rounded w-16 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
};

const EmptyState: React.FC = () => {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
      <svg
        className="w-16 h-16 mx-auto mb-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Knowledge Spaces</h3>
      <p className="text-gray-600">Create your first knowledge space to get started.</p>
    </div>
  );
};

export default function KnowledgeSpaceList({
  knowledgeSpaces = [],
  loading,
  error,
  onRetry,
}: KnowledgeSpaceListProps) {
  const [typeFilter, setTypeFilter] = useState<KnowledgeSpaceType | 'all'>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const filteredSpaces = typeFilter === 'all'
    ? knowledgeSpaces
    : knowledgeSpaces.filter(ks => ks.type === typeFilter);

  const toggleErrorDetails = (id: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <KnowledgeSpaceCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (knowledgeSpaces.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm font-medium text-gray-700">
          Filter by type:
        </label>
        <select
          id="type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as KnowledgeSpaceType | 'all')}
          className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="web">Web</option>
          <option value="document">Document</option>
          <option value="product">Product</option>
          <option value="custom">Custom</option>
        </select>
        <span className="text-sm text-gray-500">
          ({filteredSpaces.length} {filteredSpaces.length === 1 ? 'space' : 'spaces'})
        </span>
      </div>

      {/* Knowledge Space Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpaces.map((ks) => (
          <div
            key={ks.id}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                {ks.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <TypeBadge type={ks.type} />
              <StatusIndicator status={ks.status} />
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {ks.documentCount !== undefined && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{ks.documentCount} items</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated {formatDate(ks.lastUpdatedAt)}</span>
              </div>
            </div>

            {/* Error Details */}
            {(ks.status === 'partial' || ks.status === 'error') && ks.metadata?.summary && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => toggleErrorDetails(ks.id)}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                >
                  {expandedErrors.has(ks.id) ? 'Hide' : 'View'} Errors ({ks.metadata.summary.failureCount})
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedErrors.has(ks.id) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedErrors.has(ks.id) && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                    {ks.metadata.summary.errors.map((err, idx) => (
                      <li key={idx} className="pl-2 border-l-2 border-orange-300">
                        Item {err.itemIndex}: {err.reason}
                        {err.field && ` (${err.field})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
