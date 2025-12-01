# Requirements Document

## Introduction

casher_2 の商品カタログに秋葉原店舗向けアイテムを追加し、UI から選択・注文できるようにする。既存の静的商品リスト (`app/casher_1/data/products.ts`) に新商品を追加し、画像パスは `/akiba/` 配下を参照する。

## Requirements

### Requirement 1: 商品データの追加

**User Story:** ユーザーとして、新しい秋葉原限定アイテムを一覧で見てカートに追加したい。

#### Acceptance Criteria

1. WHEN `/casher_1/order` を開く THEN 既存商品に加えて指定の新商品が並び、名称と価格が正しく表示される。
2. WHEN 商品カードをタップ THEN カートに追加され、数量調整が機能する（既存挙動を踏襲）。
3. WHEN 言語を切替 THEN `name` と `description` が日英対応で表示される。
4. EACH 新商品 SHALL have an image path under `/akiba/…` so assets can be provided later withoutコード変更。

### Requirement 2: データモデル整合性

**User Story:** 開発者として、既存の `Product` 型と UI ロジックを壊さずに新商品を差し込みたい。

#### Acceptance Criteria

1. ALL 新商品 SHALL conform to `Product` 型（id, name, description, price, image）。
2. ALL prices SHALL be numeric and match要件: 3,300円 / 6,600円 / 8,800円 / 1,000円 / 29,980円 / 3,300円 / 174,900円 / 9,900円 / 12,100円 / 1,300円 / 700円。
3. NO additional API or backend changes SHALL be required; data stays static in `products.ts`。

### Requirement 3: 既存 UX の維持

**User Story:** 店舗スタッフとして、UI の挙動やスタイルが変わらないまま商品だけ増やしたい。

#### Acceptance Criteria

1. UI コンポーネントのコード変更なしで商品が表示される（`ProductList` の既存マッピングを活用）。
2. カート計算や数量調整の挙動が既存商品と同等に動作する。
3. 追加に伴いビルドエラーや型エラーが発生しない。
