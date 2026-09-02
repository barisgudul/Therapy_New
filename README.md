# Gisbel

**Gisbel is an AI-powered mental wellness companion for self-reflection.**

It is **not** therapy, medical advice, a diagnostic or treatment tool, or a
substitute for professional care, and it does not knowingly collect health
records or other special-category data. See the in-app Health Disclaimer
(`constants/legal/`).

Gisbel helps people notice patterns in their mood, journaling, and dreams over
time. Free-text entries are sent to an AI model to generate reflective
responses; a lightweight semantic memory surfaces relevant past entries as
context.

---

## Stack

### App
- **Expo SDK 53**, React Native 0.79, New Architecture, Continuous Native
  Generation (no committed `ios/` or `android/`).
- **expo-router** file-based navigation (`app/`).
- **Zustand** + **TanStack Query** for state.
- **i18next** — Turkish (source), English, German.
- **RevenueCat** (`react-native-purchases`) for subscriptions.
- **Sentry** (`@sentry/react-native`) for crash reporting — no-op unless a DSN
  is configured.

### Backend
- **Supabase** — Postgres (pgvector), Auth, and Deno **Edge Functions**
  (`supabase/functions/`).
- `unified-ai-gateway` is the main entry point for AI calls; `safety-guard`
  screens for high-risk content and returns localized crisis resources.
- **Sentry** on 7 of the edge functions (`_shared/sentry.ts`).

---

## Setup

```bash
npm ci
cp .env.example .env   # fill in the values
npx expo start
```

`npx expo prebuild` is only needed when building locally with
`expo run:android` / `expo run:ios`; EAS Build runs prebuild itself.

### Environment variables

All `EXPO_PUBLIC_*` values are embedded in the client bundle and safe to expose.

| Variable | Where it comes from |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project API keys |
| `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat public SDK keys |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry project (optional) |
| `EXPO_PUBLIC_ENV` | `development` \| `staging` \| `production` |

- **Local:** `.env`
- **EAS builds:** `EXPO_PUBLIC_ENV` and `EXPO_PUBLIC_SUPABASE_URL` are in
  `eas.json` per profile; the anon key, RevenueCat keys, and Sentry DSN are set
  as EAS environment variables bound to each environment.

---

## Quality gates

```bash
npm run lint        # eslint (expo)
npm run typecheck   # tsc against tsconfig.build.json (app code only)
npm test            # jest
```

CI (`.github/workflows/ci.yml`) runs all three plus an `expo export` bundle
check on every push and PR.

The Supabase edge-function test suite runs separately with Deno:

```bash
deno test --allow-all supabase/functions/
```

---

## Build & deploy

### App (EAS)

| Profile | Purpose |
| --- | --- |
| `development` | dev client |
| `preview` | internal APK / simulator build |
| `staging` | internal build against the staging Supabase project |
| `production` | store build (`.aab`), auto-incremented |

- `.github/workflows/release-android.yml` — manual / tag-triggered production
  build, opt-in submit to the Play internal track.
- `.github/workflows/release-ios.yml` — manual simulator build only. iOS store
  builds are blocked until an Apple Developer Program account exists.

### Backend (Supabase)

`.github/workflows/supabase-deploy.yml` (manual, protected environment) runs
`supabase db push` and `supabase functions deploy`. `revenuecat-webhook` is
configured with `verify_jwt = false` in `supabase/config.toml`.

---

## Project layout

```
app/            expo-router routes
  (guest)/      onboarding for signed-out users
  (auth)/       login / register
  (legal)/      Privacy, Terms, Health Disclaimer, consent gate
  (app)/        the signed-in app
components/      shared + feature UI
hooks/          screen and data hooks
store/          zustand stores
services/       API / Supabase client wrappers
constants/legal/ in-app legal documents (tr/en/de)
supabase/functions/  Deno edge functions
```

---

## Legal

`constants/legal/{tr,en,de}.ts` hold conservative **draft** Privacy Policy,
Terms of Service, and Health Disclaimer text. **These have not been reviewed by
a lawyer** — get counsel to review them, and host the same text at a public URL,
before a public launch. New users accept them via a checkbox in registration;
returning / OAuth users hit a consent gate on first launch.

---

## License

MIT — see [LICENSE](LICENSE). Developed by Mehmet Barış Güdül.
