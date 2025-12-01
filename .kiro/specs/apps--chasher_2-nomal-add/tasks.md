# Implementation Plan

- [ ] Create new route scaffold
  - Add `app/casher_nomal` directory with home/order/pay/thanks/layout/globals as needed.
  - Ensure `app/page.tsx` remains unchanged (redirect to existing casher_1).
  - _Req: 1.1–1.4_

- [ ] Port archive UI
  - Copy components/providers/styles from `private/extracted_466655b86097a3566ac67079d4bac66244e18cb9/src/app/casher_1` into `app/casher_nomal`.
  - Adjust imports to use `@/*` or relative paths to avoid collisions with existing casher_1.
  - _Req: 1.1–1.4, 3.1–3.3_

- [ ] Align product data
  - Point `app/casher_nomal/data/products.ts` to the current `app/casher_1/data/products.ts` (copy or import) so catalog stays in sync.
  - Verify images resolve via `public/akiba` and `public/coffee`.
  - _Req: 2.1–2.3_

- [ ] Wire providers and API calls
  - Ensure Cart/Language/Conversation providers are included in the layout.
  - Confirm “Call staff” uses existing `/api/conversations` endpoints without new backend changes.
  - _Req: 3.2, 4.1–4.3_

- [ ] Smoke test (manual)
  - Run `npm run dev`, check `/casher_nomal/home → order → pay → thanks` flows, language toggle, cart totals, staff call iframe.
  - _Req: 1.1–1.4, 2.2, 4.1–4.3_
