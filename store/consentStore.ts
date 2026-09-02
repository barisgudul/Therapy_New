// store/consentStore.ts
//
// Tracks whether the current user/device has accepted the current version of the
// legal documents (Privacy Policy, Terms, Health Disclaimer). Persisted to
// AsyncStorage so the consent gate only appears when acceptance is missing or
// out of date (e.g. after a policy version bump).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LEGAL_VERSION } from "../constants/legal";

type ConsentState = {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  locale: string | null;
  /** False until the persisted value has been read from AsyncStorage. */
  _hydrated: boolean;
  /** Record acceptance of the given legal version. */
  accept: (version: string, locale: string) => void;
  /** Clear acceptance (used on account deletion / full sign-out reset). */
  reset: () => void;
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      acceptedVersion: null,
      acceptedAt: null,
      locale: null,
      _hydrated: false,
      accept: (version, locale) =>
        set({
          acceptedVersion: version,
          acceptedAt: new Date().toISOString(),
          locale,
        }),
      reset: () =>
        set({ acceptedVersion: null, acceptedAt: null, locale: null }),
    }),
    {
      name: "gisbel-consent",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        acceptedVersion: s.acceptedVersion,
        acceptedAt: s.acceptedAt,
        locale: s.locale,
      }),
      onRehydrateStorage: () => (state) => {
        useConsentStore.setState({ _hydrated: true });
        void state;
      },
    },
  ),
);

/** True when the stored acceptance matches the current legal document version. */
export function hasCurrentConsent(acceptedVersion: string | null): boolean {
  return acceptedVersion === LEGAL_VERSION;
}
