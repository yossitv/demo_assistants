# apps--casher_3-mtg-modify / tasks

## Implementation Tasks

- [ ] 1. Portal-based iframe化 (AgentMeeting)
  - Modify `apps/casher_3/app/casher_1/components/AgentMeeting.tsx` to follow the single-iframe portal pattern (similar to `AvatarStateProvider`).
  - State: `conversationUrl`, `conversationId`, `isConnected`, `isExpanded`, `loading`, `error`, `autoCollapseTimer`.
  - Use `createPortal` to render iframe into a fixed DOM node (generate/destroy node on mount/unmount).
  - Reuse existing `SharedAvatarIframe` for iframe rendering; ensure allow attrs match existing.
  - Keep `ConversationProvider` integration for `conversationId`.
  - _Requirements: 機能要件 1, 3; 技術要件_

- [ ] 2. Auto-collapse timer
  - `useEffect` to set a 5,000ms timer when `isConnected && isExpanded` after connect; collapse to mini on timeout.
  - Timer should be cleaned up on unmount/state change. Decide and document whether re-expansion restarts the timer (default: allow restart).
  - _Requirements: 機能要件 2_

- [ ] 3. Expand/collapse interactions & overlay
  - Add overlay (expanded only) that collapses on click.
  - Add mini hit-area (floating only) that expands on click.
  - Add chrome layer (expanded only) with close button (collapse) and end-session button (POST `/api/conversations/{id}/end` then reset state).
  - Ensure `pointer-events` on chrome don’t block iframe; hits are routed appropriately.
  - _Requirements: 機能要件 3, 4, 5_

- [ ] 4. CSS adjustments (casher_1 styles)
  - Add/adjust styles in `app/casher_1/styles.module.css`: `.sharedAgentWrapper`, `.sharedAgentExpanded`, `.sharedAgentFloating`, `.sharedAgentHidden`, `.sharedAgentChrome`, overlay/hit-area, transitions.
  - Scope global iframe rule as `.sharedAgentWrapper :global(.sharedAvatarIframe)` (or renamed `.sharedAgentIframe`) to satisfy CSS Modules purity.
  - Reuse existing button styles (`.closeButton`, `.endSessionButton`) or add equivalents locally.
  - _Requirements: 機能要件 4, UI/動きの仕様_

- [ ] 5. Session management integration
  - On connect: `setConversationId(data.conversation_id)`.
  - On end: call `/api/conversations/{id}/end` then `setConversationId(null)` and reset local state.
  - Keep existing error/loading flows intact.
  - _Requirements: 機能要件 6, 技術要件_

- [ ] 6. Order page integration
  - Ensure `order/page.tsx` continues to render `AgentMeeting`; no inline iframe remains inside side stack.
  - The portal-based iframe should appear as a fixed element (not constrained by sideStack).
  - Cart context payload to `/api/conversations` remains unchanged/verified.
  - _Requirements: 対象範囲_

## Testing Checklist
- [ ] Verify iframe appears in expanded state immediately after connection
- [ ] Confirm auto-collapse to mini view after 5,000ms
- [ ] Test clicking mini view expands back to full size
- [ ] Verify iframe DOM node is not recreated during expand/collapse transitions
- [ ] Test end session button properly disconnects and resets state
- [ ] Confirm error states and loading indicators work correctly
- [ ] Verify cart context is properly sent to conversation API

## Notes
- Existing `SharedAvatarIframe` component can be reused as-is
- All required CSS styles already exist in `styles.module.css` (`.sharedAvatar*` classes)
- Pattern is already proven in `AvatarStateProvider` - follow same approach
- API endpoints `/api/conversations` and `/api/conversations/{id}/end` already exist
- Do not modify `ConversationProvider` - only use its context
- Ensure iframe `allow` attribute includes: "camera; microphone; autoplay; clipboard-read; clipboard-write; display-capture"
