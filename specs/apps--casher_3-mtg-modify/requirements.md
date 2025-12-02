# apps--casher_3-mtg-modify / requirements

## 目的
- 店員呼び出し（Tavus/Daily）の iframe セッションを維持しつつ、初回は大画面で表示し、5,000ms 後にミニサイズへ縮小できるようにする。
- iframe を DOM に 1 つだけ保持し、拡大/縮小のたびに再マウントさせないことでセッション切断を防ぐ。

## 対象範囲
- `apps/casher_3/app/casher_1/order/page.tsx` 配下の店員呼び出し UI (`AgentMeeting` の Tavus 埋め込み部分)。
- UI 表示/非表示やサイズ制御のロジック・スタイル。

## 非範囲
- Tavus API のパラメータやバックエンド仕様変更。
- Cart/Language/ConversationContext の仕様変更。
- 新規ルーティング追加。

## 機能要件
1. 単一 iframe の永続化  
   - Tavus/Daily iframe はアプリ起動後に生成した 1 ノードのみを全期間使い回す。  
   - ポップアップ表示/ミニ表示の切替は CSS class の変更のみで行い、条件付きレンダーで iframe を破棄しない。  
   - iframe の src は接続時に一度だけ設定し、切替時は再代入しない。

2. 拡大→自動縮小  
   - 接続成功時: iframe ラッパーを「拡大状態」で表示（画面中央、大サイズ）。  
   - 接続成功から 5,000ms 経過後、自動で「縮小状態」に移行（右下の丸型ミニ）。  
   - 手動縮小も可能（オーバーレイクリックや閉じるボタンがある場合）。

3. 表示状態とトリガー  
   - 拡大表示条件: `conversationUrl` が存在し、接続中 (`isConnected` 相当) で、`isExpanded` フラグ true。  
   - 縮小表示条件: `conversationUrl` が存在し、接続中、`isExpanded` false。  
   - 初回接続時は `isExpanded` を true にセットしてスタート。  
   - ミニ表示をクリックしたら `isExpanded=true` に戻し拡大表示に復帰。

4. ラッパー/オーバーレイ  
   - オーバーレイは拡大表示時のみ表示し、クリックで縮小。  
   - iframe はラッパー要素内に絶対配置され、ラッパーの width/height 100% を占有。  
   - ラッパーのサイズ・位置を CSS で切替（例: `sharedAvatarExpanded` と `sharedAvatarFloating`）。トランジション付き。

5. コントロール/UI  
   - 閉じる/終了ボタンなどのコントロールはラッパー上に配置し、`pointer-events` を適切に制御して iframe と重ならないようにする。  
   - エラーメッセージやローディング状態は既存の `AgentMeeting` UI を踏襲。

6. セッション終了  
   - 既存のキャンセル/終了フローが `conversationId` を持っていれば `/api/conversations/{id}/end` を呼んで state を初期化すること。

## 技術要件
- iframe 生成は 1 回のみ（React コンポーネントの unmount/mount で再生成しない）。  
- CSS Modules を使う場合は `:global()` をローカルクラスにスコープして純粋セレクタ要件を満たす。  
- 状態管理は `isExpanded`/`isConnected`/`conversationUrl` を明示的に持つ。  
- 自動縮小タイマーは拡大表示中のみ作動し、縮小後は再作動しない（再拡大で再セットしてもよい）。  
- ミニ表示ヒットエリアは iframe とは別の透明 div を用意し、クリックで拡大する。

## UI/動きの仕様（デフォルト値の例）
- 拡大: 中央配置、`width: min(90vw, 720px)`, `height: min(82vh, 820px)`, `border-radius: 16px`。  
- 縮小: 右下配置、`width/height: 96px`, `border-radius: 50%`, 位置 `bottom: 100px`, `right: 20px`。  
- 透過/トランジション: `transform/opacity` を 0.2〜0.3s 程度でスムーズ切替。  
- iframe は常に 100% × 100% でラッパーにフィット。

## テスト観点
- 接続直後に大画面表示されること。  
- 5,000ms 後にミニ表示へ自動移行すること。  
- ミニ表示をクリックすると再度大画面に戻ること。  
- 拡大/縮小のたびに iframe DOM が再生成されないこと。  
- セッション切断後は iframe ラッパーを非表示にし、再接続時に同じノードで再利用できること。
