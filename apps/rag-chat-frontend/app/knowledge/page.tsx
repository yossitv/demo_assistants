'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { KnowledgeSpace } from '@/lib/api/types';
import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';

/**
 * Knowledge Spaces Page Component
 *
 * Displays all knowledge spaces with functionality to:
 * - List all existing knowledge spaces
 * - Navigate to create new knowledge spaces
 * - Handle loading, error, and empty states
 * - Retry failed requests
 */
export default function KnowledgePage() {
  // State management
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  /**
   * Fetch knowledge spaces from the API
   */
  const fetchKnowledgeSpaces = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.listKnowledgeSpaces();

      // Use API response directly as it already matches the KnowledgeSpace type
      const spaces: KnowledgeSpace[] = response.knowledgeSpaces;

      setKnowledgeSpaces(spaces);
    } catch (err) {
      console.error('Failed to fetch knowledge spaces:', err);

      // Extract error message
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to load knowledge spaces. Please try again.';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retry function for error recovery
   */
  const handleRetry = () => {
    fetchKnowledgeSpaces();
  };

  // Fetch knowledge spaces on component mount
  useEffect(() => {
    fetchKnowledgeSpaces();
  }, []);

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20"
      role="main"
      aria-busy={loading}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Knowledge Spaces
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Manage your knowledge bases and information sources
              </p>
            </div>

            {/* Create Knowledge Space Button */}
            <Link
              href="/knowledge/create"
              className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
              aria-label="Create new knowledge space"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Knowledge Space
            </Link>
          </div>
        </div>

        {/* Knowledge Spaces List */}
        <div className="mb-8">
          <KnowledgeSpaceList
            knowledgeSpaces={knowledgeSpaces}
            loading={loading}
            error={error}
            onRetry={handleRetry}
          />
        </div>

        {/* Info Section - Only show when not loading and no error */}
        {!loading && !error && (
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Web Sources
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Import knowledge from websites and documentation
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Organized Storage
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Keep your knowledge organized and easily accessible
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  AI-Powered
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Power your AI agents with domain-specific knowledge
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
