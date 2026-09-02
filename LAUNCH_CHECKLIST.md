# Gisbel — Launch Checklist

Everything in this file is a **dashboard / account** step that has to be done by
a human. The code side (tests, typecheck, dev-route guards, Sentry, notification
permissions, EAS profiles, CI workflows, in-app legal + consent, delete-account
flow, README) is done on the `prod-readiness` branch.

---

## 0. Merge the branch

- [ ] Review and merge `prod-readiness` into `main` (13 commits, all quality
      gates green: `npm run lint && npm run typecheck && npm test`).

---

## 1. Expo / EAS

- [ ] `eas login` as `barisgudul`.
- [ ] Create EAS **environment variables** for `production` (and `staging`):
      - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
      - `EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`
      - `EXPO_PUBLIC_SENTRY_DSN`
      (`EXPO_PUBLIC_ENV` and `EXPO_PUBLIC_SUPABASE_URL` are already in `eas.json`.)
- [ ] Decide the staging Supabase project and fill `eas.json` → `build.staging.env`
      (currently only the URL is set).
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

## 3. RevenueCat

- [ ] Create the project and add the Android app.
- [ ] Products / Entitlements: `gisbel` (Premium) and `plus` — must match
      `constants/revenuecat.ts`.
- [ ] Offerings: `default` and `plus` — must match `OFFERING_FOR_ENTITLEMENT`.
- [ ] Configure a Paywall.
- [ ] Public SDK keys → EAS environment variables (§1).
- [ ] Set the webhook:
      URL `https://ijtcqbxagcdgfxrgamis.functions.supabase.co/revenuecat-webhook`,
      header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.

## 4. Supabase (production project `ijtcqbxagcdgfxrgamis`)

**Already applied to prod via MCP (2026-09-02):**
- [x] `match_memories` RAG migrations (recency + hybrid + `search_path` fix).
      This also **fixed a latent bug**: RAG memory retrieval was silently
      returning nothing because the `<=>` operator (in the `extensions` schema)
      was unresolvable under `search_path=public`.
- [x] `match_documents` `search_path` fixed (same latent bug; note the table
      `memory_embeddings` it references still does not exist on prod — separate
      pre-existing issue if that path is used).
- [x] `revenuecat-webhook` deployed with `verify_jwt = false` (fail-closed:
      returns 401 until the secret below is set).
- [x] RLS enabled on `public.background_jobs` (was a security-advisor ERROR).
- [x] Security + performance advisors reviewed — see §4 notes below.

**Still to do (mostly dashboard):**
- [ ] Create a personal access token → `SUPABASE_ACCESS_TOKEN` GitHub secret;
      set `SUPABASE_PROJECT_REF=ijtcqbxagcdgfxrgamis` GitHub secret.
- [ ] **Edge Function secrets** (Dashboard → Edge Functions → Secrets):
      `REVENUECAT_WEBHOOK_SECRET` (random string, also goes in the RC webhook
      header), `SENTRY_DSN`, `APP_ENV=production`, and the AI provider API keys.
      Until `REVENUECAT_WEBHOOK_SECRET` is set, the webhook rejects everything.
- [ ] **Redeploy the ~20 repo edge functions** from the branch — do this
      interactively with logs open, NOT via CI. Prod currently has ~37 functions
      (lots of legacy drift) and the branch's `_shared/*` changed significantly
      (crisis-resources, config, rag.service, orchestration). `supabase functions
      deploy` only pushes the 20 in the repo and won't prune the rest.
- [ ] Production Auth: redirect URLs, Google/Apple OAuth config, `gisbel://`
      deep link, email confirmations if desired. Enable leaked-password
      protection (advisor WARN).
- [ ] Upgrade Postgres (`supabase-postgres-17.4.1.054` has security patches
      available — advisor WARN).
- [ ] Broader security cleanup (advisor WARN, pre-existing, not blocking): many
      `SECURITY DEFINER` functions are `anon`/`authenticated`-executable via
      `/rpc/` — notably `assign_plan_to_user` (a user could self-assign a plan).
      Revoke EXECUTE from `anon`/`authenticated` on the internal ones.
- [ ] Decide the fate of the old `xnicudjkfmxsmyxbemur` (Gisbel-staging) project.
- [ ] Take a routine backup before the function redeploy.

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
