# Dealwovo Phase 3B — Provisioning and Verification (2026-11-24)

## Verified resources
- Supabase project **dealwovo**, ref `pqjoujxjbyinmtsvqtxs` in **us-east-1**, organization `shvcgigvjolbqtyooohq`; status **ACTIVE_HEALTHY**.
- Project cost quoted by Supabase at **$10/month** plus potential usage costs; user explicitly approved this recurring amount before provisioning.
- **Vercel Preview branch only**: `feature/dealwovo-wow-experience`. Two encrypted, branch-specific variables exist: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Production env vars were not modified.
- Preview deployment: `dpl_FZ26cuZMZu4dhEmaHQDuqy51kwWj`, build READY. Preview Shop and Admin Login return HTTP 200; unauthenticated admin route serves sign-in rather than protected data.

## Database migration history and validations
1. `20261124_001_catalog_foundation.sql` — catalog tables, RLS, policies.
2. `20261124_002_audit_triggers.sql` — insert/update/delete audit triggers.
3. `20261124_003_private_function_lockdown.sql` — privileged functions outside exposed public schema.
4. `20261124_004_restrict_catalog_privileges.sql` — CRITICAL least-privilege fix: removed Supabase default TRUNCATE, TRIGGER, REFERENCES and anonymous write privileges.
5. `20261124_005_foreign_key_indexes.sql` — performance advisor missing-FK indexes.

Validation:
- Every catalog table has RLS enabled.
- Anonymous clients have SELECT-only access to public catalog tables, subject to RLS; no catalog modification grants.
- Anonymous users cannot SELECT administrator membership or audit log.
- Non-admin authenticated role cannot grant itself admin membership or forge audit entries.
- SECURITY DEFINER membership and audit helpers reside in `dealwovo_private`.
- Supabase security advisor: **zero security lints**. Performance advisor: non-blocking multiple-permissive-policy and unused-index warnings.
- Transaction-only QA: draft and expired offers stayed invisible to anon and unauthorised users; non-admin INSERT blocked. An authenticated allowlisted synthetic admin created draft category, merchant, product and offer; published/approved them; generated eight audit entries; anonymous role could see the current approved offer. The entire transaction was rolled back.
- Confirmed zero retained administrators, products, categories, merchants, offers, audit entries and test users.

## Remaining release gates
- Create a **real** Supabase Authentication user for the owner through the Supabase Dashboard. Do not share password in ChatGPT.
- Grant that existing auth user's UUID the `owner` role using SQL Editor after verifying identity.
- Sign into Vercel preview `/admin/login`; test actual browser authentication, session refresh/logout, and live CRUD with test content (then remove it).
- Review RLS under real JWTs; implement product media rights checks and approved affiliate merchant feeds.
- Review performance advisor warnings and ensure lockfile/dependency pinning before production.
- Keep production `dealwovo.com` and all production environment variables unchanged until review and explicit release approval.

**Important:** Prelaunch public catalog has zero offers; do not merge preview branches into `main` yet.
