import { Product } from "../types";

export const PRODUCTS: Product[] = [
  {
    id: "coffee",
    name: { ja: "コーヒー", en: "Coffee" },
    description: { ja: "エチオピア産スペシャルティコーヒー", en: "Ethiopian specialty coffee" },
    price: 500,
    image: "/images/coffee.svg",
  },
  {
    id: "tea",
    name: { ja: "紅茶", en: "Tea" },
    description: { ja: "アールグレイ紅茶", en: "Earl Grey tea" },
    price: 450,
    image: "/images/tea.svg",
  },
  {
    id: "sandwich",
    name: { ja: "サンドイッチ", en: "Sandwich" },
    description: { ja: "ハムとチーズのサンドイッチ", en: "Ham and cheese sandwich" },
    price: 800,
    image: "/images/sandwich.svg",
  },
  {
    id: "cake",
    name: { ja: "ケーキ", en: "Cake" },
    description: { ja: "チョコレートケーキ", en: "Chocolate cake" },
    price: 600,
    image: "/images/cake.svg",
  },
];
