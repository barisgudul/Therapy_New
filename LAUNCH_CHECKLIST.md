# Gisbel — Launch Checklist

Code side is **merged to `main`** and all gates are green
(`npm run lint && npm run typecheck && npm test`, 133 suites).
What remains are steps that need **your account credentials** or the
**Apple Developer Program** membership.

Status legend: [x] done · [ ] you · [~] blocked on Apple Developer account

---

## 0. Merge the branch — [x] DONE

`prod-readiness` merged into `main` (commit `fe5e517`), pushed.

---

## 1. Expo / EAS

- [ ] `eas login` as `barisgudul` (the local session expired — I could not run
      the build). Then:
      ```
      eas build --profile preview --platform ios      # simulator, no Apple acct
      # once you have the Apple Developer account:
      eas build --profile production --platform ios
      eas submit --profile production --platform ios
      ```
- [ ] Fill the real values into `eas.json` → `build.production.env` (or as EAS
      environment variables):
      - `EXPO_PUBLIC_RC_IOS_KEY` — RevenueCat → API keys → iOS app key
        (`appl_…`), created only after the App Store Connect app is linked
      - `EXPO_PUBLIC_SENTRY_DSN` — optional, from a Sentry RN project
      (`EXPO_PUBLIC_ENV`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
      are already in `eas.json`.)
- [ ] Confirm EAS build quota.
- [ ] Provide the notification icon: `assets/images/notification-icon.png`
      (96×96, white opaque silhouette on transparent — no gradients). Then add
      `icon: './assets/images/notification-icon.png'` back to the
      `expo-notifications` plugin config in `app.config.js`.

## 2. Google Play

- [ ] Create the app for `com.barisgudul.gisbel`.
- [ ] Create a Play **service account**, download the JSON, and either place it
      at `credentials/play-service-account.json` (git-ignored) or set it as the
      `GOOGLE_SERVICE_ACCOUNT_KEY` GitHub secret.
- [ ] Set up the **internal testing** track.
- [ ] **Data safety form:** declare email, user-generated text, app activity,
      crash logs, purchase history; "encrypted in transit"; "users can request
      deletion". **Do NOT select any Health/Fitness data type.**
- [ ] Content rating (IARC) questionnaire — answer the mental-health / distressing
      themes questions honestly; not directed at children.
- [ ] Store listing copy must avoid "therapy", "medical", "treatment",
      "diagnos*" — use "wellness companion".
- [ ] Target audience 13+ (16+ in the EEA).
- [ ] Privacy Policy URL (see §6) and account-deletion instructions URL.

## 3. RevenueCat  (project "therapy" / `aaf13e81`)

- [x] Entitlements `gisbel` + `plus` — match `constants/revenuecat.ts`.
- [x] Offerings `default` + `plus` — match `OFFERING_FOR_ENTITLEMENT`.
- [x] Paywalls built + published for both offerings.
- [x] **Webhook → Supabase configured and verified** (test event returned
      HTTP 200, `{"ok":true,"skipped":"TEST"}`). URL
      `https://ijtcqbxagcdgfxrgamis.functions.supabase.co/revenuecat-webhook`,
      `Authorization: Bearer <secret>` where the secret matches the Supabase
      `REVENUECAT_WEBHOOK_SECRET` (already set — §4).
- [~] iOS app configuration — needs App Store Connect (Apple Developer account).
      Once linked, RevenueCat generates the `appl_…` SDK key → §1.
- [ ] Sandbox testers for pre-launch purchase testing.
- [ ] Verify product IDs in the paywalls match the App Store Connect
      subscription/IAP product IDs once those exist.

## 4. Supabase (production project `ijtcqbxagcdgfxrgamis`)

**Already applied to prod via MCP + CLI (2026-09-02):**
- [x] `match_memories` RAG migrations (recency + hybrid + `search_path` fix).
      This also **fixed a latent bug**: RAG memory retrieval was silently
      returning nothing because the `<=>` operator (in the `extensions` schema)
      was unresolvable under `search_path=public`. Smoke-tested (5-arg + 7-arg).
- [x] `match_documents` `search_path` fixed (same latent bug; note the table
      `memory_embeddings` it references still does not exist on prod — separate
      pre-existing issue if that path is used).
- [x] RLS enabled on `public.background_jobs` (was a security-advisor ERROR).
- [x] **All 19 repo edge functions deployed** from the `prod-readiness` branch
      via `supabase functions deploy --use-api` (`analyze-dream` and
      `summarize-session` were new to prod). `revenuecat-webhook` kept
      `verify_jwt = false`. All 19 pass a CORS/boot health check.
- [x] Security + performance advisors reviewed — see remaining items below.

- [x] **Edge Function secrets set:** `APP_ENV=production`,
      `REVENUECAT_WEBHOOK_SECRET` (matches the RevenueCat webhook header).
      `GEMINI_API_KEY` / `GCP_API_KEY` / `CORS_ORIGINS` were already set.
- [x] **Privileged RPCs locked down** (migration `20260902110000`): `anon` /
      `authenticated` can no longer execute `assign_plan_to_user` (no self-grant),
      the `handle_new_user*` triggers, or the arbitrary-`user_uuid` helpers. Plan
      changes now flow only through the RevenueCat webhook (service_role).

**Still to do (dashboard / needs your input):**
- [ ] `SENTRY_DSN` Edge Function secret (optional — backend Sentry no-ops
      without it): `supabase secrets set SENTRY_DSN=<dsn> --project-ref ijtcqbxagcdgfxrgamis`
- [ ] Create a personal access token → `SUPABASE_ACCESS_TOKEN` GitHub secret;
      set `SUPABASE_PROJECT_REF=ijtcqbxagcdgfxrgamis` GitHub secret.
- [ ] Production Auth: redirect URLs, Google/Apple OAuth config, `gisbel://`
      deep link, email confirmations if desired. Enable leaked-password
      protection (advisor WARN).
- [ ] Upgrade Postgres (`supabase-postgres-17.4.1.054` has security patches
      available — advisor WARN).
- [ ] Remaining advisor WARNs (pre-existing, not blocking): a few more
      `SECURITY DEFINER` helpers are still `authenticated`-executable
      (`has_premium_access`, `get_active_prompt_by_name`, `increment_feature_usage`,
      `submit_dream_feedback`, `submit_oracle_result`) — these are called by the
      client legitimately; tighten with `auth.uid()` checks inside the functions
      later. `pg_net` extension is in `public`.
- [ ] Decide the fate of the old `xnicudjkfmxsmyxbemur` (Gisbel-staging) project.
- [ ] `memory_embeddings` table is referenced by `match_documents` but doesn't
      exist on prod — investigate whether the LangChain doc-match path is used.

## 5. Sentry

- [ ] Create a React Native project → copy the DSN → EAS env var (§1).
- [ ] Optional: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` GitHub
      secrets for source-map upload.

## 6. Legal

- [ ] **Have a lawyer review** `constants/legal/{tr,en,de}.ts` (Privacy Policy,
      Terms, Health Disclaimer) and set the real contact email, company name,
      and governing law.
- [ ] Host the same Privacy Policy + Terms text at a public URL (GitHub Pages /
      Vercel / a Supabase Storage static page).
- [ ] Host a public account-deletion instructions page.
- [ ] Bump `LEGAL_VERSION` in `constants/legal/index.ts` whenever the text
      changes materially (this re-triggers the in-app consent gate).

## 7. GitHub

- [ ] Secrets: `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`,
      optional `SENTRY_AUTH_TOKEN`, optional `GOOGLE_SERVICE_ACCOUNT_KEY`.
- [ ] Create a **protected `production` environment** with required reviewers
      (the release + supabase-deploy workflows use it).

## 8. Deferred — iOS

Once there is an Apple Developer Program account:

- [ ] Create the App Store Connect app; add `ascAppId` + `appleTeamId` to
      `eas.json` → `submit.production.ios`.
- [ ] Switch `release-ios.yml` to the `production` profile and add an
      `eas submit` step.
- [ ] Add the RevenueCat iOS app + Apple OAuth key.

---

## Known follow-ups (tracked, not blocking)

- The Deno edge-function test suite (`deno test supabase/functions/`) has
  pre-existing failures from the orchestration/quota refactor — stale mocks and
  handler-map expectations. CI does not run it.
- `voice_session` screen is an unfinished stub.
- Consent is stored per-device (AsyncStorage). A server-side `user_consents`
  audit table can be added later if needed.
