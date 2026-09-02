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

- [ ] Create a personal access token → `SUPABASE_ACCESS_TOKEN` GitHub secret;
      set `SUPABASE_PROJECT_REF=ijtcqbxagcdgfxrgamis` GitHub secret.
- [ ] **Take a full database backup** (`supabase db dump ...`) stored outside the
      repo before touching migrations.
- [ ] Schema reconciliation (RISK — do interactively, not via CI):
      - `supabase link --project-ref ijtcqbxagcdgfxrgamis`
      - `supabase db diff --linked --schema public` to compare the live schema
        with `supabase/migrations/20251103115540_remote_schema.sql` (that dump
        came from the *staging* project).
      - If they match: replace the baseline with a fresh `supabase db pull`.
      - If they diverge: generate a corrective migration; do **not** push the
        old dump.
      - `supabase migration list --linked` — check whether
        `20260617000000_rag_brain_recency` / `20260617000001_rag_brain_hybrid`
        are applied; if not, review the SQL (index creation can lock) and
        `db push` in a low-traffic window.
- [ ] Edge Function secrets: `SENTRY_DSN`, `APP_ENV=production`,
      `REVENUECAT_WEBHOOK_SECRET`, and the AI provider API keys.
- [ ] Production Auth: redirect URLs, Google/Apple OAuth config, `gisbel://`
      deep link, email confirmations if desired.
- [ ] `supabase functions deploy` (the `revenuecat-webhook` block in
      `config.toml` now sets `verify_jwt = false`).
- [ ] Decide the fate of the old `xnicudjkfmxsmyxbemur` project.

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
