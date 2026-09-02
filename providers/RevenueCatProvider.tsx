// providers/RevenueCatProvider.tsx
//
// Owns the RevenueCat lifecycle: configure once, keep the RevenueCat customer in
// sync with the Supabase auth user, and push live entitlement changes into React
// Query so `useSubscription()` / `PremiumGate` update with no polling.
//
// Must be mounted *inside* <AuthProvider> (needs useAuth) and *inside*
// <QueryClientProvider> (needs useQueryClient).

import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { useAuth } from "../context/Auth";
import {
  configureRevenueCat,
  getPlanFromCustomerInfo,
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from "../services/revenuecat.service";
import type { UserSubscription } from "../services/subscription.service";

const SUBSCRIPTION_KEY = ["currentSubscription"] as const;
const USAGE_KEY = ["usageStats"] as const;

type RevenueCatContextValue = { isReady: boolean };

const RevenueCatContext = React.createContext<RevenueCatContextValue>({ isReady: false });

export const useRevenueCatReady = () => React.useContext(RevenueCatContext).isReady;

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const lastUserId = useRef<string | null>(null);

  // 1. Configure once + subscribe to live CustomerInfo updates.
  useEffect(() => {
    let cancelled = false;

    const onUpdate = (info: CustomerInfo) => {
      const plan = getPlanFromCustomerInfo(info);
      queryClient.setQueryData<UserSubscription | null>(SUBSCRIPTION_KEY, {
        plan_id: plan,
        name: plan,
      });
      // Server-side limits (check_feature_usage) are updated by the webhook a
      // few seconds later — re-fetch so the UI catches up.
      queryClient.invalidateQueries({ queryKey: USAGE_KEY });
    };

    configureRevenueCat().then((ok) => {
      if (cancelled) return;
      setIsReady(ok);
      if (ok) Purchases.addCustomerInfoUpdateListener(onUpdate);
    });

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(onUpdate);
    };
  }, [queryClient]);

  // 2. Keep the RevenueCat customer aligned with the Supabase user.
  useEffect(() => {
    if (!isReady) return;
    const userId = user?.id ?? null;
    if (userId === lastUserId.current) return;
    lastUserId.current = userId;

    (async () => {
      if (userId) {
        await identifyRevenueCatUser(userId);
      } else {
        await resetRevenueCatUser();
      }
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
      queryClient.invalidateQueries({ queryKey: USAGE_KEY });
    })();
  }, [isReady, user?.id, queryClient]);

  return (
    <RevenueCatContext.Provider value={{ isReady }}>{children}</RevenueCatContext.Provider>
  );
}
