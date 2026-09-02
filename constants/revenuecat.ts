// constants/revenuecat.ts
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { PlanName } from "../store/subscriptionStore";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/**
 * Platform-specific RevenueCat *public* SDK key.
 * iOS -> `appl_...`, Android -> `goog_...`.
 * Read from EAS/`.env` (`EXPO_PUBLIC_RC_*`) or `app.config.js` `extra`.
 * `undefined` is a valid state: the app boots without RevenueCat (Expo Go, tests, misconfig).
 */
export const RC_API_KEY: string | undefined = Platform.select({
  ios: extra.EXPO_PUBLIC_RC_IOS_KEY ?? process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: extra.EXPO_PUBLIC_RC_ANDROID_KEY ?? process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  default: undefined,
});

/** RevenueCat entitlement identifiers, as configured in the dashboard. */
export const ENTITLEMENTS = {
  premium: "gisbel",
  plus: "plus",
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

/**
 * Offering identifier that sells each entitlement, as configured in the dashboard:
 * - `default` (the current offering) → monthly/yearly/lifetime → `gisbel` (Premium)
 * - `plus` → monthly/yearly → `plus` (+Plus)
 * `presentPaywall` uses this to show the right paywall for the tier being sold.
 */
export const OFFERING_FOR_ENTITLEMENT: Record<EntitlementId, string> = {
  [ENTITLEMENTS.premium]: "default",
  [ENTITLEMENTS.plus]: "plus",
};

/**
 * Map the set of *active* RevenueCat entitlement ids to an app tier.
 * Precedence: `gisbel` (Premium) beats `plus` (+Plus); no entitlement -> Free.
 */
export function resolvePlanName(activeEntitlementIds: readonly string[]): PlanName {
  if (activeEntitlementIds.includes(ENTITLEMENTS.premium)) return "Premium";
  if (activeEntitlementIds.includes(ENTITLEMENTS.plus)) return "+Plus";
  return "Free";
}
