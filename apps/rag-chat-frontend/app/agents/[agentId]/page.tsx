import { Metadata } from 'next';
import ChatPageClient from './ChatPageClient';

/**
 * Page props interface for dynamic route params
 * In Next.js 15+, params is a Promise that needs to be awaited
 */
interface PageProps {
  params: Promise<{
    agentId: string;
  }>;
}

/**
 * Generate metadata for the chat page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentId } = await params;

  return {
    title: `Chat with Agent ${agentId}`,
    description: `Chat interface for agent ${agentId}`,
  };
}

/**
 * Chat Page Component
 *
 * Server component that renders the chat interface for a specific agent.
 * The actual chat functionality is handled by the ChatPageClient component.
 *
 * Features:
 * - Dynamic route with agentId parameter
 * - Validates agentId exists and is non-empty
 * - Delegates to client component for interactivity
 *
 * Route: /agents/[agentId]
 *
 * @example
 * /agents/agent-123
 * /agents/my-support-agent
 */
export default async function ChatPage({ params }: PageProps) {
  const { agentId } = await params;

  // Validate agentId exists and is not empty
  if (!agentId || agentId.trim() === '') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-red-200">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Invalid Agent ID
            </h1>
            <p className="text-gray-600 text-center mb-6">
              The agent ID provided is invalid or missing. Please check the URL and try again.
            </p>
            <div className="flex justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                aria-label="Return to Home"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the client component with the validated agentId
  return <ChatPageClient agentId={agentId} />;
}
