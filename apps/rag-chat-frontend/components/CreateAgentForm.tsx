'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAgent } from '@/lib/context/KnowledgeContext';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';
import { isValidAgentName } from '@/lib/utils/validation';

interface CreateAgentFormProps {
  onCreated?: (agentId: string) => void;
}

/**
 * Multi-step form for creating an agent with knowledge base
 * Step 1: Knowledge base selection (existing or new)
 * Step 2: Agent configuration
 */
const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ onCreated }) => {
  const router = useRouter();
  const { createAgent, knowledgeSpaces, loadKnowledgeSpaces } = useAgent();

  // Form state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [knowledgeSpaceIds, setKnowledgeSpaceIds] = useState<string[]>([]);
  // Default to using existing knowledge spaces (can switch to create new)
  const [useExisting, setUseExisting] = useState<boolean>(true);

  // Agent configuration state
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [strictRAG, setStrictRAG] = useState(true);
  const [preset, setPreset] = useState<'none' | 'product_recommendation'>('none');

  // UI state
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const agentErrorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const agentHeadingRef = useRef<HTMLHeadingElement>(null);
  const agentNameInputRef = useRef<HTMLInputElement>(null);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);

  // Load knowledge spaces on mount
  useEffect(() => {
    loadKnowledgeSpaces();
  }, [loadKnowledgeSpaces]);

  useEffect(() => {
    if (agentError && agentErrorRef.current) {
      agentErrorRef.current.focus({ preventScroll: true });
    }
  }, [agentError]);

  useEffect(() => {
    if (createdAgentId && successRef.current) {
      successRef.current.focus({ preventScroll: true });
    }
  }, [createdAgentId]);

  useEffect(() => {
    if (currentStep === 2 && agentHeadingRef.current) {
      agentHeadingRef.current.focus({ preventScroll: true });
    }
  }, [currentStep]);

  /**
   * Handle preset selection
   */
  const handlePresetChange = (newPreset: 'none' | 'product_recommendation') => {
    setPreset(newPreset);
    
    if (newPreset === 'product_recommendation') {
      setAgentDescription('AI assistant specialized in product recommendations based on user needs and preferences.');
      setStrictRAG(true);
    } else {
      setAgentDescription('');
      setStrictRAG(true);
    }
  };

  /**
   * Handle successful knowledge base creation
   * Automatically advance to step 2 for agent configuration
   */
  const handleKnowledgeSpaceSuccess = (newKnowledgeSpaceId: string) => {
    setKnowledgeSpaceIds([newKnowledgeSpaceId]);
    setCurrentStep(2);
  };

  /**
   * Validate agent configuration form
   */
  const validateAgentForm = (): boolean => {
    let isValid = true;

    if (!isValidAgentName(agentName)) {
      setNameError('Agent name is required and must be 100 characters or less');
      isValid = false;
      if (agentNameInputRef.current) {
        agentNameInputRef.current.focus({ preventScroll: true });
      }
    } else {
      setNameError(null);
    }

    return isValid;
  };

  /**
   * Handle agent creation submission
   */
  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous error
    setAgentError(null);

    // Validate form
    if (!validateAgentForm()) {
      return;
    }

    // Ensure we have a knowledge space ID
    if (!knowledgeSpaceIds || knowledgeSpaceIds.length === 0) {
      setAgentError('Knowledge space ID is missing. Please go back and create a knowledge base first.');
      return;
    }

    setIsCreatingAgent(true);

    try {
      // Create agent with the knowledge space
      const systemPrompt = preset === 'product_recommendation' 
        ? 'You are a product recommendation assistant. Help users find the best products based on their needs.'
        : undefined;

      const agent = await createAgent(
        agentName.trim(),
        knowledgeSpaceIds,
        strictRAG,
        agentDescription.trim() || undefined,
        preset !== 'none' ? preset : undefined,
        systemPrompt
      );

      // Store created agent ID
      setCreatedAgentId(agent.id);
      onCreated?.(agent.id);
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setAgentError(errorMessage);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  /**
   * Handle retry for agent creation
   */
  const handleRetry = () => {
    setAgentError(null);
    handleAgentSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  /**
   * Navigate to chat interface with the created agent
   */
  const handleNavigateToChat = () => {
    if (createdAgentId) {
      router.push(`/agents/${createdAgentId}`);
    }
  };

  /**
   * Go back to step 1 (knowledge base creation)
   */
  const handleGoBack = () => {
    setCurrentStep(1);
    setKnowledgeSpaceId(null);
    setAgentError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      {/* Progress Indicator */}
      <div className="mb-6 sm:mb-8">
        <nav className="flex items-center justify-between" aria-label="Agent creation progress">
          <div className="flex items-center" aria-current={currentStep === 1 ? 'step' : undefined}>
            <div
              className={`
                flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm sm:text-base
                ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}
            >
              1
            </div>
            <div className="ml-2 sm:ml-3">
              <p className={`text-xs sm:text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                Step 1
              </p>
              <p className="text-xs text-gray-500 hidden sm:block">Create Knowledge Base</p>
            </div>
          </div>

          <div className={`flex-1 h-1 mx-2 sm:mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />

          <div className="flex items-center" aria-current={currentStep === 2 ? 'step' : undefined}>
            <div
              className={`
                flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm sm:text-base
                ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}
            >
              2
            </div>
            <div className="ml-2 sm:ml-3">
              <p className={`text-xs sm:text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                Step 2
              </p>
              <p className="text-xs text-gray-500 hidden sm:block">Configure Agent</p>
            </div>
          </div>
        </nav>
      </div>

      {/* Step 1: Knowledge Base Selection */}
      {currentStep === 1 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Select Knowledge Base
            </h2>
            
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setUseExisting(false)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  !useExisting
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">Create New</div>
                <div className="text-sm">Create a new knowledge space</div>
              </button>
              
              <button
                type="button"
                onClick={() => setUseExisting(true)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  useExisting
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">Use Existing</div>
                <div className="text-sm">Select from existing spaces</div>
              </button>
            </div>

            {useExisting ? (
              <div>
                {knowledgeSpaces.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No knowledge spaces available. Please create a new one.
                  </div>
                ) : (
                  <div>
                    <div className="space-y-3 mb-4">
                      {knowledgeSpaces.map((ks) => (
                        <label
                          key={ks.id}
                          className="flex items-start px-4 py-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={knowledgeSpaceIds.includes(ks.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setKnowledgeSpaceIds([...knowledgeSpaceIds, ks.id]);
                              } else {
                                setKnowledgeSpaceIds(knowledgeSpaceIds.filter(id => id !== ks.id));
                              }
                            }}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{ks.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{ks.type}</span>
                              {ks.documentCount && <span>{ks.documentCount} documents</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (knowledgeSpaceIds.length === 0) {
                          alert('Please select at least one knowledge space');
                          return;
                        }
                        setCurrentStep(2);
                      }}
                      disabled={knowledgeSpaceIds.length === 0}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue with {knowledgeSpaceIds.length} selected
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <CreateKnowledgeSpaceForm onSuccess={handleKnowledgeSpaceSuccess} />
            )}
          </div>
        </div>
      )}

      {/* Step 2: Agent Configuration */}
      {currentStep === 2 && !createdAgentId && (
        <div>
          <form
            onSubmit={handleAgentSubmit}
            className="space-y-4 sm:space-y-6"
            aria-busy={isCreatingAgent}
            aria-live="polite"
          >
            {/* Form Header */}
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold text-gray-900"
                ref={agentHeadingRef}
                tabIndex={-1}
              >
                Configure Your Agent
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Set up your AI agent with a name, description, and RAG settings.
              </p>
            </div>

            {isCreatingAgent && (
              <p className="sr-only" role="status">
                Creating agent. Please wait.
              </p>
            )}

            {/* Error Message */}
            {agentError && (
              <div ref={agentErrorRef} tabIndex={-1} aria-live="assertive">
                <ErrorMessage
                  message={agentError}
                  onRetry={handleRetry}
                  onDismiss={() => setAgentError(null)}
                />
              </div>
            )}

            {/* Preset Selection */}
            <div>
              <label htmlFor="preset" className="block text-sm font-medium text-gray-700 mb-2">
                Agent Preset
              </label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value as 'none' | 'product_recommendation')}
                disabled={isCreatingAgent}
                className="
                  w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg text-base
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  min-h-[48px] touch-manipulation
                "
              >
                <option value="none">None (Custom)</option>
                <option value="product_recommendation">Product Recommendation</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select a preset to auto-configure your agent for specific use cases.
              </p>
            </div>

            {/* Agent Name Input */}
            <div>
              <label htmlFor="agentName" className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="agentName"
                value={agentName}
                onChange={(e) => {
                  setAgentName(e.target.value);
                  setNameError(null);
                }}
                disabled={isCreatingAgent}
                ref={agentNameInputRef}
                className={`
                  w-full px-3 sm:px-4 py-3 border rounded-lg text-base
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  ${nameError ? 'border-red-500' : 'border-gray-300'}
                  min-h-[48px] touch-manipulation
                `}
                placeholder="Enter agent name"
                aria-invalid={nameError ? 'true' : 'false'}
                aria-describedby={nameError ? 'agentName-error' : undefined}
                aria-required="true"
                autoComplete="off"
              />
              {nameError && (
                <p id="agentName-error" className="mt-1 text-sm text-red-600" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {/* Agent Description Input */}
            <div>
              <label htmlFor="agentDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="agentDescription"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                disabled={isCreatingAgent}
                rows={4}
                className="
                  w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg text-base
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  touch-manipulation
                "
                placeholder="Describe what your agent can help with..."
                aria-describedby="agentDescription-hint"
              />
              <p id="agentDescription-hint" className="mt-1 text-xs text-gray-500">
                If left empty, a default description will be generated.
              </p>
            </div>

            {/* Strict RAG Toggle */}
            <fieldset>
              <div className="flex items-start min-h-[44px]">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="strictRAG"
                    checked={strictRAG}
                    onChange={(e) => setStrictRAG(e.target.checked)}
                    disabled={isCreatingAgent}
                    className="
                      w-4 h-4 text-blue-600 border-gray-300 rounded
                      focus:ring-2 focus:ring-blue-500
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                    aria-describedby="strictRAG-description"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="strictRAG" className="text-sm font-medium text-gray-700">
                    Enable Strict RAG Mode
                  </label>
                  <p id="strictRAG-description" className="text-xs text-gray-500 mt-1">
                    When enabled, the agent will only answer questions based on the knowledge base content.
                    Disable to allow the agent to use general knowledge as well.
                  </p>
                </div>
              </div>
            </fieldset>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleGoBack}
                disabled={isCreatingAgent}
                className="
                  inline-flex items-center justify-center px-4 py-3 min-h-[48px] text-sm font-medium text-gray-700
                  bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  touch-manipulation
                "
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>

              <button
                type="submit"
                disabled={isCreatingAgent}
                className="
                  inline-flex items-center justify-center px-6 py-3 min-h-[48px] text-base font-medium text-white
                  bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  touch-manipulation
                "
              >
                {isCreatingAgent ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating Agent...
                  </>
                ) : (
                  'Create Agent'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success State */}
      {createdAgentId && (
        <div
          className="text-center py-12"
          ref={successRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-10 h-10 text-green-600"
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

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Agent Created Successfully!
          </h2>
          <p className="text-gray-600 mb-8">
            Your AI agent is ready to chat. Click below to start a conversation.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleNavigateToChat}
              className="
                inline-flex items-center justify-center px-6 py-3 min-h-[48px] text-base font-medium text-white
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                touch-manipulation
              "
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Start Chatting
            </button>

            <div>
              <p className="text-xs text-gray-500">Agent ID: {createdAgentId}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAgentForm;
