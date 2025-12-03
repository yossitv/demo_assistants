'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Agent } from '@/types';

interface APIKeysPanelProps {
  apiKey?: string;
  apiBaseUrl?: string;
  modelExample?: string;
  agents?: Agent[];
}

export function APIKeysPanel({ apiKey, apiBaseUrl, modelExample, agents }: APIKeysPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const resolvedKey = apiKey ?? process.env.NEXT_PUBLIC_JWT_TOKEN ?? '';
  const resolvedBaseUrl = apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

  // Keep selected model in sync with provided example or available agents
  useEffect(() => {
    if (agents && agents.length > 0) {
      setSelectedModel(agents[0].id);
    } else if (modelExample) {
      setSelectedModel(modelExample);
    } else {
      setSelectedModel('agent_example_model');
    }
  }, [agents, modelExample]);

  const maskedKey = useMemo(() => {
    if (!resolvedKey) return 'Not configured';
    return '*'.repeat(Math.max(resolvedKey.length, 4));
  }, [resolvedKey]);

  const curlExample = useMemo(() => {
    const base = resolvedBaseUrl || 'https://api.example.com';
    const tokenPlaceholder = resolvedKey ? '*'.repeat(Math.max(resolvedKey.length, 4)) : '$NEXT_PUBLIC_JWT_TOKEN';
    return [
      'curl -N -s -S -X POST',
      `"${base}/v1/chat/completions"`,
      `-H "Authorization: Bearer ${tokenPlaceholder}"`,
      '-H "Content-Type: application/json"',
      `-d '{\"model\":\"${selectedModel}\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"stream\":true}'`,
    ].join(' ');
  }, [resolvedBaseUrl, resolvedKey, selectedModel]);

  const curlCopyValue = useMemo(() => {
    const base = resolvedBaseUrl || 'https://api.example.com';
    const token = resolvedKey || '$NEXT_PUBLIC_JWT_TOKEN';
    return [
      'curl -N -s -S -X POST',
      `"${base}/v1/chat/completions"`,
      `-H "Authorization: Bearer ${token}"`,
      '-H "Content-Type: application/json"',
      `-d '{\"model\":\"${selectedModel}\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"stream\":true}'`,
    ].join(' ');
  }, [resolvedBaseUrl, resolvedKey, selectedModel]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback('Copied!');
    } catch (err) {
      console.error('Clipboard copy failed', err);
      setCopyFeedback('Copy failed');
    } finally {
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const hasAgents = agents && agents.length > 0;

  return (
    <section aria-label="API keys panel" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">API Keys</h2>
        <p className="text-sm text-gray-600">
          View your configured key and use the curl example to integrate. Keys are read from environment variables.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">NEXT_PUBLIC_JWT_TOKEN</p>
            <p className="text-lg font-mono" data-testid="masked-key">
              {maskedKey}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(resolvedKey)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Copy full API key"
            disabled={!resolvedKey}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h10a2 2 0 012 2v9a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2h2" />
            </svg>
            Copy
          </button>
        </div>
        <p className="text-xs text-gray-500">Keys are not created here. Set NEXT_PUBLIC_JWT_TOKEN in your environment.</p>
        {copyFeedback && <p className="text-xs text-green-700">{copyFeedback}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">curl example (uses NEXT_PUBLIC_API_BASE_URL)</p>
            <code className="text-xs text-gray-500">{resolvedBaseUrl || 'Not configured'}</code>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(curlCopyValue)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Copy curl example"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m0 0l4-4m-4 4l4 4" />
            </svg>
            Copy curl
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Model</label>
          {hasAgents ? (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              aria-label="Model selector"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-gray-500">{selectedModel}</span>
          )}
        </div>
        <p className="text-xs text-gray-500">Model example: {selectedModel}</p>
        <div className="rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-800 break-words" data-testid="curl-example">
          {curlExample}
        </div>
      </div>
    </section>
  );
}
