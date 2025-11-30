'use client';

import { useState, useEffect } from 'react';
import { Agent, KnowledgeSpace, AgentUpdateRequest } from '@/types';

interface AgentEditModalProps {
  agent: Agent;
  knowledgeSpaces: KnowledgeSpace[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AgentUpdateRequest) => Promise<void>;
}

export function AgentEditModal({
  agent,
  knowledgeSpaces,
  isOpen,
  onClose,
  onSave,
}: AgentEditModalProps) {
  const [formData, setFormData] = useState<AgentUpdateRequest>({
    name: agent.name,
    description: agent.description,
    systemPrompt: '',
    knowledgeSpaceIds: [agent.knowledgeSpaceId],
    strictRAG: agent.strictRAG,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      name: agent.name,
      description: agent.description,
      systemPrompt: '',
      knowledgeSpaceIds: [agent.knowledgeSpaceId],
      strictRAG: agent.strictRAG,
    });
  }, [agent]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '名前は必須です';
    } else if (formData.name.length > 100) {
      newErrors.name = '名前は100文字以内で入力してください';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }

    if (formData.systemPrompt && formData.systemPrompt.length > 2000) {
      newErrors.systemPrompt = 'システムプロンプトは2000文字以内で入力してください';
    }

    if (formData.knowledgeSpaceIds.length === 0) {
      newErrors.knowledgeSpaceIds = '最低1つのナレッジスペースを選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleKnowledgeSpaceToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      knowledgeSpaceIds: prev.knowledgeSpaceIds.includes(id)
        ? prev.knowledgeSpaceIds.filter(ksId => ksId !== id)
        : [...prev.knowledgeSpaceIds, id],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">エージェントの編集</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">システムプロンプト</label>
            <textarea
              value={formData.systemPrompt || ''}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {errors.systemPrompt && <p className="text-red-500 text-sm mt-1">{errors.systemPrompt}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ナレッジスペース <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded p-3">
              {knowledgeSpaces.map((ks) => (
                <label key={ks.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.knowledgeSpaceIds.includes(ks.id)}
                    onChange={() => handleKnowledgeSpaceToggle(ks.id)}
                    disabled={loading}
                    className="rounded"
                  />
                  <span className="text-sm">{ks.name}</span>
                  <span className="text-xs text-gray-500">({ks.type})</span>
                </label>
              ))}
            </div>
            {errors.knowledgeSpaceIds && <p className="text-red-500 text-sm mt-1">{errors.knowledgeSpaceIds}</p>}
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.strictRAG}
                onChange={(e) => setFormData({ ...formData, strictRAG: e.target.checked })}
                disabled={loading}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Strict RAG</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              有効にすると、ナレッジベースに基づいた回答のみを生成します
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
