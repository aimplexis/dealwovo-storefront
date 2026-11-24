# Dealwovo: rotating discovery hero and deployment repair

## Implemented
- Restored a complete Next.js 16 / React 19 / TypeScript app in the GitHub branch.
- Recovered the original Next.js package, TypeScript configuration, health endpoint and informational routes from the last working Vercel preview.
- Reconstructed the dark storefront home, category pages and Gift Finder, integrated the accessible rotating hero.
- Featured images link to real in-site routes: /trending, /gifts and /essentials.
- Auto-rotation pauses on hover, focus, hidden tab or offscreen. Visitors can pause/resume, manually select categories and use previous/next controls.
- No unverified merchant products, inventory or prices.

## Validation (Git-connected Vercel preview)
- Deployment dpl_31jtibeBF6kiLcxHvX2XvwZjXDUf — READY.
- Next.js compiled, TypeScript completed, all 14 pages generated.
- GET /, /gifts, /trending, /essentials, /deals, /about, /contact, /affiliate-disclosure, /privacy, /terms, /api/health returned HTTP 200.
- Browser layout and interaction testing remains recommended before production release.

## Important
This is a reconstructed source-controlled storefront, not an exact byte-for-byte copy of the prior Vercel-only editorial prototype. Review the preview before releasing to dealwovo.com. The existing custom domain is still on the previous production deployment.
