'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import ProductUploadForm from '@/components/ProductUploadForm';

type TabType = 'url' | 'file';

export default function CreateKnowledgeSpacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('url');

  const handleSuccess = () => {
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
              Add sources from URLs or upload product data files.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px px-6 sm:px-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('url')}
                className={`py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
                  activeTab === 'url'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                URL
              </button>
              <button
                onClick={() => setActiveTab('file')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'file'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                File Upload
              </button>
            </nav>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'url' ? (
              <CreateKnowledgeSpaceForm onSuccess={handleSuccess} />
            ) : (
              <ProductUploadForm onSuccess={handleSuccess} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
