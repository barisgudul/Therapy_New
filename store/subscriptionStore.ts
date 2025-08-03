// store/subscriptionStore.ts (YENİLENMİŞ VE AKILLI VERSİYON)

import { create } from 'zustand';

// Artık tüm planları tanıyoruz.
export type PlanName = 'Free' | '+Plus' | 'Premium';

interface SubscriptionState {
  planName: PlanName;
  // Bu, beyni doğrudan istediğimiz duruma getiren komuttur.
  setPlanName: (newPlan: PlanName) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  planName: 'Free', // Başlangıç durumu
  
  // togglePlanForTesting GİTTİ! Yerine bu geldi.
  setPlanName: (newPlan) => {
    console.log(`🧠 [ZUSTAND] Abonelik durumu güncellendi: ${newPlan}`);
    set({ planName: newPlan });
  },
}));