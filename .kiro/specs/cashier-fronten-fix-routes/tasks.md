# Tasks
- Renamed folder `app/casher_1` to `app/cashier`.
- Updated `app/page.tsx` redirect to `/cashier` and `app/cashier/page.tsx` redirect to `/cashier/home`.
- Replaced all navigation targets from `/casher_1/*` to `/cashier/*` (home, order, pay, thanks, etc.).
- Adjusted dependent imports/redirects: `app/casher_nomal/data/products.ts` now imports from `app/cashier/data/products`; `app/casher_halloween/home/page.tsx` redirects to `/cashier/home`.
- Verified no remaining `/casher_1` references in the app (excluding build artifacts).
