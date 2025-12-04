import { CartProvider } from "./providers/CartProvider";
import { LanguageProvider } from "./providers/LanguageProvider";
import { ConversationProvider } from "./providers/ConversationProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

export default function CasherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          <ConversationProvider>
            {children}
          </ConversationProvider>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
