# apps--casher_3-mtg-modify / tasks

## 実装タスク
1. 仕様反映の調査
   - `apps/casher_3/app/casher_1/order/page.tsx` と `components/AgentMeeting.tsx` の現状実装を確認。
   - 依存プロバイダ（Language, Cart, Conversation）の初期化と使用箇所を整理。

2. 共有 iframe コンポーネントの追加
   - `SharedAgentIframe`（または既存 SharedAvatarIframe を流用/rename）を用意し、allow 属性を既存と同等に設定。
   - CSS Modules で `.sharedAgentWrapper :global(.sharedAgentIframe)` のスタイルを追加。

3. `AgentMeeting` のリファクタ
   - 状態: `conversationUrl`, `conversationId`, `isConnected`, `isExpanded`, `loading`, `error`, `autoCollapseTimer` を管理。
   - 接続成功時に `isExpanded=true` で開始し、5,000ms タイマーで `isExpanded=false` にする。
   - iframe はポータルで 1 度だけマウントし、`expanded`/`floating`/`hidden` クラス切替で表示サイズを制御。
   - オーバーレイ（拡大時のみ）とミニヒットエリア（縮小時のみ）を追加し、クリックで expand/collapse。
   - 終了/キャンセル時に `/api/conversations/{id}/end` を呼び、state を初期化。

4. スタイル調整
   - `.sharedAgentWrapper`, `.sharedAgentExpanded`, `.sharedAgentFloating`, `.sharedAgentHidden`, `.sharedAgentChrome`, `.agentOverlay`, `.agentMiniHit` などを追加。
   - トランジションを設定し、拡大→縮小が滑らかになるようにする。

5. テスト・確認
   - 接続後に大画面表示 → 5 秒後に自動ミニ表示になることを手動確認。
   - ミニクリックで再拡大することを確認。
   - iframe が拡大/縮小で再生成されないことを React DevTools/ログで確認。
   - 既存のエラー/ローディング/キャンセル動作が保たれていることを確認。

## 注意点
- CSS Modules の `:global()` はローカルクラスにスコープする（例: `.sharedAgentWrapper :global(.sharedAgentIframe)`）。
- iframe ノードは条件付きレンダーで破棄しない。
- タイマーは拡大状態でのみセットし、クリーンアップを忘れない。
- 既存の API 呼び出し（/api/conversations）と ConversationContext のセット/クリアを崩さない。
