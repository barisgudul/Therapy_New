// store/crisisStore.ts
//
// Kriz (level_3_high_alert) ekranının küresel durumu. Tüm AI gateway akışları
// (text_session, daily_reflection, diary, dream, voice) ortak olarak buradan
// tetikler; ekran app kökünde tek bir <CrisisModal /> ile render edilir.

import { create } from "zustand";
import type { CrisisPayload } from "../utils/crisis";

type CrisisStore = {
    payload: CrisisPayload | null;
    showCrisis: (payload: CrisisPayload) => void;
    hide: () => void;
};

export const useCrisisStore = create<CrisisStore>((set) => ({
    payload: null,
    showCrisis: (payload) => set({ payload }),
    hide: () => set({ payload: null }),
}));
