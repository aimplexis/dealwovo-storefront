# Dealwovo

Source-controlled Next.js shopping-discovery storefront and Phase 3 affiliate catalog foundation.

- Website: https://dealwovo.com
- Local development: `npm install && npm run dev`
- Phase 3 setup: [docs/PHASE3_SETUP.md](docs/PHASE3_SETUP.md)
- Catalog schema: `supabase/migrations/`
- Public catalog: `/shop`
- Protected staff administration: `/admin/login`

This project is affiliate-first. Product offers are suppressed until retailer, product, category, and offer approval plus time-limited verification. No in-house checkout is active. Admin access is granted explicitly via Supabase SQL Editor. Never commit `.env` credentials.
