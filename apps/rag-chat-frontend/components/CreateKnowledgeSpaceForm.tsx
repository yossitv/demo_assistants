'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { isValidAgentName, isValidUrl } from '@/lib/utils/validation';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

type UrlMode = 'manual' | 'sitemap';
const MAX_SITEMAP_DEPTH = 3;
const MAX_COLLECTED_URLS = 1000;

interface CreateKnowledgeSpaceFormProps {
  onSuccess?: (knowledgeSpaceId: string) => void;
}

const CreateKnowledgeSpaceForm: React.FC<CreateKnowledgeSpaceFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [mode, setMode] = useState<UrlMode>('manual');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [collectedUrls, setCollectedUrls] = useState<string[]>([]);
  const [showCollectedUrls, setShowCollectedUrls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectStatus, setCollectStatus] = useState<string | null>(null);
  const [collectedCount, setCollectedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const urlRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sitemapRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlErrors, setUrlErrors] = useState<(string | null)[]>([null]);
  const [sitemapError, setSitemapError] = useState<string | null>(null);

  const handleAddUrl = () => {
    setUrls([...urls, '']);
    setUrlErrors([...urlErrors, null]);
    urlRefs.current = [...urlRefs.current, null];
  };

  const handleRemoveUrl = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      const newUrlErrors = urlErrors.filter((_, i) => i !== index);
      setUrls(newUrls);
      setUrlErrors(newUrlErrors);
      urlRefs.current = urlRefs.current.filter((_, i) => i !== index);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    // Clear error for this URL when user starts typing
    const newUrlErrors = [...urlErrors];
    newUrlErrors[index] = null;
    setUrlErrors(newUrlErrors);
  };

  const validateForm = (): boolean => {
    let isValid = true;
    let shouldFocusName = false;
    let firstInvalidUrlIndex: number | null = null;
    let sitemapShouldFocus = false;

    // Validate name
    if (!isValidAgentName(name)) {
      setNameError('Name is required and must be 100 characters or less');
      isValid = false;
      shouldFocusName = true;
    } else {
      setNameError(null);
    }

    if (mode === 'manual') {
      // Validate URLs
      const newUrlErrors: (string | null)[] = [];
      const nonEmptyUrls = urls.filter(url => url.trim() !== '');

      if (nonEmptyUrls.length === 0) {
        setError('At least one URL is required');
        isValid = false;
        firstInvalidUrlIndex = 0;
      }

      urls.forEach((url, index) => {
        const trimmedUrl = url.trim();
        if (trimmedUrl === '') {
          newUrlErrors[index] = urls.length === 1 ? 'URL is required' : null;
          if (urls.length === 1) {
            isValid = false;
            if (firstInvalidUrlIndex === null) {
              firstInvalidUrlIndex = index;
            }
          }
        } else if (!isValidUrl(trimmedUrl)) {
          newUrlErrors[index] = 'Invalid URL format (must start with http:// or https://)';
          isValid = false;
          if (firstInvalidUrlIndex === null) {
            firstInvalidUrlIndex = index;
          }
        } else {
          newUrlErrors[index] = null;
        }
      });

      setUrlErrors(newUrlErrors);
    } else {
      const trimmedSitemap = sitemapUrl.trim();
      if (!trimmedSitemap) {
        setSitemapError('URL is required');
        isValid = false;
        sitemapShouldFocus = true;
      } else if (!isValidUrl(trimmedSitemap)) {
        setSitemapError('Invalid URL format (must start with http:// or https://)');
        isValid = false;
        sitemapShouldFocus = true;
      } else {
        setSitemapError(null);
      }
    }

    if (!isValid) {
      if (shouldFocusName && nameInputRef.current) {
        nameInputRef.current.focus({ preventScroll: true });
      } else if (sitemapShouldFocus && sitemapRef.current) {
        sitemapRef.current.focus({ preventScroll: true });
      } else if (
        firstInvalidUrlIndex !== null &&
        urlRefs.current[firstInvalidUrlIndex]
      ) {
        urlRefs.current[firstInvalidUrlIndex]?.focus({ preventScroll: true });
      }
    }

    return isValid;
  };

  const normalizeHost = (host: string) => host.replace(/^www\./, '');

  const buildSitemapCandidates = (rawUrl: string): string[] => {
    const urlObj = new URL(rawUrl);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    const candidates = new Set<string>();

    if (urlObj.pathname.endsWith('.xml') && urlObj.pathname.includes('sitemap')) {
      candidates.add(urlObj.toString());
    }
    candidates.add(`${origin}/sitemap.xml`);
    candidates.add(`${origin}/sitemap_index.xml`);
    candidates.add(`${origin}/sitemap-index.xml`);

    return Array.from(candidates);
  };

  const collectUrlsFromSitemap = async (rawUrl: string): Promise<string[]> => {
    const start = new URL(rawUrl);
    const allowedHost = normalizeHost(start.hostname);

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = buildSitemapCandidates(rawUrl).map(url => ({ url, depth: 0 }));
    const collected = new Set<string>([start.toString()]);

    setCollecting(true);
    setCollectStatus('Starting sitemap lookup...');
    setCollectedCount(collected.size);

    while (queue.length > 0 && collected.size < MAX_COLLECTED_URLS) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      setCollectStatus(`Fetching sitemap (${visited.size}): ${url}`);

      let xmlText: string | null = null;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn('Sitemap fetch failed', url, res.status);
          continue;
        }
        xmlText = await res.text();
      } catch (err) {
        console.warn('Sitemap fetch error', url, err);
        continue;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');
      if (doc.querySelector('parsererror')) {
        console.warn('Failed to parse sitemap xml', url);
        continue;
      }

      // Collect URLs
      const urlLocs = Array.from(doc.querySelectorAll('url > loc'));
      for (const loc of urlLocs) {
        const href = loc.textContent?.trim();
        if (!href) continue;
        try {
          const parsed = new URL(href);
          if (normalizeHost(parsed.hostname) !== allowedHost) continue;
          collected.add(parsed.toString());
          setCollectedCount(collected.size);
          if (collected.size >= MAX_COLLECTED_URLS) {
            setCollectStatus(`Reached URL limit (${MAX_COLLECTED_URLS})`);
            break;
          }
        } catch {
          continue;
        }
      }

      // Queue child sitemaps if any
      if (depth < MAX_SITEMAP_DEPTH) {
        const sitemapLocs = Array.from(doc.querySelectorAll('sitemap > loc'));
        for (const loc of sitemapLocs) {
          const href = loc.textContent?.trim();
          if (!href) continue;
          try {
            const parsed = new URL(href);
            if (normalizeHost(parsed.hostname) !== allowedHost) continue;
            if (!visited.has(parsed.toString())) {
              queue.push({ url: parsed.toString(), depth: depth + 1 });
            }
          } catch {
            continue;
          }
        }
      }
    }

    return Array.from(collected);
  };

  const collectAndSet = async (startUrl: string, autoShow: boolean = false): Promise<string[]> => {
    setCollectedUrls([]);
    setCollectedCount(0);
    setShowCollectedUrls(autoShow);
    setCollectStatus('Starting sitemap lookup...');

    const collected = await collectUrlsFromSitemap(startUrl);
    const uniqueUrls = Array.from(new Set([startUrl.trim(), ...collected]));

    if (uniqueUrls.length === 0) {
      throw new Error('No URLs were collected from the sitemap');
    }

    setCollectedUrls(uniqueUrls);
    setCollectedCount(uniqueUrls.length);
    setCollectStatus(
      uniqueUrls.length >= MAX_COLLECTED_URLS
        ? `Collected ${uniqueUrls.length} URLs (limit reached)`
        : `Collected ${uniqueUrls.length} URLs`
    );
    if (autoShow) {
      setShowCollectedUrls(true);
    }
    return uniqueUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setError(null);
    setSuccess(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Filter out empty URLs
    const validUrls = urls.map(url => url.trim()).filter(url => url !== '');
    let urlsToSubmit: string[] = [];

    setLoading(true);

    try {
      if (mode === 'manual') {
        urlsToSubmit = validUrls;
      } else {
        urlsToSubmit = await collectAndSet(sitemapUrl.trim(), false);
      }

      const response = await apiClient.createKnowledgeSpace(name.trim(), urlsToSubmit);
      const knowledgeSpaceId = response.knowledgeSpace.id;

      // Show success message
      setSuccess(`Knowledge space created successfully! ID: ${knowledgeSpaceId}`);

      // Clear form
      setName('');
      setUrls(['']);
      setUrlErrors([null]);
      setSitemapUrl('');
      setSitemapError(null);
      setNameError(null);
      setCollectedUrls([]);
      setCollectedCount(0);
      setShowCollectedUrls(false);
      urlRefs.current = [null];
      setCollectStatus(null);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(knowledgeSpaceId);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge space';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setCollecting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  const handlePreview = async () => {
    const trimmed = sitemapUrl.trim();
    setError(null);
    setSuccess(null);
    if (!trimmed) {
      setSitemapError('URL is required');
      if (sitemapRef.current) sitemapRef.current.focus({ preventScroll: true });
      return;
    }
    if (!isValidUrl(trimmed)) {
      setSitemapError('Invalid URL format (must start with http:// or https://)');
      if (sitemapRef.current) sitemapRef.current.focus({ preventScroll: true });
      return;
    }
    setSitemapError(null);
    setCollecting(true);
    try {
      await collectAndSet(trimmed, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to collect URLs from sitemap';
      setError(message);
    } finally {
      setCollecting(false);
    }
  };

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.focus({ preventScroll: true });
    }
  }, [success]);

  useEffect(() => {
    // Reset errors when mode changes
    setError(null);
    if (mode === 'manual') {
      setSitemapError(null);
      setCollectedUrls([]);
      setCollectedCount(0);
      setCollectStatus(null);
      setShowCollectedUrls(false);
    } else {
      setUrlErrors([null]);
      setUrls(['']);
    }
  }, [mode]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6"
        noValidate
        aria-busy={loading}
        aria-live="polite"
      >
        {/* Form Header */}
        <header>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Knowledge Space</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create a new knowledge space by providing a name and one or more URLs to index.
          </p>
        </header>

        {loading && (
          <p className="sr-only" role="status">
            Creating knowledge space. Please wait.
          </p>
        )}

        {/* Error Message */}
        {error && (
          <div ref={errorRef} tabIndex={-1} aria-live="assertive">
            <ErrorMessage
              message={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm"
            role="alert"
            aria-live="polite"
            ref={successRef}
            tabIndex={-1}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="mt-1 text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Knowledge Space Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            disabled={loading}
            ref={nameInputRef}
            className={`
              w-full px-3 sm:px-4 py-3 border rounded-lg text-base
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${nameError ? 'border-red-500' : 'border-gray-300'}
              min-h-[48px] touch-manipulation
            `}
            placeholder="Enter knowledge space name"
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'name-error' : undefined}
            aria-required="true"
            autoComplete="off"
          />
          {nameError && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {nameError}
            </p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-800 mb-2">URL Input Mode</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${mode === 'manual' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'}`}>
              <input
                type="radio"
                name="url-mode"
                value="manual"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
                className="mt-1"
                disabled={loading}
              />
              <span className="text-sm">
                <span className="font-semibold block">Multiple URLs (manual)</span>
                <span className="text-gray-600">Paste or add multiple URLs manually.</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${mode === 'sitemap' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white'}`}>
              <input
                type="radio"
                name="url-mode"
                value="sitemap"
                checked={mode === 'sitemap'}
                onChange={() => setMode('sitemap')}
                className="mt-1"
                disabled={loading}
              />
              <span className="text-sm">
                <span className="font-semibold block">Single URL + sitemap crawl</span>
                <span className="text-gray-600">Start from one URL and auto-collect URLs from the same domain sitemap.</span>
              </span>
            </label>
          </div>
        </div>

        {/* URLs Input */}
        {mode === 'manual' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URLs <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {urls.map((url, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      disabled={loading}
                      ref={(el) => {
                        urlRefs.current[index] = el;
                      }}
                      className={`
                        w-full px-3 sm:px-4 py-3 border rounded-lg text-base
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${urlErrors[index] ? 'border-red-500' : 'border-gray-300'}
                        min-h-[48px] touch-manipulation
                      `}
                      placeholder="https://example.com"
                      aria-invalid={urlErrors[index] ? 'true' : 'false'}
                      aria-describedby={urlErrors[index] ? `url-error-${index}` : undefined}
                      aria-required="true"
                      aria-label={`URL ${index + 1}`}
                      autoComplete="url"
                    />
                    {urlErrors[index] && (
                      <p id={`url-error-${index}`} className="mt-1 text-sm text-red-600" role="alert">
                        {urlErrors[index]}
                      </p>
                    )}
                  </div>
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(index)}
                      disabled={loading}
                      className="px-4 py-3 min-h-[48px] sm:min-w-[48px] w-full sm:w-auto text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 touch-manipulation flex items-center justify-center gap-2"
                      aria-label={`Remove URL ${index + 1}`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="sm:hidden">Remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={loading}
              className="mt-3 inline-flex items-center justify-center px-4 py-3 min-h-[48px] w-full sm:w-auto text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              aria-label="Add another URL"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add URL
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start URL (sitemap crawl) <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={sitemapUrl}
              onChange={(e) => {
                setSitemapUrl(e.target.value);
                setSitemapError(null);
              }}
              disabled={loading}
              ref={sitemapRef}
              className={`
                w-full px-3 sm:px-4 py-3 border rounded-lg text-base
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${sitemapError ? 'border-red-500' : 'border-gray-300'}
                min-h-[48px] touch-manipulation
              `}
              placeholder="https://example.com"
              aria-invalid={sitemapError ? 'true' : 'false'}
              aria-describedby={sitemapError ? 'sitemap-error' : undefined}
              aria-required="true"
              autoComplete="url"
            />
            {sitemapError && (
              <p id="sitemap-error" className="mt-1 text-sm text-red-600" role="alert">
                {sitemapError}
              </p>
            )}
            <p className="text-xs text-gray-600">
              We will try common sitemap locations (sitemap.xml, sitemap_index.xml) for the same domain, up to {MAX_COLLECTED_URLS} URLs and depth {MAX_SITEMAP_DEPTH}. CORS restrictions may prevent fetching some sitemaps.
            </p>
              {collectStatus && (
                <div className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                <span>{collectStatus}</span>
                <span className="text-gray-500">({collectedCount} collected)</span>
              </div>
            )}
            {mode === 'sitemap' && collectedUrls.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    Found {collectedUrls.length} URL{collectedUrls.length > 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCollectedUrls(prev => !prev)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    disabled={collecting || loading}
                  >
                    {showCollectedUrls ? 'Hide URLs' : 'Show URLs'}
                  </button>
                </div>
                {showCollectedUrls && (
                  <div className="max-h-48 overflow-y-auto text-xs text-gray-700 space-y-1 bg-gray-50 border border-gray-200 rounded p-2">
                    {collectedUrls.map((u, idx) => (
                      <div key={`${u}-${idx}`} className="break-all">
                        {idx + 1}. {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {mode === 'sitemap' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={collecting || loading}
                  className="inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {collecting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Previewing...
                    </>
                  ) : (
                    'Preview sitemap URLs'
                  )}
                </button>
                {collectedCount > 0 && (
                  <p className="text-xs text-gray-600">Collected: {collectedCount}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] w-full sm:w-auto text-base font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {collecting ? 'Collecting from sitemap...' : 'Creating...'}
              </>
            ) : (
              'Create Knowledge Space'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateKnowledgeSpaceForm;
