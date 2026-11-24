# Dealwovo rotating discovery hero

## Integration

This branch adds an accessible, interactive rotating category hero that navigates to real existing category routes. The implementation is purposely isolated because the GitHub repository did not yet contain the source of the current Vercel-deployed storefront.

To integrate after the source is synchronized:

1. Import `RotatingDiscoveryHero` from `src/components/RotatingDiscoveryHero` in the homepage.
2. Render `<RotatingDiscoveryHero />` as the **sole** primary hero. Remove or hide the old Vercel-only `PulseHero` to avoid duplicate H1s and competing animations.
3. Keep the live site unchanged while running a Vercel preview build and manual mobile/desktop review.
4. Ensure `/trending`, `/gifts`, and `/essentials` are live before enabling production traffic.

The component supports manual category tabs, previous/next arrows, a pause/resume control, keyboard focus and descriptive links, reduced-motion preferences, automatic pause when offscreen or tab-hidden, and pause on hover/focus. User manual selection pauses auto-rotation. Images are illustrative; no prices, offers, or inventory are claimed.

**Source-of-truth caution:** The repository originally contained no storefront files. Do not merge into the production branch or deploy this branch as a full storefront until the current Vercel preview source is synchronized. The currently approved Vercel preview remains untouched.
