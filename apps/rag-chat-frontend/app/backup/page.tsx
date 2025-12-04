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
  documentCount?: number;
  type?: string;
  status?: string;
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
    (process.env.NEXT_PUBLIC_JWT_TOKEN ? `Bearer ${process.env.NEXT_PUBLIC_JWT_TOKEN}` : undefined) ||
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);
  const [knowledgeChunks, setKnowledgeChunks] = useState<string[]>([]);
  const [uploadedFileContent, setUploadedFileContent] = useState<Map<string, string>>(new Map());
  const [uploadMode, setUploadMode] = useState<'product_recommend' | 'qa' | 'document' | 'description'>('product_recommend');
  const [viewMode, setViewMode] = useState<'chunks' | 'original'>('chunks');

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
      // 既に環境変数で与えられている場合は優先し、ローカルの古い値（例: 旧APIキー/旧URL）で上書きしない
      if (!defaultApiKey && storedKey) setApiKey(storedKey);
      if (!defaultApiUrl && storedUrl) setApiUrl(storedUrl);
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
          documentCount: ks.documentCount,
          type: ks.type,
          status: ks.status,
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
        createdAt: new Date().toISOString(),
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
    
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: chatInput.trim() }];
    setChatInput('');

    try {
      const controller = new AbortController();
      setAbortController(controller);
      
      let fullContent = '';
      let citedUrls: string[] | undefined;
      const stream = client.chatStream(
        agentIdToUse,
        newHistory.map((m) => ({ role: m.role, content: m.content })),
        controller.signal
      );

      for await (const chunk of stream) {
        if (chunk.citedUrls && chunk.citedUrls.length > 0) {
          citedUrls = chunk.citedUrls;
        }
        if (chunk.content) {
          fullContent += chunk.content;
        }
        setChatHistory([...newHistory, { role: 'assistant', content: fullContent, cited_urls: citedUrls }]);
      }
      setAbortController(null);
    } catch (err) {
      console.error('Chat error:', err);
      handleError(err, 'チャットの送信に失敗しました');
      setChatError(err instanceof ApiError ? err.message : '送信に失敗しました');
    } finally {
      setIsChatLoading(false);
      setAbortController(null);
    }
  };

  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsChatLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }
    console.log('Starting upload:', selectedFile.name);
    setIsUploading(true);
    setStatus(null);
    try {
      // ファイル内容を読み取って保存
      const fileContent = await selectedFile.text();
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', selectedFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('sourceType', 'file');
      formData.append('mode', uploadMode);

      console.log('Uploading to:', `${apiUrl}/v1/knowledge/create`);
      const authHeader = apiKey.startsWith('Bearer') ? apiKey : `Bearer ${apiKey}`;
      const response = await fetch(`${apiUrl}/v1/knowledge/create`, {
        method: 'POST',
        headers: { 
          'Authorization': authHeader 
          // Content-Typeは指定しない（fetchが自動でmultipart/form-dataを設定）
        },
        body: formData,
      });

      console.log('Upload response:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error:', errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      // ファイル内容を保存
      setUploadedFileContent(prev => new Map(prev).set(result.knowledgeSpaceId, fileContent));
      
      setStatus(`ファイルをアップロードしました: ${result.knowledgeSpaceId}`);
      setSelectedFile(null);
      await refresh();
    } catch (err) {
      console.error('Upload exception:', err);
      handleError(err, 'ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewChunks = async (knowledgeId: string) => {
    setSelectedKnowledgeId(knowledgeId);
    setKnowledgeChunks([]);
    setStatus('RAGデータを取得中...');
    
    try {
      // 新しいAPIでチャンクを直接取得
      const result = await client.getKnowledgeChunks(knowledgeId);
      
      if (result.chunks.length === 0) {
        setKnowledgeChunks(['⚠️ このナレッジスペースにはチャンクが登録されていません。']);
        setStatus('チャンクが見つかりませんでした');
        return;
      }

      const chunksDisplay = result.chunks.map((chunk, idx) => 
        `【チャンク ${idx + 1}/${result.chunkCount}】\nURL: ${chunk.url || 'N/A'}\nDomain: ${chunk.domain || 'N/A'}\n\n${chunk.content}\n\n---`
      );
      
      setKnowledgeChunks(chunksDisplay);
      setStatus(`${result.chunkCount}個のチャンクを取得しました`);
    } catch (err) {
      console.error('Chunk fetch error:', err);
      setStatus('チャンクの取得に失敗しました');
      setKnowledgeChunks(['❌ チャンクの取得に失敗しました。バックエンドを再デプロイしてください。']);
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

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-2">ファイルアップロード</h3>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span>モード選択</span>
                <select
                  value={uploadMode}
                  onChange={(e) => setUploadMode(e.target.value as any)}
                  className="border rounded px-3 py-2"
                >
                  <option value="product_recommend">製品レコメンド（構造化）</option>
                  <option value="qa">Q&A（質問と回答）</option>
                  <option value="document">ドキュメント（セクション分割）</option>
                  <option value="description">説明文（段落分割）</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Markdownファイル (.md)</span>
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="border rounded px-3 py-2"
                />
              </label>
              {selectedFile && (
                <p className="text-sm text-gray-600">
                  選択: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
              <button
                onClick={handleFileUpload}
                disabled={!apiKey || !selectedFile || isUploading}
                className="px-4 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 disabled:opacity-50"
              >
                {isUploading ? 'アップロード中...' : 'アップロード'}
              </button>
            </div>
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
              <li key={ks.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{ks.name}</p>
                      {ks.type && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          {ks.type}
                        </span>
                      )}
                      {ks.status && (
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          ks.status === 'completed' ? 'bg-green-100 text-green-700' :
                          ks.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                          ks.status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ks.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{ks.id}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      {ks.documentCount !== undefined && (
                        <span>📄 {ks.documentCount} チャンク</span>
                      )}
                      {ks.lastUpdatedAt && (
                        <span>Updated: {ks.lastUpdatedAt}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewChunks(ks.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    データ確認
                  </button>
                </div>
                {selectedKnowledgeId === ks.id && knowledgeChunks.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex gap-2 mb-3 border-b pb-2">
                      <button
                        onClick={() => setViewMode('chunks')}
                        className={`px-3 py-1 text-sm rounded ${
                          viewMode === 'chunks'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        RAGチャンク
                      </button>
                      {uploadedFileContent.has(ks.id) && (
                        <button
                          onClick={() => setViewMode('original')}
                          className={`px-3 py-1 text-sm rounded ${
                            viewMode === 'original'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          元データ
                        </button>
                      )}
                    </div>
                    
                    {viewMode === 'chunks' ? (
                      <>
                        <p className="text-sm font-semibold mb-2">RAGチャンク一覧</p>
                        {knowledgeChunks.map((chunk, idx) => (
                          <div key={idx} className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto mb-2 bg-white p-2 rounded border">
                            {chunk}
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold mb-2">📄 アップロードされた元データ</p>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto bg-white p-2 rounded border">
                          {uploadedFileContent.get(ks.id)}
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                className="border rounded px-3 py-2 min-h-[100px] w-full"
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
                {isChatLoading && abortController && (
                  <button
                    onClick={handleStopStreaming}
                    className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700"
                  >
                    停止
                  </button>
                )}
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
