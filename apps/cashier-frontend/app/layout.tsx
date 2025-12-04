import "./globals.css";
import { CartProvider } from "./providers/CartProvider";
import { LanguageProvider } from "./providers/LanguageProvider";
import { AvatarStateProvider } from "./providers/AvatarStateProvider";
import { TavusModeProvider } from "./providers/TavusModeProvider";

export const metadata = {
  title: "Casher 3 - AI Avatar Kiosk",
  description: "AI Avatar powered self-order kiosk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <LanguageProvider>
          <CartProvider>
            <TavusModeProvider>
              <AvatarStateProvider>
                {children}
              </AvatarStateProvider>
            </TavusModeProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
