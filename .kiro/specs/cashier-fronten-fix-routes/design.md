# Design
- Move the app directory from `app/casher_1` to `app/cashier` to align folder and route names.
- Point the root route to `/cashier` and set `/cashier` to redirect to `/cashier/home` for a consistent entry point.
- Replace hardcoded paths and imports referencing `/casher_1/*` with `/cashier/*` across cashier-related pages and dependent routes (e.g., Halloween redirect, normal product data import).
- Avoid legacy redirects for `/casher_1/*` to enforce the new canonical path structure.
