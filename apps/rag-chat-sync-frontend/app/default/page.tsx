/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';
import { getAgents as loadStoredAgents, saveAgent as persistAgent } from '@/lib/utils/storage';

type KnowledgeItem = {
  id: string;
  name: string;
  lastUpdatedAt?: string;
};

const API_KEY_STORAGE_KEY = 'default_dashboard_api_key';
const API_URL_STORAGE_KEY = 'default_dashboard_api_url';

type AgentItem = {
  id: string;
  name: string;
  knowledgeSpaceIds: string[];
  strictRAG: boolean;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  cited_urls?: string[];
};

export default function DefaultDashboard() {
  const defaultApiKey =
    process.env.NEXT_PUBLIC_API_KEY ||
    process.env.NEXT_PUBLIC_TEST_API_KEY ||
    // Fallback for local dev when only TEST_API_KEY is provided
    process.env.TEST_API_KEY ||
    '';
  const defaultApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [name, setName] = useState('');
  const [urls, setUrls] = useState('');
  const [agentName, setAgentName] = useState('');
  const [selectedKsIds, setSelectedKsIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [customAgentId, setCustomAgentId] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Create a fresh client per render to honor apiUrl/apiKey changes.
  const client = useMemo(() => {
    const c = new ApiClient({ baseUrl: apiUrl, apiKey });
    return c;
  }, [apiUrl, apiKey]);

  useEffect(() => {
    // hydrate from localStorage
    try {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      const storedUrl = localStorage.getItem(API_URL_STORAGE_KEY);
      if (storedKey) setApiKey(storedKey);
      if (storedUrl) setApiUrl(storedUrl);
      const storedAgents = loadStoredAgents();
      if (storedAgents.length > 0) {
        setAgents(
          storedAgents.map((a) => ({
            id: a.id,
            name: a.name,
            knowledgeSpaceIds: [a.knowledgeSpaceId],
            strictRAG: a.strictRAG,
          }))
        );
        setSelectedAgentId(storedAgents[0].id);
      }
    } catch (err) {
      console.error('Failed to read stored API config', err);
    }
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    void refresh();
  }, [apiKey, apiUrl]);

  const refresh = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const res = await client.listKnowledgeSpaces();
      setKnowledgeSpaces(
        res.knowledgeSpaces.map((ks) => ({
          id: ks.id,
          name: ks.name,
          lastUpdatedAt: ks.lastUpdatedAt,
        }))
      );
      // agent list APIはないので、ダッシュボード用に簡易取得 (既存のAPIクライアントには未実装)
      // 暫定的に knowledge/list の結果で id/name を表示し、エージェントは手動登録とする
    } catch (err) {
      handleError(err, 'ナレッジ一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      if (apiUrl) localStorage.setItem(API_URL_STORAGE_KEY, apiUrl);
      setStatus('APIキーを保存しました。');
    } catch (err) {
      console.error(err);
      setStatus('APIキーの保存に失敗しました。');
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const sourceUrls = urls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      await client.createKnowledgeSpace(name, sourceUrls);
      setStatus('ナレッジを作成しました。');
      setName('');
      setUrls('');
      await refresh();
    } catch (err) {
      handleError(err, 'ナレッジの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      if (!agentName.trim()) {
        throw new Error('エージェント名を入力してください');
      }
      if (selectedKsIds.length === 0) {
        throw new Error('紐づけるナレッジを1つ以上選択してください');
      }

      const res = await client.createAgent(
        selectedKsIds,
        agentName.trim(),
        `Created from default dashboard (${new Date().toISOString()})`,
        true
      );

      setStatus(`エージェントを作成しました: ${res.agent.id}`);
      setAgentName('');
      setSelectedKsIds([]);
      setAgents((prev) => [
        ...prev,
        {
          id: res.agent.id,
          name: agentName.trim(),
          knowledgeSpaceIds: selectedKsIds,
          strictRAG: true,
        },
      ]);
      // Persist to localStorage for future sessions
      persistAgent({
        id: res.agent.id,
        name: agentName.trim(),
        description: `Created from default dashboard (${new Date().toISOString()})`,
        strictRAG: true,
        knowledgeSpaceId: selectedKsIds[0],
        createdAt: new Date(),
      });
      if (!selectedAgentId) {
        setSelectedAgentId(res.agent.id);
      }
    } catch (err) {
      handleError(err, 'エージェントの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChat = async () => {
    const agentIdToUse = selectedAgentId || customAgentId.trim();
    if (!agentIdToUse) {
      setChatError('エージェントを選択するかIDを入力してください');
      return;
    }
    if (!chatInput.trim()) {
      setChatError('メッセージを入力してください');
      return;
    }
    setChatError(null);
    setIsChatLoading(true);
    try {
      const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: chatInput.trim() }];
      const res = await client.chat(
        agentIdToUse,
        newHistory.map((m) => ({ role: m.role, content: m.content }))
      );
      setChatHistory([
        ...newHistory,
        { role: 'assistant', content: res.message.content, cited_urls: res.message.cited_urls },
      ]);
      setChatInput('');
    } catch (err) {
      handleError(err, 'チャットの送信に失敗しました');
      setChatError(err instanceof ApiError ? err.message : '送信に失敗しました');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      setStatus(`${fallback}: ${error.message}`);
    } else if (error instanceof Error) {
      setStatus(`${fallback}: ${error.message}`);
    } else {
      setStatus(fallback);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Default Tenant Dashboard</h1>
          <p className="text-sm text-gray-600">
            APIキーを指定して default テナントのナレッジを追加・参照します（/v1/knowledge/create, /v1/knowledge/list）。
          </p>
        </div>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">API設定</h2>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>API Base URL</span>
              <input
                className="border rounded px-3 py-2"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://.../prod"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>API Key</span>
              <input
                className="border rounded px-3 py-2"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key (Authorization header)"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={refresh}
                disabled={!apiKey || isLoading}
                className="px-4 py-2 bg-gray-900 text-white rounded shadow disabled:opacity-50"
              >
                再読み込み
              </button>
            </div>
            {status && <p className="text-sm text-gray-700">{status}</p>}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">ナレッジ作成</h2>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>名前</span>
              <input
                className="border rounded px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Knowledge space name"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>URL（改行区切り）</span>
              <textarea
                className="border rounded px-3 py-2 min-h-[120px]"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com\nhttps://example.com/page2"
              />
            </label>
            <button
              onClick={handleCreate}
              disabled={!apiKey || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-3">
          <h2 className="text-xl font-semibold">ナレッジ一覧 (default)</h2>
          {isLoading && <p className="text-sm text-gray-600">読み込み中...</p>}
          {!isLoading && knowledgeSpaces.length === 0 && (
            <p className="text-sm text-gray-600">まだナレッジがありません。</p>
          )}
          <ul className="divide-y divide-gray-200">
            {knowledgeSpaces.map((ks) => (
              <li key={ks.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{ks.name}</p>
                  <p className="text-xs text-gray-500">{ks.id}</p>
                  {ks.lastUpdatedAt && (
                    <p className="text-xs text-gray-500">Updated: {ks.lastUpdatedAt}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">エージェント作成 (default)</h2>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>エージェント名</span>
              <input
                className="border rounded px-3 py-2"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Default API agent"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm">
              <span>紐づけるナレッジを選択</span>
              <div className="grid gap-2">
                {knowledgeSpaces.map((ks) => (
                  <label key={ks.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedKsIds.includes(ks.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKsIds((prev) => [...prev, ks.id]);
                        } else {
                          setSelectedKsIds((prev) => prev.filter((id) => id !== ks.id));
                        }
                      }}
                    />
                    <span className="font-medium">{ks.name}</span>
                    <span className="text-xs text-gray-500">{ks.id}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateAgent}
              disabled={!apiKey || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 disabled:opacity-50"
            >
              エージェントを作成
            </button>
          </div>

          {agents.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-2">作成済みエージェント</h3>
              <ul className="divide-y divide-gray-200">
                {agents.map((a) => (
                  <li key={a.id} className="py-2">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.id}</p>
                    <p className="text-xs text-gray-500">
                      KS: {a.knowledgeSpaceIds.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">エージェントとチャット (default)</h2>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm">エージェントを選択</label>
              <select
                className="border rounded px-3 py-2"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">選択してください</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
              <div className="flex flex-col gap-1 text-sm">
                <span>またはエージェントIDを直接入力</span>
                <input
                  className="border rounded px-3 py-2"
                  value={customAgentId}
                  onChange={(e) => setCustomAgentId(e.target.value)}
                  placeholder="agent_..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">メッセージ</label>
              <textarea
                className="border rounded px-3 py-2 min-h-[100px]"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="質問を入力してください"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSendChat}
                  disabled={!apiKey || isChatLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  送信
                </button>
                {isChatLoading && <span className="text-sm text-gray-600">送信中...</span>}
                {chatError && <span className="text-sm text-red-600">{chatError}</span>}
              </div>
            </div>

            <div className="border rounded p-3 bg-gray-50">
              <h3 className="font-semibold mb-2">チャットログ</h3>
              {chatHistory.length === 0 && <p className="text-sm text-gray-600">まだメッセージがありません。</p>}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {chatHistory.map((m, idx) => (
                  <div key={idx} className="bg-white rounded border px-3 py-2 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase">{m.role}</p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.cited_urls && m.cited_urls.length > 0 && (
                      <div className="mt-1 text-xs text-blue-700 space-y-1">
                        {m.cited_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="underline break-all">
                            {url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
