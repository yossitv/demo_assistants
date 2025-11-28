import React, { useEffect, useRef } from 'react';
import { KnowledgeSpace } from '@/lib/api/types';
import ErrorMessage from '@/components/ErrorMessage';

/**
 * KnowledgeSpaceList component props
 */
interface KnowledgeSpaceListProps {
  /** Array of knowledge spaces to display */
  knowledgeSpaces?: KnowledgeSpace[];
  /** Loading state indicator */
  loading: boolean;
  /** Error message to display if fetch fails */
  error?: string;
  /** Optional retry callback for error recovery */
  onRetry?: () => void;
}

/**
 * Formats a date into a human-readable string
 * @param date - The date to format (string or Date)
 * @returns Formatted date string
 */
const formatDate = (date: string | Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If less than 24 hours ago
  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  // If less than 7 days ago
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  // Otherwise, show formatted date
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Skeleton loader component for knowledge space cards
 */
const KnowledgeSpaceCardSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse"
      role="status"
      aria-label="Loading knowledge space"
    >
      {/* Name skeleton */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>

      {/* Type badge skeleton */}
      <div className="h-6 bg-gray-200 rounded w-16 mb-4"></div>

      {/* Date skeleton */}
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>

      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Empty state component when no knowledge spaces exist
 */
const EmptyState: React.FC = () => {
  return (
    <div
      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center"
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-16 h-16 mx-auto mb-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Knowledge Spaces Found
      </h3>
      <p className="text-sm text-gray-700 mb-4 max-w-md mx-auto">
        You haven't created any knowledge spaces yet. Create your first knowledge space to start organizing and accessing your content.
      </p>
      <div className="text-sm text-gray-700">
        <p>Get started by creating a new knowledge space</p>
      </div>
    </div>
  );
};

/**
 * Individual knowledge space card component
 */
const KnowledgeSpaceCard: React.FC<{ knowledgeSpace: KnowledgeSpace }> = ({
  knowledgeSpace,
}) => {
  const { name, type, lastUpdatedAt } = knowledgeSpace;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      role="article"
      aria-label={`Knowledge space: ${name}`}
      tabIndex={0}
    >
      {/* Name */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 truncate" title={name}>
        {name}
      </h3>

      {/* Type Badge */}
      <div className="mb-4">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
          aria-label={`Type: ${type}`}
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          {type}
        </span>
      </div>

      {/* Last Updated */}
      <div className="flex items-center text-sm text-gray-700">
        <svg
          className="w-4 h-4 mr-1.5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Updated <time dateTime={new Date(lastUpdatedAt).toISOString()}>{formatDate(lastUpdatedAt)}</time>
        </span>
      </div>
    </div>
  );
};

/**
 * KnowledgeSpaceList Component
 *
 * Displays a responsive grid of knowledge space cards with loading states,
 * error handling, and empty state messaging.
 *
 * Features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Skeleton loaders during data fetch
 * - Error message with retry functionality
 * - Empty state with helpful guidance
 * - Human-readable date formatting
 * - Accessible markup with ARIA labels
 * - Tailwind CSS styling
 *
 * @example
 * ```tsx
 * import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';
 *
 * function KnowledgeSpacesPage() {
 *   const [spaces, setSpaces] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState('');
 *
 *   const fetchSpaces = async () => {
 *     setLoading(true);
 *     try {
 *       const data = await api.getKnowledgeSpaces();
 *       setSpaces(data);
 *       setError('');
 *     } catch (err) {
 *       setError('Failed to load knowledge spaces');
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <KnowledgeSpaceList
 *       knowledgeSpaces={spaces}
 *       loading={loading}
 *       error={error}
 *       onRetry={fetchSpaces}
 *     />
 *   );
 * }
 * ```
 */
const KnowledgeSpaceList: React.FC<KnowledgeSpaceListProps> = ({
  knowledgeSpaces = [],
  loading,
  error,
  onRetry,
}) => {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  // Error State
  if (error) {
    return (
      <div
        className="max-w-3xl mx-auto"
        ref={errorRef}
        tabIndex={-1}
        aria-live="assertive"
      >
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        role="status"
        aria-label="Loading knowledge spaces"
        aria-busy="true"
      >
        {[...Array(6)].map((_, index) => (
          <KnowledgeSpaceCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty State
  if (!knowledgeSpaces || knowledgeSpaces.length === 0) {
    return <EmptyState />;
  }

  // Success State - Display Knowledge Spaces
  return (
    <div aria-live="polite">
      <p className="sr-only" role="status">
        {knowledgeSpaces.length === 1
          ? 'Showing 1 knowledge space'
          : `Showing ${knowledgeSpaces.length} knowledge spaces`}
      </p>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        role="list"
        aria-label="Knowledge spaces"
      >
        {knowledgeSpaces.map((space) => (
          <div key={space.id} role="listitem">
            <KnowledgeSpaceCard knowledgeSpace={space} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeSpaceList;
