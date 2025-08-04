// constants/dailyWrite.constants.ts

import { Colors } from './Colors';

export const tokens = {
  radiusLg: 28,
  radiusMd: 22,
  tintMain: '#3B82F6', 
  glassBg: 'rgba(246, 248, 250, 0.85)',
  shadow: {
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

// YENİ: İnterpolasyon için optimize edilmiş, daha yumuşak ve terapötik renk paleti
export const MOOD_LEVELS = [
  // Derin düşünce, gece mavisi
  { label: 'Melankolik',  color: '#6B7280' }, // Kurşun Kalem Grisi
  // Durgunluk, sisli bir sabah
  { label: 'Keyifsiz',     color: '#718096' }, // Fırtınalı Gri
  // Nötr denge, bulutlu gökyüzü
  { label: 'Normal',    color: '#A0AEC0' }, // Taş Grisi
  // Hafif bir aydınlanma, gümüşi bir ışık
  { label: 'Rahat',      color: '#A7BFDE' }, // Tozlu Mavi (Gri-Mavi geçişi)
  // Huzur, açık ve berrak bir gökyüzü
  { label: 'Mutlu',    color: '#90a4f5' }, // Yumuşak Lavanta (Marka rengine yumuşak geçiş)
  // Nazik pozitiflik, ılık bir gün
  { label: 'Neşeli',        color: '#7f9cf5' }, // Lavanta Mavisi (Ana marka rengi)
  // Canlılık ve enerji, parlak gökyüzü
  { label: 'Enerjik',   color: '#63B3ED' }, // Berrak Gök Mavisi
];
