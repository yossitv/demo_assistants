# Implementation Plan

- [x] Update catalog data
  - Append new Akihabara items to `app/casher_1/data/products.ts` with bilingual `name`/`description`, numeric `price`, and `/akiba/` image paths.
  - _Requirements: 1.1–1.4, 2.1–2.3_

- [x] Provide assets (optional)
  - Confirmed images exist under `public/akiba/` and wired the new items to those JPEGs.
  - _Requirements: 1.4_

- [ ] Smoke check (manual)
  - Run `npm run dev`, open `/casher_1/order`, verify items render, language toggle works, add/remove behaves as existing products.
  - _Requirements: 1.1–1.3, 3.1–3.3_
