// constants/dailyWrite.constants.ts

import { Colors } from "./Colors";

export const tokens = {
  radiusLg: 28,
  radiusMd: 22,
  tintMain: "#3B82F6",
  glassBg: "rgba(246, 248, 250, 0.85)",
  shadow: {
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

// YENİ VE DOĞRU PALET: Marka kimliğine uygun, yumuşak ve geçişli renkler.
export const MOOD_LEVELS = [
  // En düşük duygu durumu: Soğuk ve sakin bir mor
  { label: "Çok Kötü", startColor: "#A8A29E", endColor: "#D1D5DB" },
  // Biraz daha iyi: Soğuk mavi tonları
  { label: "Kötü", startColor: "#93C5FD", endColor: "#A5B4FC" },
  // Nötre yakın: Daha nötr, sakin bir mavi
  { label: "İdare Eder", startColor: "#A5B4FC", endColor: "#C4B5FD" },
  // Tam orta nokta: Nötr ve dengeli bir lavanta
  { label: "Normal", startColor: "#C4B5FD", endColor: "#D8B4FE" },
  // Pozitif tarafa geçiş: Daha sıcak bir eflatun
  { label: "İyi", startColor: "#F472B6", endColor: "#FBCFE8" },
  // Mutluluk: Canlı ve sıcak bir pembe/mor
  { label: "Harika", startColor: "#F9A8D4", endColor: "#FECDD3" },
  // En yüksek enerji: Enerjik ve parlak bir gül kurusu
  { label: "Muhteşem", startColor: "#FB7185", endColor: "#FDA4AF" },
];
