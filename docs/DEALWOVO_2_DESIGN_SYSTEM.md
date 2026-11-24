# Dealwovo 2.0 — Premium Hybrid Design System
Status: **Preview design proposal**, not approved for production.

## Creative direction
Option C: the bold, animated original **OH, THE POSSIBILITIES** discovery hero stays intact and moves to the main homepage. Subsequent surfaces become calmer editorial commerce: cream background, rich midnight typography, lavender highlights, restrained lime calls-to-action. The entire storefront shares one navigation, footer, responsive grid, and typography system.

## Core color roles
- Midnight/ink: `#0D0B18` / `#181426` — hero, footer and contrast surfaces.
- Warm paper: `#F7F4EF` / `#FFFDF9` — Shop, Gift Finder, editorial category pages.
- Violet accent: `#7D5BD3` — editorial emphasis and secondary navigation.
- Lavender: `#E6DAFA` — premium background accents.
- Electric lime: `#E6FF78` — primary calls-to-action and familiar WOW cues.
- Muted ink: `#6B6478` — supporting copy on warm paper.

## Information architecture
- `/`: immersive WOW hero, four curated discovery categories, gifting editorial, genuine live-catalog component or honest prelaunch state, trust commitments and final discovery CTA.
- `/shop`: warm-paper editorial hero, three category paths and **existing live** Supabase-backed verified-offers component.
- `/gifts`: redesigned guided inspiration with working recipient, occasion, budget and interest filters, result count, no-match state, and transparent prelaunch limitations.
- `/trending`, `/essentials`, `/deals`: shared editorial page template with tailored photography, section headings, and functional links.
- `/product/[slug]`: same existing verified data and outbound link logic, refined lighter product presentation.
- `/admin`, `/admin/imports`, `/admin/quality`: all preserved and isolated from public redesign.

## Interaction principles
- Discover rather than overwhelm: use one clear next-step CTA per feature.
- Do not fabricate product prices, savings, popularity, customer reviews, partnerships or conversion statistics.
- Preserve manual category selection, reduced-motion behavior and pause control in the original WOW hero.
- Shared mobile menu with keyboard Escape, aria-expanded, aria-current and inert closed state.
- Accessible skip-to-content link and visible focus outlines. No motion-dependent hidden information.
- Pages remain noindex during prelaunch. Do not connect checkout or publish offers automatically.

## Acceptance checks for final production approval
1. Desktop widths: 1280px and 1440px, high-density screens, 200% zoom.
2. Mobile widths: 320px, 375px, 390px, 430px and 768px; confirm typography, product cards and header menu do not overflow.
3. Keyboard-only navigation, Escape-to-close menu, pause/resume WOW, gift filter results, focus order and semantic headings.
4. Reduced-motion mode and visible content when JS is disabled or slow.
5. Source images render and have appropriate alt text; confirm licensing and reliability for production.
6. Real login, catalog CRUD, import queue, owner-only feed authorization, offer pausing, and outbound verification independently tested.
7. Real approved product shows in `/shop` and homepage verified catalog; product page, current-offer outbound redirect and expired-offer 404 tested.
8. Resolve Supabase Auth leaked-password protection warning before production.
9. Verify site-wide performance and WCAG contrast with browser-based tooling; source and route checks alone do not establish visual QA.
10. **No merge, alias move or production environment changes without explicit founder release approval.**

## Work record
Implementation branch: `feature/dealwovo-2-premium-hybrid`, derived from `feature/phase4d-offer-quality-command` and therefore retains catalog, affiliate feed intake and offer-quality controls.
