import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AgentProvider } from "@/lib/context/KnowledgeContext";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "RAG Chat Assistant",
  description: "AI-powered chat assistant with knowledge base integration",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AgentProvider>
          {/* Skip to main content link for keyboard navigation */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
          >
            Skip to main content
          </a>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </main>
          </div>
        </AgentProvider>
      </body>
    </html>
  );
}
