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
  - state: `conversationUrl`, `conversationId`, `isConnected`, `isExpanded`, `autoCollapseTimer`, 既存の `loading`/`error`。  
  - 接続成功時に `isExpanded=true` で開始し、5,000ms タイマーで `isExpanded=false` にする。  
  - iframe 本体はポータルで 1 度だけマウントし、`expanded`/`floating`/`hidden` クラス切替で表示サイズを制御。  
  - オーバーレイ（拡大時のみ）とミニヒットエリア（縮小時のみ）を追加し、クリックで expand/collapse。  
  - 終了/キャンセル時に `/api/conversations/{id}/end` を呼び、state を初期化。

## スタイル案（CSS Modules）
- `.sharedAgentWrapper` (fixed, z-index 高, overflow hidden, box-shadow)
- `.sharedAgentExpanded` (中央・大サイズ)
- `.sharedAgentFloating` (右下・小サイズ)
- `.sharedAgentHidden` (opacity 0 + pointer-events none)
- `.sharedAgentWrapper :global(.sharedAgentIframe)` で 100%/100% にフィット
- `.sharedAgentChrome` でボタン類を載せるレイヤを absolute に重ねる
- `.agentOverlay` は拡大時の背景 dim 用
- `.agentMiniHit` はミニ表示クリック用の透明ヒットエリア
- トランジション: width/height/transform/opacity を 0.2〜0.3s

## 状態・ロジック
- 接続成功時:  
  - `conversationUrl`/`conversationId` セット  
  - `isConnected=true`, `isExpanded=true`  
  - オート縮小タイマー開始（5,000ms）→ `setExpanded(false)`
- 手動縮小:  
  - オーバーレイクリックで `setExpanded(false)`
- 再拡大:  
  - ミニヒットエリアクリックで `setExpanded(true)`（必要ならタイマー再設定）
- 切断:  
  - `/api/conversations/{id}/end` 呼び出し → state 初期化（iframe hidden）

## 代替案・却下
- ポップアップとミニで別 iframe を条件レンダーする案: セッションが毎回切れるため却下。  
- className ではなく条件付きレンダーでサイズ切替: 同上の理由で却下。
