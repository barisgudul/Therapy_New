// hooks/useRevenueCat.ts
//
// Purchase / paywall / customer-center actions for screens. Reads of the current
// tier stay in `useSubscription()`; this hook is the "do something" side.

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Toast from "react-native-toast-message";
import {
  ENTITLEMENTS,
  OFFERING_FOR_ENTITLEMENT,
  type EntitlementId,
} from "../constants/revenuecat";
import { getOffering, restorePurchases } from "../services/revenuecat.service";

const SUBSCRIPTION_KEY = ["currentSubscription"] as const;
const USAGE_KEY = ["usageStats"] as const;

export function useRevenueCat() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    queryClient.invalidateQueries({ queryKey: USAGE_KEY });
  }, [queryClient]);

  /**
   * Present the dashboard-configured paywall, but only if `entitlement` is not
   * already active. Resolves to `true` when the user is entitled afterwards.
   */
  const presentPaywall = useCallback(
    async (entitlement: EntitlementId = ENTITLEMENTS.premium): Promise<boolean> => {
      try {
        // Show the paywall built for the offering that sells this tier.
        // `plus` → the "plus" offering; `gisbel` → the current ("default") offering.
        const offering = await getOffering(OFFERING_FOR_ENTITLEMENT[entitlement]);
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: entitlement,
          ...(offering ? { offering } : {}),
        });
        refresh();
        return (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED
        );
      } catch (e) {
        console.error("[RevenueCat] presentPaywall failed:", e);
        Toast.show({ type: "error", text1: t("subscription.paywall_error") });
        return false;
      }
    },
    [refresh, t],
  );

  /** Open RevenueCat's Customer Center (manage / cancel / refund / restore). */
  const presentCustomerCenter = useCallback(async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.error("[RevenueCat] presentCustomerCenter failed:", e);
      Toast.show({ type: "error", text1: t("subscription.paywall_error") });
    } finally {
      refresh();
    }
  }, [refresh, t]);

  /** Restore prior purchases (App Store review requirement). */
  const restore = useCallback(async () => {
    try {
      const plan = await restorePurchases();
      refresh();
      Toast.show({
        type: plan === "Free" ? "info" : "success",
        text1: t(plan === "Free" ? "subscription.restore_none" : "subscription.restore_ok"),
      });
      return plan;
    } catch (e) {
      console.error("[RevenueCat] restore failed:", e);
      Toast.show({ type: "error", text1: t("subscription.restore_error") });
      return "Free" as const;
    }
  }, [refresh, t]);

  return { presentPaywall, presentCustomerCenter, restore };
}
