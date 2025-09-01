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

// YENİ: İnterpolasyon için optimize edilmiş, en belirgin ve canlı renk paleti
export const MOOD_LEVELS = [
  // Derin düşünce, koyu indigo
  { label: "Melankolik", color: "#1e1b4b" }, // Derin Indigo
  // Durgunluk, koyu slate
  { label: "Keyifsiz", color: "#1e293b" }, // Koyu Slate
  // Nötr denge, koyu gri
  { label: "Normal", color: "#374151" }, // Koyu Gri
  // Hafif bir aydınlanma, parlak mavi
  { label: "Rahat", color: "#3b82f6" }, // Parlak Mavi
  // Huzur, canlı royal mavi
  { label: "Mutlu", color: "#1d4ed8" }, // Royal Mavi
  // Nazik pozitiflik, parlak cyan
  { label: "Neşeli", color: "#0891b2" }, // Parlak Cyan
  // Canlılık ve enerji, parlak emerald
  { label: "Enerjik", color: "#059669" }, // Parlak Emerald
];
