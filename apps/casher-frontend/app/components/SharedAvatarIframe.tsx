"use client";

interface SharedAvatarIframeProps {
  conversationUrl: string;
}

export default function SharedAvatarIframe({
  conversationUrl,
}: SharedAvatarIframeProps) {
  return (
    <iframe
      src={conversationUrl}
      className="sharedAvatarIframe"
      allow="camera; microphone; autoplay; clipboard-read; clipboard-write; display-capture"
    />
  );
}
