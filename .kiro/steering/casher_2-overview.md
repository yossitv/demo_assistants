# casher_2 Overview

## What is casher_2
- A Next.js 15 app for a cafe-style self-order kiosk with multilingual support (JA/EN) and a “call staff” flow powered by Tavus conversations.
- Includes two UI modes:
  - **casher_1**: customized layout (Halloween theme extras, sticky cart, extended product catalog).
  - **casher_nomal**: archive-derived layout preserved under a separate route, sharing the same product/catalog and backend.

## Key Routes
- `/casher_1/home` → main kiosk landing (with mode switch button to casher_nomal).
- `/casher_1/order` → products grid, sticky cart/agent panel, proceed to pay/cancel.
- `/casher_1/pay` → cart review, quantity adjust, payment completion → thanks.
- `/casher_1/thanks` → completion screen.
- `/casher_nomal/home|order|pay|thanks` → archive UI using same catalog/backends.
- `/casher_halloween/home` → redirects to `/casher_1/home`.
- `/api/conversations` → start Tavus conversation (context optional, language, defaults).
- `/api/conversations/:id/end` → end Tavus conversation.

## Data & Catalog
- Products are defined in `app/casher_1/data/products.ts` (Akihabara items + original cafe menu). `casher_nomal` re-exports the same array to stay in sync.
- Images live under `public/akiba` and `public/coffee`.
- Cart state persists to `localStorage` (`casher_cart`) in both modes.

## Tavus Integration
- Server-side handlers in `app/api/conversations` and `.../[conversation_id]/end` call Tavus (`TAVUS_API_KEY`, `TAVUS_API_BASE`), with optional context building (`server/context` for local/openai/dedalus).
- Frontend `AgentMeeting` sends `language` and a simple `conversational_context` (cart summary); `context_seed` is not used yet.

## Tech Stack
- Next.js 15, React 19, TypeScript.
- Styling via CSS modules per mode.
- Path alias `@/* -> ./*` (`tsconfig.json`).

## Environment Variables (server)
- `TAVUS_API_KEY` (required), `TAVUS_API_BASE` (default `https://tavusapi.com`), `REPLICA_ID`/`PERSONA_ID` (defaults), `CONTEXT_PROVIDER` (local/openai/dedalus) plus provider-specific keys (`OPENAI_API_KEY`, etc.).

## Testing / Status
- No automated tests in this app. Manual verification recommended: `/casher_1/home` and `/casher_nomal/home` flows; Tavus endpoints with sample payloads.
