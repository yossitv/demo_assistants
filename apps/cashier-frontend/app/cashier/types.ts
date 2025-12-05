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

export type FlowState = "home" | "order" | "pay" | "thanks";
export type Language = "ja" | "en";
