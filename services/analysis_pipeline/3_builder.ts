// services/analysis_pipeline/3_builder.ts

// Kullanıcı profili oluşturma
export function buildUserProfile(vault: any): string {
  const profile = vault.profile || {};
  const traits = vault.traits || {};
  const themes = vault.themes || [];
  const insights = vault.keyInsights || [];

  const profileParts = [];

  if (profile.nickname) profileParts.push(`İsim: ${profile.nickname}`);
  if (traits.confidence !== undefined) profileParts.push(`Güven: %${Math.round(traits.confidence * 100)}`);
  if (traits.anxiety_level !== undefined) profileParts.push(`Kaygı: %${Math.round(traits.anxiety_level * 100)}`);
  if (traits.writing_style) profileParts.push(`Yazı stili: ${traits.writing_style}`);
  if (themes.length > 0) profileParts.push(`Ana temalar: ${themes.join(', ')}`);
  if (insights.length > 0) profileParts.push(`Önemli içgörüler: ${insights.slice(0, 3).join(', ')}`);

  return profileParts.length > 0 ? profileParts.join(' | ') : 'Profil bilgisi yetersiz';
}

// Analiz prompt'u oluşturma
export function buildAnalysisPrompt(days: number, userProfile: string, events: any[]): string {
  return `
Çıktının en başına büyük harflerle ve kalın olmadan sadece şu başlığı ekle: "Son ${days} Günlük Analiz"

Kullanıcının son ${days} günlük duygu durumu analizi için aşağıdaki yapıda detaylı ancak özlü bir rapor oluştur:

## 1. Genel Bakış
• Haftalık duygu dağılımı (ana duyguların yüzdeli dağılımı)
• Öne çıkan pozitif/negatif eğilimler
• Haftanın en belirgin 3 özelliği

## 2. Duygusal Dalgalanmalar
• Gün içi değişimler (sabah-akşam karşılaştırması)
• Haftalık trend (hafta başı vs hafta sonu)
• Duygu yoğunluğu gradyanı (1-10 arası skala tahmini)

## 3. Tetikleyici Analizi
• En sık tekrarlanan 3 olumsuz tetikleyici
• Etkili başa çıkma mekanizmaları
• Kaçırılan fırsatlar (gözden kaçan pozitif anlar)

## 4. Kişiye Özel Tavsiyeler
• Profil verilerine göre (${userProfile}) uyarlanmış 3 somut adım
• Haftaya özel mini hedefler
• Acil durum stratejisi (kriz anları için)

**Teknik Talimatlar:**
1. Rapor maksimum 600 kelime olsun
2. Her bölüm 3-4 maddeli paragraf şeklinde
3. Sayısal verileri yuvarlayarak yaz (%Yüzde, X/Y oran gibi)
4. Günlük konuşma dili kullan (akademik jargon yok)
5. **Markdown formatını kullan** - başlıklar için ##, madde işaretleri için •, vurgular için **kalın**
6. Pozitif vurguyu koru (eleştirel değil yapıcı olsun)
7. Eğer kullanıcı profili varsa, yanıtında kullanıcının ismiyle hitap et
8. Başka hiçbir başlık, özet, giriş veya kapanış cümlesi ekleme. Sadece yukarıdaki başlık ve ardından 4 ana bölüm gelsin

**Veriler:**
${JSON.stringify(events, null, 2)}
  `.trim();
}

// Ana fonksiyon: Final prompt oluşturma
export function buildFinalPrompt(days: number, userVault: any, processedData: any[]): string {
  try {
    console.log('[BUILDER] Final prompt oluşturuluyor...');
    
    // Kullanıcı profilini oluştur
    const userProfile = buildUserProfile(userVault);
    
    // Analiz prompt'unu oluştur
    const prompt = buildAnalysisPrompt(days, userProfile, processedData);
    
    console.log('[BUILDER] Final prompt oluşturuldu.');
    return prompt;
  } catch (error) {
    console.error('[BUILDER] Prompt oluşturma hatası:', error);
    throw error;
  }
} 