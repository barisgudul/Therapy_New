// utils/traits.ts

import { supabase } from './supabase';
// `updateTrait` ve `traitKeys`'i eventLogger'dan alıyoruz
import { TraitKey, traitKeys, Traits, updateTrait } from '../services/trait.service';

// Artık kendi gemini client'ına ihtiyacın yok, useGemini'deki merkezi fonksiyonu kullan.
// Bunun için ya sendToGemini'yi dışarıya taşıyıp import edeceksin
// ya da burada da bir client instance oluşturacaksın. Şimdilik burada kalsın.
import { invokeGemini } from '../services/ai.service';
import { parseAndValidateJson } from './jsonValidator';
import { TraitsSchema } from './schemas';


/**
 * Kullanıcının son aktivitelerinden kişilik çıkarımı yapar ve vault'a kaydeder.
 * Bu fonksiyon, bir "background job" gibi periyodik olarak çalıştırılmalı.
 */
export async function extractAndSaveUserTraits(): Promise<void> {
  try {
    // Background job güvenliği: User kontrolü ve graceful handling
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      __DEV__ && console.log('📭 [TRAITS] Kullanıcı oturumu bulunamadı. Background job güvenli şekilde sonlandırılıyor.');
      return; // Hata fırlatmak yerine graceful exit - background job için daha uygun
    }

    // 1. Son 7 günün event verisini al (daha verimli bir sorgu)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error } = await supabase
      .from('events')
      .select('type, mood, data, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo) 
      .order('created_at', { ascending: false })
      .limit(50); // Çok fazla veriyi AI'a göndermek için limit koymak mantıklı

    if (error || !events || events.length < 5) { // En az 5 olay olsun
      __DEV__ && console.log('📭 [TRAITS] Trait çıkarımı için yeterli yeni event verisi yok.');
      return;
    }

    // 2. Veriyi prompt'a dönüştür
    const eventText = events.map((e) => {
      // data objesini çok uzatmadan string'e çevir
      const dataString = JSON.stringify(e.data)?.substring(0, 200) || ''; 
      return `Tarih: ${e.created_at}\nOlay Tipi: ${e.type}\nMood: ${e.mood || 'Belirtilmedi'}\nDetay: ${dataString}`;
    }).join('\n---\n');

    const prompt = `
      Bir kullanıcının son 7 günlük aktiviteleri aşağıdadır. Bu verilere dayanarak, kullanıcının kişilik özelliklerini analiz et. Cevabını SADECE ve SADECE aşağıda istenen anahtarları içeren bir JSON objesi olarak ver. Sayısal değerler 0 (çok düşük) ile 1 (çok yüksek) arasında olmalı.
      
      İstenen Alanlar:
      ${traitKeys.map(k => `- ${k}`).join('\n')}

      Örnek Çıktı:
      {
        "confidence": 0.73,
        "anxiety_level": 0.42
      }

      KULLANICI VERİLERİ:
      ${eventText}
    `.trim();

    // 3. Gemini Pro ile analiz et (bu önemli bir iş)
    // DİKKAT: JSON formatı istediğimiz için `responseMimeType` kullanıyoruz.
    const jsonString = await invokeGemini(prompt, 'gemini-2.5-pro', { responseMimeType: 'application/json' });
    
    // GÜVENLİ PARSE VE DOĞRULAMA
    const parsed = parseAndValidateJson(jsonString, TraitsSchema);

    if (!parsed) {
        console.error("⛔️ [TRAITS] Trait analizi sonucu doğrulanamadı. İşlem durduruldu.");
        return;
    }

    // 4. Trait'leri GÜNCELLE (ortalayarak)
    for (const key in parsed) {
        // key'in geçerli bir TraitKey olduğundan emin oluyoruz
        if (traitKeys.includes(key as TraitKey)) {
            const traitKey = key as TraitKey;
            const value = (parsed as Traits)[traitKey];
            if (value !== undefined) {
                // Senin vizyonundaki gibi 'average' modunu kullanıyoruz!
                await updateTrait(traitKey, value, { mode: 'average' });
            }
        }
    }

    __DEV__ && console.log('✅ [TRAITS] Trait çıkarımı ve güncellemesi tamamlandı:', parsed);
  } catch (err) {
    console.error('⛔️ [TRAITS] Trait çıkarım kritik hatası:', (err as Error).message);
    // Background job için hata fırlatmıyoruz, sadece logluyoruz
    // Bu sayede sistem çökmüyor ve diğer background joblar etkilenmiyor
  }
}

// Artık traits.ts içindeki geminiClient.ts ve ilgili kodları silebilirsin.
// Merkezi useGemini.ts'i kullanmak daha temiz bir mimari sağlar.