# Design Document

## Overview

アーカイブの `/casher_1` UI を新ルート `casher_nomal` として casher_2 に移植する。ディレクトリを `app/casher_nomal` 配下にコピーし、商品データは現行 `app/casher_1/data/products.ts` を参照させる。API は既存の `/api/conversations` など casher_2 側の実装を再利用する。

## Directory Layout

- `app/casher_nomal/**`: アーカイブ `src/app/casher_1` から移植（home/order/pay/thanks、providers/components/stylesなど）
- `app/casher_nomal/data/products.ts`: 現行 casher_2 の `app/casher_1/data/products.ts` を参照またはコピー（同一内容を保証）
- `app/casher_nomal/providers/*`: アーカイブのコンテキストを移植（Cart/Language/Conversation など）
- `app/casher_nomal/styles.*`: アーカイブのスタイルを移植し、パス衝突を避ける
- 既存の API ルート: `/api/conversations`, `/api/conversations/[conversation_id]/end` を流用

## Routing

- `app/casher_nomal/home/page.tsx`
- `app/casher_nomal/order/page.tsx`
- `app/casher_nomal/pay/page.tsx`
- `app/casher_nomal/thanks/page.tsx`
- `app/page.tsx` は既存のリダイレクトを維持し、ノーマルモードには直接アクセスで到達する

## Data & State

- 商品データ: 現行と同じ `PRODUCTS` 配列を使用（同ファイルをコピーまたは import で共有）
- カート/言語/会話の状態は `app/casher_nomal/providers` に移植された Provider で管理（アーカイブ準拠）
- スタイルクラスは `casher_nomal` 配下で完結させ、既存 `casher_1` と名前衝突しないようにする（CSS Module 名を変えないがフォルダで分離）

## Integration

- 「店員を呼ぶ」は既存の `/api/conversations` を叩くため、移植先でも同パスを使用
- 画像パスは `public/akiba/` / `public/coffee/` をそのまま参照し、ビルドエラー回避

## Compatibility / Risks

- アーカイブコードで使用するパスエイリアスが現行 tsconfig (`@/* -> ./*`) で解決するか確認
- 共有型/関数をコピーする際に名前衝突がないよう `casher_nomal` 配下で完結させる
- UI 表示はアーカイブ準拠だが、商品データは現行に合わせて差し替える
