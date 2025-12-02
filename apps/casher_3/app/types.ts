export interface Product {
  id: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  price: number;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Language = "ja" | "en";

export interface AvatarState {
  isExpanded: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  conversationUrl: string | null;
  conversationId: string | null;
  error: string | null;
}
