'use client';

import React from 'react';
import Link from 'next/link';
import { useAgent } from '@/lib/context/KnowledgeContext';

/**
 * Home/Landing page component
 */
export default function Home() {
  const { agents } = useAgent();

  // Get recently used agents (up to 6 most recent)
  const recentAgents = agents.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16" aria-labelledby="hero-heading">
          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to RAG Chat Assistant
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Build intelligent AI agents powered by your own knowledge base.
            Create knowledge spaces from web sources and chat with AI assistants
            that understand your domain.
          </p>
        </section>

        {/* Quick Actions Section */}
        <section className="mb-16" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Quick Actions
          </h2>
          <nav className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" aria-label="Quick actions">
            {/* Create Knowledge Space Card */}
            <Link
              href="/knowledge"
              className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
              aria-label="Navigate to knowledge spaces"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Create Knowledge Space
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Build a knowledge base from web sources to power your AI agents
                  </p>
                </div>
              </div>
              <div className="absolute top-4 right-4 text-gray-600 group-hover:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Create Agent Card */}
            <Link
              href="/agents/create"
              className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400"
              aria-label="Navigate to create agent"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Create AI Agent
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Configure an intelligent assistant with your knowledge spaces
                  </p>
                </div>
              </div>
              <div className="absolute top-4 right-4 text-gray-600 group-hover:text-purple-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </nav>
        </section>

        {/* Recent Agents Section */}
        <section className="mb-12" aria-labelledby="agents-heading">
          <h2 id="agents-heading" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {recentAgents.length > 0 ? 'Recently Used Agents' : 'Your Agents'}
          </h2>

          {recentAgents.length > 0 ? (
            <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Recent agents">
              {recentAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                  aria-label={`Chat with ${agent.name}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                      {agent.strictRAG ? 'Strict RAG' : 'Flexible'}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {agent.name}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {agent.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-200">
                    <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
                    <svg
                      className="w-4 h-4 text-gray-600 dark:text-gray-200 group-hover:text-blue-500 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </nav>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700" role="status">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg
                  className="w-8 h-8 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No agents yet
              </h3>
              <p className="text-gray-700 dark:text-gray-200 mb-6">
                Get started by creating a knowledge space and then building your first AI agent
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/knowledge"
                  className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg touch-manipulation"
                >
                  Create Knowledge Space
                </Link>
                <Link
                  href="/agents/create"
                  className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors touch-manipulation"
                >
                  Create Agent
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Features Section */}
        <section className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-700 dark:text-gray-200">
                Get instant answers from your knowledge base with advanced RAG technology
              </p>
            </article>

            <article className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Secure & Private
              </h3>
              <p className="text-gray-700 dark:text-gray-200">
                Your data stays secure with enterprise-grade authentication and encryption
              </p>
            </article>

            <article className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Accurate Responses
              </h3>
              <p className="text-gray-700 dark:text-gray-200">
                Strict RAG mode ensures answers are grounded in your knowledge base
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
