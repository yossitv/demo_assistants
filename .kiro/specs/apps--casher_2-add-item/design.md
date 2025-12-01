# Design Document

## Overview

既存の静的カタログ `app/casher_1/data/products.ts` に秋葉原向け商品を追加する。フロントロジック（`ProductList`/`CartProvider`）はそのまま利用し、データの多言語フィールドと価格を定義するのみ。画像は `/akiba/` 配下のプレースホルダーを参照する。

## Data Model

- `Product` 型: `id`, `name {ja,en}`, `description {ja,en}`, `price`, `image?`
- 新規商品 ID 一覧:
  - `re-sozo-figure`
  - `joy-cart-short`, `joy-cart-day`
  - `arm-hoodie`
  - `fiberion-experience`
  - `robosen-collector-set`
  - `jellyfish-robot`
  - `robosen-bumblebee`
  - `mini-hack-base`, `mini-hack-set`
  - `curry-land`
  - `akiba-doujin`

## Rendering

- `ProductList` が `PRODUCTS` をマップする既存挙動を維持するため、コード変更不要。
- 画像パスは `/akiba/*.png` を参照（アセット未配置でもビルドは通る想定）。後で `public/akiba` に追加可能。

## Error Handling / Compatibility

- 型を満たす静的データ追加のみのため、API 変更なし・既存 UI 互換を維持。
- 価格は数値で定義し、カート計算に即時反映される。
