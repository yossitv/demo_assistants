# cashier-frontend

Next.js 16 製のセルフオーダー UI。カフェのキオスクを想定し、Tavus のアバター接客と多言語対応（日本語/英語）を備えたデモフロントエンドです。

## 画面とフロー
- `/cashier/home` … ブランドヒーロー。言語切替と「Start Order」ボタン。
- `/cashier/order` … 商品カードで注文追加、右カラムにカートと Tavus への「店員呼び出し」。カート内容を会話コンテキストに載せて Tavus を起動。
- `/cashier/pay` … 価格確認・数量調整と支払い確定。完了時に Tavus セッションを終了。
- `/cashier/thanks` … サンクス表示後にホームへ自動遷移。
- `/casher_nomal/*` … 旧デザインの簡易フロー。`/casher_halloween` は `/cashier/home` のエイリアス。

## 主な特徴
- 日本語/英語の即時切替（`LanguageProvider`）。選択は `localStorage` に保存。
- カート状態のローカル永続化（`casher_cart` キー）。
- Tavus 連携: `/api/conversations` で Tavus API をプロキシし、`PRODUCTS` とカートから生成した「商品ナレッジ」を会話コンテキストとして送信。`NEXT_PUBLIC_TAVUS_AUTO_START=true` で自動接続も可能。
- モード切替: `TavusModeProvider` で default / halloween のレプリカ/ペルソナを切替。`NEXT_PUBLIC_REQUIRE_TAVUS_CONFIG=true` で設定不足を UI で警告。
- コンテキスト生成: `server/context` で `CONTEXT_PROVIDER=local|openai|dedalus` を切替可能。OpenAI / Dedalus 経由のコンテキスト生成に対応。

## ディレクトリの目安
```
app/cashier/*          メインのキオスク UI（ページ、プロバイダ、商品データ）
app/api/conversations  Tavus 連携 API（会話開始/終了）
server/*               Tavus API クライアントと会話コンテキストビルダー
__tests__              fast-check を使ったプロパティテスト
```

## セットアップ
1) 前提: Node.js 18+ / npm 10+  
2) 依存関係を取得
```bash
npm install
```
3) `.env.local` に必要なキーを設定（下記参照）  
4) 開発サーバーを起動
```bash
npm run dev
# http://localhost:3000/cashier へアクセス
```
ビルド: `npm run build` → `npm start`。Lint: `npm run lint`。

## 環境変数
サーバー側（Next API で使用）
- `TAVUS_API_KEY`（必須）: Tavus API キー。
- `TAVUS_API_BASE`（任意）: Tavus API ベース URL。デフォルト `https://tavusapi.com`。
- `REPLICA_ID` / `PERSONA_ID`（任意）: API 呼び出し時のデフォルト ID。
- `CONTEXT_PROVIDER`（任意）: `local`(既定) / `openai` / `dedalus`。  
  - `OPENAI_API_KEY`, `OPENAI_API_BASE`, `OPENAI_CONTEXT_MODEL`（例: `gpt-4o-mini`）  
  - `DEDALUS_CONTEXT_URL`, `DEDALUS_API_KEY`

クライアント側（`NEXT_PUBLIC_`）
- `NEXT_PUBLIC_TAVUS_REPLICA_ID` / `NEXT_PUBLIC_REPLICA_ID`
- `NEXT_PUBLIC_TAVUS_PERSONA_ID` / `NEXT_PUBLIC_PERSONA_ID`
- `NEXT_PUBLIC_TAVUS_HALLOWEEN_REPLICA_ID`, `NEXT_PUBLIC_TAVUS_HALLOWEEN_PERSONA_ID`
- `NEXT_PUBLIC_TAVUS_MODE`（`default`|`halloween`、既定は default）
- `NEXT_PUBLIC_TAVUS_AUTO_START`（`true` でページ読み込み時に自動接続）
- `NEXT_PUBLIC_REQUIRE_TAVUS_CONFIG`（`true` でレプリカ/ペルソナ未設定をエラー表示）

`.env.local` サンプル
```env
TAVUS_API_KEY=your_api_key
TAVUS_API_BASE=https://tavusapi.com
REPLICA_ID=replica_xxx
PERSONA_ID=persona_xxx
CONTEXT_PROVIDER=local
OPENAI_API_KEY=
OPENAI_CONTEXT_MODEL=gpt-4o-mini
NEXT_PUBLIC_TAVUS_REPLICA_ID=replica_xxx
NEXT_PUBLIC_TAVUS_PERSONA_ID=persona_xxx
NEXT_PUBLIC_TAVUS_MODE=default
NEXT_PUBLIC_TAVUS_AUTO_START=false
NEXT_PUBLIC_REQUIRE_TAVUS_CONFIG=true
```

## API エンドポイント（Next 内部）
- `POST /api/conversations`  
  ボディ: Tavus の `replica_id` / `persona_id` / `language` / `conversational_context` または `context_seed`。  
  `context_seed` を渡すと `CONTEXT_PROVIDER` に応じて文脈を生成してから Tavus に転送。
- `POST /api/conversations/:conversation_id/end`  
  進行中の Tavus 会話を終了。

## テスト
- `npm test -- --runInBand` で Jest + fast-check のプロパティテストを実行。  
- 現状 `__tests__/languageSelection.property.test.tsx` と `__tests__/avatarVisibility.property.test.tsx` は旧パス (`app/home`, `app/order`) を参照しているため失敗します。`app/cashier/...` への import 修正が必要です。

## 開発メモ
- 言語は `casher_language`、カートは `casher_cart` で `localStorage` に保存。
- Tavus iframe への postMessage で `conversationEnded` を検知し、自動でセッションを破棄。
- Halloween モードのレプリカ/ペルソナは `NEXT_PUBLIC_TAVUS_HALLOWEEN_*` で切替可能。現在の UI では `/cashier` から利用します。
