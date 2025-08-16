// supabase/functions/_shared/orchestration.handlers.ts

import type { InteractionContext } from "./types/context.ts";

// Orkestratörden dönebilecek tüm olası başarılı sonuç tipleri
export type OrchestratorSuccessResult =
    | string // Basit metin yanıtları (terapi, yansıma vb.) - Rüya analizi için eventId de döner
    | { success: boolean; message: string }; // onboarding gibi işlemler için

// ===============================================
// YARDIMCI FONKSİYONLAR
// ===============================================

/**
 * Basit analiz raporu oluşturucu
 */
export async function generateSimpleAnalysisReport(
    context: InteractionContext,
): Promise<string> {
    const { days } = context.initialEvent.data;
    const vault = context.initialVault;
    
    // Vault'tan mood history'yi al
    const moodHistory = vault.moodHistory || [];
    const recentMoods = moodHistory
        .filter(mood => {
            const moodDate = new Date(mood.timestamp);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            return moodDate >= cutoffDate;
        })
        .map(mood => mood.mood);
    
    // Basit analiz
    const moodCounts: Record<string, number> = {};
    recentMoods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    
    const dominantMood = Object.entries(moodCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "belirsiz";
    
    const totalMoods = recentMoods.length;
    const uniqueMoods = Object.keys(moodCounts).length;
    
    // Markdown raporu oluştur
    const report = `# Ruh Hali Analiz Raporu

## 📊 Analiz Özeti
**Analiz Edilen Süre:** ${days} gün  
**Toplam Kayıt:** ${totalMoods} adet  
**Farklı Ruh Halleri:** ${uniqueMoods} çeşit

## 🎯 Dominant Ruh Hali
**En Sık Görülen:** ${dominantMood}

## 📈 Ruh Hali Dağılımı
${Object.entries(moodCounts)
    .map(([mood, count]) => `- **${mood}:** ${count} kez`)
    .join('\n')}

## 💡 İçgörüler
${totalMoods > 0 
    ? `Bu ${days} günlük süreçte ruh halinizde ${uniqueMoods} farklı durum gözlemlendi. En sık yaşanan ruh hali "${dominantMood}" olarak kaydedildi.`
    : `Bu süre zarfında henüz ruh hali kaydı bulunmuyor. Günlük duygu takibine başlayarak daha detaylı analizler elde edebilirsiniz.`
}

## 🔮 Öneriler
- Günlük duygu takibini düzenli yapın
- Ruh hali değişimlerini not edin
- Düzenli analizlerle trend'leri keşfedin

---
*Bu rapor therapy. uygulaması tarafından otomatik oluşturulmuştur.*`;

    return report;
}
