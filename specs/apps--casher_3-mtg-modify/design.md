# apps--casher_3-mtg-modify / design

## 全体方針
- `AgentMeeting` の Tavus 埋め込みを「単一 iframe + CSS で拡大/縮小を切替」する構造に置き換える。
- iframe はポータル（またはページ直下の固定位置ノード）に 1 度だけマウントし、UI 状態はラッパーの className を切替するだけで表現する。
- 既存の接続フロー（/api/conversations POST → conversation_url 受領）は流用し、接続直後に `isExpanded=true` へセット、自動縮小タイマーで 5,000ms 後に `isExpanded=false` にする。

## コンポーネント構成案
- `SharedAgentIframe`（新規 or 既存流用）
  - props: `conversationUrl: string`
  - render: `<iframe src=... allow=... className="sharedAgentIframe" />`
- `AgentMeeting`（改修）
  - state: `conversationUrl`, `conversationId`, `isExpanded` (初期 true after connect), `isConnected`, `autoCollapseTimer`.
  - render:
    - 接続前: 既存 UI（ボタン「店員を呼ぶ」等）。
    - 接続後: 透過オーバーレイ（拡大時のみ）＋ミニヒットエリア（縮小時のみ）を描画。
    - iframe 本体はポータルで固定配置し、class を `expanded` / `floating` / `hidden` に切替。
- オーバーレイ
  - `isExpanded` のときだけ表示し、クリックで `setExpanded(false)`。
- ミニヒットエリア
  - 右下固定の透明 div。クリックで `setExpanded(true)`。
- コントロール
  - 拡大時のみ close/end ボタンをラッパー上に絶対配置。`pointer-events` 調整で iframe をブロックしない。

## スタイル案（CSS Modules）
- `.sharedAgentWrapper` (fixed, z-index 高, overflow hidden, box-shadow)
- `.sharedAgentExpanded` (中央・大サイズ)
- `.sharedAgentFloating` (右下・小サイズ)
- `.sharedAgentHidden` (opacity 0 + pointer-events none)
- `.sharedAgentWrapper :global(.sharedAgentIframe)` で 100%/100% にフィット
- `.sharedAgentChrome` でボタン類を載せるレイヤを absolute に重ねる
- `.agentOverlay` は拡大時の背景 dim 用
- トランジション: width/height/transform/opacity を 0.2〜0.3s

## 状態・ロジック
- 接続成功時:
  - `conversationUrl`/`conversationId` セット
  - `isConnected=true`, `isExpanded=true`
  - オート縮小タイマー開始（5,000ms）→ `setExpanded(false)`
- 手動縮小:
  - オーバーレイクリックで `setExpanded(false)`
- 再拡大:
  - ミニヒットエリアクリックで `setExpanded(true)`（タイマー再設定するかは要件に合わせる）
- 切断:
  - `/api/conversations/{id}/end` 呼び出し → state を初期化（iframe hidden）

## 代替案・却下
- ポップアップとミニで別 iframe を条件レンダーする案: セッションが毎回切れるため却下。
- className ではなく条件付きレンダーでサイズ切替: 同上の理由で却下。
