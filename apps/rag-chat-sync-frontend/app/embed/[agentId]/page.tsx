import { Metadata } from 'next';
import EmbedChatClient from './EmbedChatClient';

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
 * Generate metadata for the embed chat page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentId } = await params;

  return {
    title: `Chat Widget - ${agentId}`,
    description: `Embeddable chat widget for agent ${agentId}`,
  };
}

/**
 * Embed Chat Page Component
 *
 * Server component that renders the embeddable chat interface
 * for a specific agent. This page is designed to be embedded
 * in iframes on external websites.
 *
 * Features:
 * - Dynamic route with agentId parameter
 * - Validates agentId exists and is non-empty
 * - Minimal UI optimized for iframe embedding
 * - Transparent background support
 * - No navigation or surrounding chrome
 *
 * Route: /embed/[agentId]
 *
 * @example
 * /embed/agent-123
 * /embed/my-support-agent
 *
 * Embedding in external site:
 * ```html
 * <iframe
 *   src="https://yourdomain.com/embed/agent-123"
 *   width="400"
 *   height="600"
 *   frameborder="0"
 *   allow="clipboard-write"
 * ></iframe>
 * ```
 */
export default async function EmbedChatPage({ params }: PageProps) {
  const { agentId } = await params;

  // Validate agentId exists and is not empty
  if (!agentId || agentId.trim() === '') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-transparent px-4">
        <div className="w-full max-w-md rounded-xl border border-red-100 bg-white/90 p-5 text-center shadow-sm backdrop-blur">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5.07 19h13.86a1.2 1.2 0 001.04-1.8L13.04 4.2a1.2 1.2 0 00-2.08 0L4.03 17.2A1.2 1.2 0 005.07 19z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Invalid agent ID</h1>
          <p className="mt-1 text-sm text-gray-600">
            The agent ID is missing or malformed. Update the embed URL and reload.
          </p>
        </div>
      </div>
    );
  }

  // Render the client component with the validated agentId
  return <EmbedChatClient agentId={agentId} />;
}
