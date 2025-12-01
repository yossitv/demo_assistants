import { Product } from "../types";

export const PRODUCTS: Product[] = [
  {
    id: "coffee",
    name: { ja: "コーヒー", en: "Coffee" },
    description: { ja: "エチオピア産スペシャルティコーヒー", en: "Ethiopian specialty coffee" },
    price: 500,
    image: "/coffee/d72a4d8bf81f10b27c788eddd93f2bc475df03e8.png",
  },
  {
    id: "tea",
    name: { ja: "紅茶", en: "Tea" },
    description: { ja: "アールグレイ紅茶", en: "Earl Grey tea" },
    price: 450,
    image: "/coffee/4b98e757b0c304e02dc8c2705310e950d669c4e6.png",
  },
  {
    id: "sandwich",
    name: { ja: "サンドイッチ", en: "Sandwich" },
    description: { ja: "ハムとチーズのサンドイッチ", en: "Ham and cheese sandwich" },
    price: 800,
    image: "/coffee/041a9edb51a746b3638bf7b5ede61c91d43f0834.png",
  },
  {
    id: "cake",
    name: { ja: "ケーキ", en: "Cake" },
    description: { ja: "チョコレートケーキ", en: "Chocolate cake" },
    price: 600,
    image: "/coffee/078efa6d4c2967a8ae16c3c79a44efd464610b9c.png",
  },
];
