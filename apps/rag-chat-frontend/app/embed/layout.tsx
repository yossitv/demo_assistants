import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Chat Widget",
  description: "Embeddable AI chat widget",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Embed Layout Component
 *
 * Minimal layout for embedded chat widget.
 * This layout overrides the root layout to remove navigation
 * and other chrome, optimizing for iframe embedding.
 *
 * Features:
 * - No navigation bar
 * - Transparent background support
 * - Minimal padding and margins
 * - Optimized for iframe dimensions
 */
export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-transparent"
        style={{ margin: 0, padding: 0, background: 'transparent' }}
      >
        <div className="min-h-[100dvh]">{children}</div>
      </body>
    </html>
  );
}
