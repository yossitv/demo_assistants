'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';

/**
 * Knowledge Space Creation Page Component
 *
 * Standalone page for creating new knowledge spaces with:
 * - CreateKnowledgeSpaceForm component integration
 * - Navigation back to knowledge space list
 * - Redirect to list page on successful creation
 * - Responsive layout with Tailwind CSS
 */
export default function CreateKnowledgeSpacePage() {
  const router = useRouter();

  /**
   * Handle successful knowledge space creation
   * Redirects user to the knowledge space list page
   */
  const handleSuccess = (knowledgeSpaceId: string) => {
    // Redirect to knowledge space list after successful creation
    router.push('/knowledge');
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950" role="main">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/knowledge"
            className="group inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-lg px-3 py-2 min-h-[44px]"
            aria-label="Back to knowledge spaces list"
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Knowledge Spaces
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Knowledge Space</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Add the sources you want indexed so your agents can use them right away.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <CreateKnowledgeSpaceForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </main>
  );
}
