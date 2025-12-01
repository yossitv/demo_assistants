import React from 'react';
import CreateAgentForm from '@/components/CreateAgentForm';

/**
 * Agent creation page
 * Implements the multi-step agent creation flow:
 * 1. Create knowledge base
 * 2. Configure agent
 * 3. Navigate to chat
 */
export default function CreateAgentPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 sm:py-12 px-4 sm:px-6 lg:px-8" role="main">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Agent</h1>
          <p className="mt-2 text-sm text-gray-600">
            Follow the steps below to create a knowledge base and configure your AI agent.
          </p>
        </div>

        <CreateAgentForm />
      </div>
    </main>
  );
}
