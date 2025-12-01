# Requirements Document

## Introduction

casher_2 に「ノーマルモード」ルート `casher_nomal` を追加し、過去アーカイブの `/casher_1` 実装（`private/extracted_466655b86097a3566ac67079d4bac66244e18cb9/src/app/casher_1`）をベースに配置する。既存の `casher_1`（改造版）と共存させつつ、同じ商品データで表示・注文できるようにする。

## Requirements

### Requirement 1: ルートとページ構成

**User Story:** 利用者として、`/casher_nomal/home` からノーマルモードの UI にアクセスしたい。

#### Acceptance Criteria

1. WHEN `GET /casher_nomal/home` THEN アーカイブ由来のホーム画面が表示される（言語切替含む）。
2. WHEN `GET /casher_nomal/order` THEN 商品リストとカート UI が表示され、注文フローを完了できる。
3. WHEN `GET /casher_nomal/pay` THEN 支払い確認画面に遷移し、完了後 `thanks` に進める。
4. THE 新ルートは既存の `/casher_1` と独立して動作し、URL 競合を起こさない。

### Requirement 2: データおよび表示の整合

**User Story:** ノーマルモードでも現行 casher_2 と同じ商品を見て選びたい。

#### Acceptance Criteria

1. THE 商品データは現行 `app/casher_1/data/products.ts` と同じ内容を表示する（同じ名称/説明/価格/画像パス）。
2. WHEN 商品を追加/数量変更 THEN カート計算と表示が現行と一致する。
3. THE 画像パスは `public/akiba/` および `public/coffee/` を参照し、ビルドエラーなく表示できる。

### Requirement 3: 実装移植と依存関係

**User Story:** 開発者として、アーカイブ UI を casher_2 に安全に取り込みたい。

#### Acceptance Criteria

1. THE アーカイブの `app/casher_1` 配下のコンポーネント/スタイル/プロバイダーを `app/casher_nomal` 配下に移植し、ビルドが通る。
2. THE 依存するサーバー・API ルート（`/api/conversations` 等）は既存 casher_2 実装を再利用し、追加のバックエンド変更を不要とする。
3. WHEN ノーマルモードを開発/ビルドしても既存 casher_2 の動作に副作用を与えない（共有コンポーネントやパスは衝突させない）。

### Requirement 4: UX・機能パリティ

**User Story:** 利用者として、改造版と同等の注文・言語切替・会話呼び出し体験を得たい。

#### Acceptance Criteria

1. WHEN 言語を切り替える THEN 文言が日英で更新される（ホーム/注文/支払い/サンクス）。
2. WHEN 「店員を呼ぶ」を実行 THEN 現行と同じ API を呼び出し、iframe で会話を埋め込める。
3. WHEN 注文フローを完了 THEN サンクス画面に到達し、カートがリセットされる。

