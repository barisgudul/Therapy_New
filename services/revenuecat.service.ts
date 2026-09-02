// services/revenuecat.service.ts
//
// Thin wrapper around react-native-purchases. Every call is a no-op / safe
// fallback when the SDK is not configured (missing key, Expo Go, Jest), so the
// rest of the app never has to branch on "is RevenueCat available".

import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
} from "react-native-purchases";
import { RC_API_KEY, resolvePlanName } from "../constants/revenuecat";
import type { PlanName } from "../store/subscriptionStore";

let configurePromise: Promise<boolean> | null = null;

/** True once `Purchases.configure` has completed with a usable key. */
export async function isRevenueCatReady(): Promise<boolean> {
  try {
    return await Purchases.isConfigured();
  } catch {
    return false;
  }
}

/**
 * Configure the SDK exactly once per app session. Returns whether it is usable.
 * Safe to call repeatedly and from multiple places.
 */
export function configureRevenueCat(): Promise<boolean> {
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    if (!RC_API_KEY) {
      console.warn(
        "[RevenueCat] No API key for this platform — running without in-app purchases.",
      );
      return false;
    }
    try {
      if (await Purchases.isConfigured()) return true;
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: RC_API_KEY });
      return true;
    } catch (e) {
      console.error("[RevenueCat] configure failed:", getMessage(e));
      return false;
    }
  })();

  return configurePromise;
}

/**
 * Associate the RevenueCat customer with our Supabase user id. This is what the
 * webhook receives as `app_user_id`, so it must run on every login.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!(await isRevenueCatReady())) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.error("[RevenueCat] logIn failed:", getMessage(e));
  }
}

/** Detach the current user (on logout); returns to an anonymous customer. */
export async function resetRevenueCatUser(): Promise<void> {
  if (!(await isRevenueCatReady())) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    // Throws if already anonymous — not an error for us.
    console.warn("[RevenueCat] logOut skipped:", getMessage(e));
  }
}

/** Map a CustomerInfo payload to an app tier. */
export function getPlanFromCustomerInfo(info: CustomerInfo): PlanName {
  return resolvePlanName(Object.keys(info.entitlements.active));
}

/** Current tier from live CustomerInfo. Falls back to `null` when unavailable. */
export async function getCurrentPlanFromRevenueCat(): Promise<PlanName | null> {
  if (!(await isRevenueCatReady())) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return getPlanFromCustomerInfo(info);
  } catch (e) {
    console.error("[RevenueCat] getCustomerInfo failed:", getMessage(e));
    return null;
  }
}

/** Restore prior purchases (required by App Store review). Returns resulting tier. */
export async function restorePurchases(): Promise<PlanName> {
  if (!(await isRevenueCatReady())) return "Free";
  const info = await Purchases.restorePurchases();
  return getPlanFromCustomerInfo(info);
}

/** Raw offerings — for diagnostics / a custom fallback screen only. */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!(await isRevenueCatReady())) return null;
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.error("[RevenueCat] getOfferings failed:", getMessage(e));
    return null;
  }
}

/**
 * A specific offering by identifier (e.g. "plus"), or `undefined` to let the
 * paywall fall back to the current offering.
 */
export async function getOffering(
  identifier: string,
): Promise<PurchasesOffering | undefined> {
  const offerings = await getOfferings();
  return offerings?.all?.[identifier] ?? undefined;
}

function getMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
