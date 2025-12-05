import { Product } from "../types";

export const PRODUCTS: Product[] = [
  {
    id: "jellyfish-robot",
    name: { ja: "Jellyfish Robot", en: "Jellyfish Robot" },
    description: {
      ja: "TikTokでバズり中のミニロボ。立てればダンス、寝かせれば前進。単3電池3本付きですぐ遊べる。",
      en: "Viral mini bot: dances upright, crawls when laid down, redirects on obstacles. Comes with AA batteries.",
    },
    price: 3300,
    image: "/akiba/jellyfishrobot.jpeg",
  },
  {
    id: "mini-hack-base",
    name: { ja: "ミニHack！本体のみ", en: "Mini Hack! Base Kit" },
    description: {
      ja: "ワイルドミニ四駆をスマホ操縦に改造できるキット。はんだ付け不要、組み立てだけで遊べます。",
      en: "Convert Wild Mini 4WD for smartphone control. No soldering; just assemble and drive.",
    },
    price: 9900,
    image: "/akiba/mini_hack.jpeg",
  },
  {
    id: "fiberion-experience",
    name: { ja: "ファイバリオン操縦体験", en: "Fiberion Control Experience" },
    description: {
      ja: "開発中の変形ロボをグローブで操縦＆記念撮影。ステッカー付き、体験収益は開発資金に。",
      en: "Pilot the transforming robot prototype with gloves + photo & sticker. Proceeds support development.",
    },
    price: 1000,
    image: "/akiba/fivarion_controle.jpeg",
  },
  {
    id: "joy-cart-short",
    name: { ja: "JOYカートレンタル（2時間まで）", en: "JOY Cart Rental (up to 2h)" },
    description: {
      ja: "折り畳みできる免許不要の電動カート。最高6km/hで屋内外走行可。充電器付き、初回レクチャーあり。",
      en: "Foldable, license-free electric cart. Up to 6 km/h, indoor/outdoor, charger included, with quick lesson.",
    },
    price: 3300,
    image: "/akiba/joy_cart_rental.jpeg",
  },
  {
    id: "joy-cart-day",
    name: { ja: "JOYカートレンタル（1DAY）", en: "JOY Cart Rental (1 Day)" },
    description: {
      ja: "2時間超～閉店までの1DAYプラン。航続13kmで坂道も安心、スーツケースサイズに折り畳み可能。",
      en: "Day plan beyond 2 hours until close. ~13km range, hill-capable, folds to suitcase size.",
    },
    price: 6600,
    image: "/akiba/joy_cart_rental.jpeg",
  },
  {
    id: "re-sozo-figure",
    name: { ja: "3Dプリントインスタントフィギュア「Re:創造」", en: "3D Instant Figure “Re:Sozo”" },
    description: {
      ja: "最短1時間で自分のフィギュアを作成。全身写真からAIで3Dデータ化し店内で出力、色は1色選択可。",
      en: "Get your own figure in about an hour. AI builds 3D data from a full-body photo; printed on-site with one color of your choice.",
    },
    price: 3300,
    image: "/akiba/3d_print_figure_re_souzou.jpeg",
  },
  {
    id: "arm-hoodie",
    name: { ja: "ARMオリジナルパーカー", en: "ARM Original Hoodie" },
    description: {
      ja: "秋葉原モチーフの限定デザイン。ゆったりフリーサイズ（XL相当）、数量限定で再販なし。",
      en: "Akihabara-themed limited hoodie. Relaxed one-size (XL-ish), limited run, no restock.",
    },
    price: 8800,
    image: "/akiba/parker.jpeg",
  },
  {
    id: "robosen-collector-set",
    name: { ja: "Robosenミニロボ コレクターズセット", en: "Robosen Mini Robot Collector Set" },
    description: {
      ja: "トイ・ストーリー30周年記念セット。ベースにキャラを挿し替え多彩なアクションとサウンドを再生。",
      en: "Toy Story 30th anniv. mini robot set. Swap characters on a base for actions & sounds; create/share moves.",
    },
    price: 29980,
    image: "/akiba/robosen.jpeg",
  },
  {
    id: "robosen-bumblebee",
    name: { ja: "Robosen フラッグシップバンブルビー", en: "Robosen Flagship Bumblebee" },
    description: {
      ja: "公式ライセンスの完全自動変形バンブルビー。高光沢塗装でVWビートルへ変形、プログラミング対応。",
      en: "Official fully auto-transforming Bumblebee. High-gloss VW Beetle mode, programmable motions.",
    },
    price: 174900,
    image: "/akiba/robosen.jpeg",
  },
  {
    id: "curry-land",
    name: { ja: "カレーランドのカレーですよ", en: "Curryland Signature Curry" },
    description: {
      ja: "累計約2万食のご当地レトルト。黒毛和牛とクリームチーズの贅沢な味わいでおみやげに最適。",
      en: "Tokyo-favorite retort curry with premium wagyu and cream cheese—bestseller souvenir.",
    },
    price: 1300,
    image: "/akiba/curry.jpeg",
  },
  {
    id: "akiba-doujin",
    name: { ja: "同人誌「秋葉三尺坊の大冒険」", en: "Doujin: Akiba Sanjakubou Adventure" },
    description: {
      ja: "秋葉原の源流を辿るB5判32Pファンブック。マンガ・訪問記・ポストカード付き。",
      en: "B5/32p fanbook tracing Akihabara origins. Includes manga, travel notes, and postcard.",
    },
    price: 700,
    image: "/akiba/book.jpeg",
  },
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
  {
    id: "mini-hack-set",
    name: { ja: "ミニHack！ワイルドミニ四駆セット", en: "Mini Hack! Wild Mini 4WD Set" },
    description: {
      ja: "改造キットとワイルドミニ四駆がセットですぐ遊べる。スマホアプリ不要、簡単操作。",
      en: "Bundle with kit + Wild Mini 4WD so you can play immediately. No app install needed.",
    },
    price: 12100,
    image: "/akiba/minihack-set.jpeg",
  },
];
