import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearth Coffee",
  description: "Cafe self-order kiosk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
