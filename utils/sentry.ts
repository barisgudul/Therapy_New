// utils/sentry.ts
//
// Thin wrapper around @sentry/react-native so the rest of the app can call
// `initSentry()`, `wrap()` and `captureException()` unconditionally.
//
// Sentry is a no-op unless a DSN is provided via EXPO_PUBLIC_SENTRY_DSN, and it
// is always disabled inside Expo Go (the native SDK is not present there) and
// under tests. This keeps local dev, Expo Go and CI completely unaffected.
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sentry from "@sentry/react-native";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(DSN) && !isExpoGo &&
  process.env.NODE_ENV !== "test";

export function initSentry(): void {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_ENV ?? "production",
    // Keep tracing modest; this is a small app and quota matters.
    tracesSampleRate: 0.2,
    // PII: we deliberately do not send user email / IP.
    sendDefaultPii: false,
  });
}

/** Wraps the root component for navigation + error instrumentation. Identity when disabled. */
export const wrap: <C>(component: C) => C = sentryEnabled
  ? (Sentry.wrap as unknown as <C>(component: C) => C)
  : (component) => component;

/** Report a caught error. No-op when Sentry is disabled. */
export function captureException(error: unknown): void {
  if (!sentryEnabled) return;
  Sentry.captureException(error);
}

/** Attach the current user id (never email / PII). Clears on logout with `null`. */
export function setSentryUser(userId: string | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
