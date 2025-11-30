'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/lib/api/types';
import { Product } from '@/types';
import ProductCard from './ProductCard';

interface MessageListProps {
  messages: Message[];
  className?: string;
  listId?: string;
}

/**
 * Extract products from assistant message content
 * Looks for JSON blocks with product data
 */
const extractProducts = (content: string): Product[] => {
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  const matches = [...content.matchAll(jsonBlockRegex)];
  
  const products: Product[] = [];
  
  for (const match of matches) {
    try {
      const json = JSON.parse(match[1]);
      if (json.products && Array.isArray(json.products)) {
        products.push(...json.products);
      } else if (json.id && json.name && json.description) {
        products.push(json);
      }
    } catch {
      // Ignore invalid JSON
    }
  }
  
  return products;
};

/**
 * Remove product JSON blocks from content for display
 */
const removeProductBlocks = (content: string): string => {
  return content.replace(/```json\s*\n[\s\S]*?\n```/g, '').trim();
};

const MessageList: React.FC<MessageListProps> = ({ messages, className = '', listId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      messagesEndRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 ${className}`}
        role="status"
        id={listId}
        aria-live="polite"
        tabIndex={0}
      >
        <p>No messages yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg ${className}`}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Chat messages"
      aria-atomic="false"
      id={listId}
      tabIndex={0}
    >
      <p className="sr-only" aria-live="polite">
        {messages.length === 1 ? 'Conversation has 1 message' : `Conversation has ${messages.length} messages`}
      </p>
      {messages.map((message) => {
        const products = message.role === 'assistant' ? extractProducts(message.content) : [];
        const displayContent = message.role === 'assistant' && products.length > 0
          ? removeProductBlocks(message.content)
          : message.content;

        return (
          <article
            key={message.id}
            className={`
              flex w-full
              ${message.role === 'user' ? 'justify-end' : 'justify-start'}
            `}
            aria-label={`${message.role === 'user' ? 'You' : 'Assistant'} message`}
          >
            <div
              className={`
                ${message.role === 'user' ? 'max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%] xl:max-w-[60%]' : 'w-full'}
                ${message.role === 'user' ? 'rounded-lg p-3 sm:p-4 shadow-sm bg-blue-600 text-white' : ''}
              `}
            >
              {message.role === 'user' ? (
                <>
                  <div className="break-words text-sm sm:text-base">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.createdAt && (
                    <div className="mt-2 text-xs text-blue-100">
                      <time dateTime={new Date(message.createdAt).toISOString()}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Text Content */}
                  {displayContent && (
                    <div className="bg-gray-100 text-gray-900 border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                      <div className="break-words text-sm sm:text-base">
                        <div
                          className="prose prose-sm sm:prose-base max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
                          role="region"
                          aria-label="Assistant response"
                        >
                          <ReactMarkdown>{displayContent}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Cited URLs */}
                      {message.cited_urls && message.cited_urls.length > 0 && (
                        <nav
                          className="mt-3 pt-3 border-t border-gray-300"
                          aria-label="Message sources"
                        >
                          <p className="text-xs font-semibold mb-2 text-gray-600" id={`sources-${message.id}`}>
                            Sources:
                          </p>
                          <ul className="space-y-1" aria-labelledby={`sources-${message.id}`}>
                            {message.cited_urls.map((url, index) => (
                              <li key={`${message.id}-url-${index}`} className="text-xs">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline active:underline min-h-[44px] py-2 touch-manipulation"
                                  aria-label={`Open source: ${url}`}
                                >
                                  <svg
                                    className="w-3 h-3 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                  <span className="truncate max-w-full break-all">{url}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      )}

                      {/* Timestamp */}
                      {message.createdAt && (
                        <div className="mt-2 text-xs text-gray-500">
                          <time dateTime={new Date(message.createdAt).toISOString()}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </time>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product Cards */}
                  {products.length > 0 && (
                    <div
                      className={`
                        grid gap-4
                        ${products.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}
                      `}
                    >
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          citedUrls={message.cited_urls}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}

      {/* Invisible element for auto-scrolling */}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
};

export default MessageList;
