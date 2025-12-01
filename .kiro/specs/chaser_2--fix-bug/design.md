# Design Document

## Overview

フロントを変えずにサーバー側へ Tavus 連携を移植する。`app/api/conversations` と `app/api/conversations/[conversation_id]/end` の API ルートを実装し、`server/tavus` と `server/context` のユーティリティで Tavus 呼び出しとコンテキスト生成を行う。既存の Next.js 構成とパスエイリアス `@/* -> ./*` を利用し、すべて JSON レスポンスで返す。

## Components

- **API Routes**
  - `POST /api/conversations`: ボディをバリデート→必要なら Context Builder で `conversational_context` を生成→`handleCreateConversation` 経由で Tavus へ POST→`conversation_url` を返却（Tavus 返却値をそのままパススルー）
  - `POST /api/conversations/:conversation_id/end`: `TAVUS_API_KEY` 必須で Tavus の end エンドポイントへフォワードし、結果を JSON で返却

- **Tavus Layer (`server/tavus`)**
  - `config.ts`: `TAVUS_API_KEY`, `TAVUS_API_BASE`, `REPLICA_ID`, `PERSONA_ID` を読み、ベース URL を正規化
  - `service.ts`: `/v2/conversations` を呼び出し、`conversation_url` を必須として検証
  - `handler.ts`: リクエストのデフォルト値補完（レプリカ/ペルソナ/言語）と入力正規化を行い、`TavusService` に委譲
  - `errors.ts`: HTTP ステータス付きの `TavusError`

- **Context Layer (`server/context`)**
  - `factory.ts`: `CONTEXT_PROVIDER`（local/openai/dedalus）に応じて Builder を選択しキャッシュ
  - `localBuilder.ts`: ダミーの JSON 文字列を生成（フォールバック）
  - `openaiBuilder.ts`: OpenAI Chat Completions を呼び、商品 or SNS 文脈に応じてプロンプトを組み立てる
  - `dedalusBuilder.ts`: Dedalus サイドカーへ POST して `context` 文字列を取得
  - `types.ts`: `ContextSeed` 定義（product/social）と type guard

- **Domain Models (`server/x/domain/models.ts`)**
  - OpenAI/Dedalus 文脈生成で参照する X（旧 Twitter）のユーザー/ポスト型を保持

## Data Flow

1. フロントが `POST /api/conversations` に JSON を送信。
2. ルートで JSON をパースし、`context_seed` があり `conversational_context` が未設定なら Context Builder で生成。
3. `handleCreateConversation` がデフォルト replica/persona/language を補完し `TavusService` へ。
4. `TavusService` が Tavus API に POST し、`conversation_url` を検証してレスポンスを返す（追加フィールドはパススルー）。
5. 終了時は `POST /api/conversations/:id/end` が Tavus の end API を呼び、成功/失敗を JSON で返す。

## Error Handling

- リクエスト JSON パース失敗: 400 `{ error }`
- Context Builder/外部 API エラー: `TavusError` のステータスで `{ error }`、想定外は 500
- Tavus 応答が非 JSON のときも catch して JSON エラーを返し、フロントの `.json()` が落ちないようにする

## Configuration

- 必須: `TAVUS_API_KEY`
- 任意/デフォルト: `TAVUS_API_BASE=https://tavusapi.com`, `REPLICA_ID`, `PERSONA_ID`, `CONTEXT_PROVIDER`（local/openai/dedalus）、`OPENAI_API_KEY` など Builder 用
- 変更時は Next.js 再起動が必要
