import { LanguageProvider } from "./providers/LanguageProvider";
import { FlowProvider } from "./providers/FlowProvider";
import { CartProvider } from "./providers/CartProvider";
import { ConversationProvider } from "./providers/ConversationProvider";

export default function CasherNomalLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <FlowProvider>
        <CartProvider>
          <ConversationProvider>
            {children}
          </ConversationProvider>
        </CartProvider>
      </FlowProvider>
    </LanguageProvider>
  );
}
