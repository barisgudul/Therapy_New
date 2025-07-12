// utils/eventLogger.ts - KOLEKTİF BİLİNÇ v3.0 - ÜRETİM SÜRÜMÜ

import { supabase } from './supabase'

// --------------------------------------------------
// Tip Tanımları
// --------------------------------------------------

export const EVENT_TYPES = [
  'daily_reflection',
  'session_start',
  'session_end',
  'mood_comparison_note',
  'text_session',
  'voice_session',
  'video_session',
  'diary_entry',
  'dream_analysis',
  'ai_analysis',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export interface AppEvent {
  id: string
  user_id: string
  type: EventType
  timestamp: number
  created_at: string
  mood?: string
  data: Record<string, any> // JSON güvenliği ileride geliştirilebilir
}

// --------------------------------------------------
// AŞAMA 1: HAM OLAYLAR ('events')
// --------------------------------------------------

export async function logEvent(
  event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Olay kaydedilemiyor, kullanıcı giriş yapmamış.')

    const eventData = {
      ...event,
      user_id: user.id,
      timestamp: Date.now(),
    }

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select('id')
      .single()

    if (error) throw error
    __DEV__ && console.log(`✅ [Event] ${event.type} kaydedildi.`)

    return data.id.toString()
  } catch (error) {
    console.error('⛔️ Event log hatası:', (error as Error).message)
    return null
  }
}

export async function getEventsForLast(days: number): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as AppEvent[]) || []
  } catch (error) {
    console.error('⛔️ Event çekme hatası:', (error as Error).message)
    return []
  }
}

/**
 * Belirli bir event'i (olayı) ID'sine göre 'events' tablosundan siler.
 * @param eventId Silinecek olayın ID'si (string).
 */
export async function deleteEventById(eventId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, olay silinemiyor.');

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id); // ÖNEMLİ: Sadece kendi olayını silebildiğinden emin ol!

    if (error) throw error;
    __DEV__ && console.log(`✅ [Event] ID'si ${eventId} olan olay silindi.`);

  } catch (error) {
    console.error('⛔️ Olay silme hatası:', (error as Error).message);
    throw error; // Hatanın UI'a bildirilmesi için tekrar fırlat
  }
}

/**
 * Bir olayın 'data' JSON sütununu günceller. 
 * Özellikle diyalog gibi devam eden etkileşimleri kaydetmek için kullanılır.
 * @param eventId Güncellenecek olayın ID'si.
 * @param newData Yeni 'data' objesi.
 */
export async function updateEventData(eventId: string, newData: Record<string, any>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı bulunamadı, olay güncellenemiyor.');
    
    const { error } = await supabase
      .from('events')
      .update({ data: newData })
      .eq('id', eventId)
      .eq('user_id', user.id); // Sadece kendi olayını güncelleyebilsin.
    
    if (error) throw error;
    __DEV__ && console.log(`✅ [Event] ID'si ${eventId} olan olayın verisi güncellendi.`);
  } catch (error) {
    console.error('⛔️ Olay veri güncelleme hatası:', (error as Error).message);
    throw error;
  }
}

/**
 * Kullanıcının son 7 gün içinde rüya analizi yapıp yapmadığını kontrol eder.
 * Şimdilik haftada 1 ücretsiz analiz hakkı olduğunu varsayıyoruz.
 */
export async function canUserAnalyzeDream(): Promise<{ canAnalyze: boolean; daysRemaining: number }> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentDreamAnalyses = await getEventsForLast(7);
        const lastAnalysis = recentDreamAnalyses.find(e => e.type === 'dream_analysis');
        
        if (!lastAnalysis) {
            return { canAnalyze: true, daysRemaining: 0 };
        }
        
        const lastAnalysisDate = new Date(lastAnalysis.created_at);
        const nextAvailableDate = new Date(lastAnalysisDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        if (now >= nextAvailableDate) {
            return { canAnalyze: true, daysRemaining: 0 };
        } else {
            const diffTime = nextAvailableDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { canAnalyze: false, daysRemaining: daysRemaining };
        }
    } catch (e) {
        return { canAnalyze: false, daysRemaining: 7 };
    }
}

/**
 * Kullanıcının son 18 saat içinde bir günlük yazıp yazmadığını 
 * 'events' tablosundan kontrol eder. Bu kontrol cihazdan bağımsızdır.
 */
export async function canUserWriteNewDiary(): Promise<{ canWrite: boolean; message: string }> {
  try {
    // 1. Son 1 gün içindeki olayları çekmek yeterli.
    const recentEvents = await getEventsForLast(1);

    // 2. Bu olaylar içinden en son 'diary_entry' olayını bul.
    const lastDiaryEntry = recentEvents.find(e => e.type === 'diary_entry');

    // 3. Eğer son 24 saatte hiç günlük yazılmamışsa, izin ver.
    if (!lastDiaryEntry) {
      return { canWrite: true, message: '' };
    }

    // 4. Yazılmışsa, zaman farkını hesapla.
    const lastEntryTime = new Date(lastDiaryEntry.created_at).getTime();
    const currentTime = Date.now();
    const hoursPassed = (currentTime - lastEntryTime) / (1000 * 60 * 60);

    if (hoursPassed < 18) {
      const hoursRemaining = (18 - hoursPassed).toFixed(1);
      return {
        canWrite: false,
        message: `Bugün için bir günlük keşfi yaptın. Bir sonraki günlüğün için yaklaşık ${hoursRemaining} saat sonra tekrar bekliyor olacağım!`
      };
    }

    // 18 saatten fazla geçmişse, izin ver.
    return { canWrite: true, message: '' };

  } catch (error) {
    console.error('Günlük yazma izni kontrolü hatası:', (error as Error).message);
    return {
      canWrite: false,
      message: 'Günlük yazma izni kontrol edilirken bir hata oluştu.'
    };
  }
}

// --------------------------------------------------
// AŞAMA 2: KOLEKTİF BİLİNÇ YÖNETİMİ (Vault & Journey)
// --------------------------------------------------

export interface VaultData {
  traits?: Record<string, any>
  memories?: any[]
  [key: string]: any
}

export async function getUserVault(): Promise<VaultData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('user_vaults')
      .select('vault_data')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data?.vault_data || null
  } catch (error) {
    console.error('⛔️ Vault getirme hatası:', (error as Error).message)
    return null
  }
}

export async function updateUserVault(newVaultData: VaultData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_vaults')
      .upsert({
        user_id: user.id,
        vault_data: newVaultData,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error
    __DEV__ && console.log('✅ [Vault] Güncellendi.')
  } catch (error) {
    console.error('⛔️ Vault update hatası:', (error as Error).message)
  }
}

// --------------------------------------------------
// AŞAMA 3: SEYİR DEFTERİ (Journey Logs)
// --------------------------------------------------

export async function addJourneyLogEntry(logText: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('journey_logs')
      .insert({ user_id: user.id, log_text: logText })

    if (error) throw error
    __DEV__ && console.log('✅ [Journey] Yeni giriş eklendi.')
  } catch (error) {
    console.error('⛔️ Journey log hatası:', (error as Error).message)
  }
}

export async function getRecentJourneyLogEntries(limit = 5): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('journey_logs')
      .select('log_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data?.map(entry => entry.log_text) || []).reverse()
  } catch (error) {
    console.error('⛔️ Journey getirme hatası:', (error as Error).message)
    return []
  }
}

/**
 * Giriş yapmış kullanıcının tüm geçmiş seanslarını (text, voice, video) çeker.
 * @returns Kullanıcının seans event'lerini içeren bir dizi.
 */
export async function getSessionEventsForUser(): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['text_session', 'voice_session', 'video_session']) // Sadece seansları al
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as AppEvent[]) || [];

  } catch (error) {
    console.error('⛔️ Geçmiş seansları çekme hatası:', (error as Error).message);
    return [];
  }
}

// --------------------------------------------------
// AŞAMA 4: TEHLİKELİ BÖLGE (TÜM VERİLERİ SİLME)
// --------------------------------------------------

/**
 * Giriş yapmış olan kullanıcının tüm Kolektif Bilinç verilerini (events, vault, journey)
 * veritabanından kalıcı olarak siler. Bu işlem geri alınamaz.
 */
export async function deleteAllUserData(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı bulunamadı. Silme işlemi yapılamadı.');

    __DEV__ && console.log(`[DANGER ZONE] ${user.id} için tüm veriler siliniyor...`);

    // Tüm silme işlemlerini paralel olarak başlatıyoruz.
    const [eventsResult, vaultResult, journeyResult] = await Promise.all([
      supabase.from('events').delete().eq('user_id', user.id),
      supabase.from('user_vaults').delete().eq('user_id', user.id),
      supabase.from('journey_logs').delete().eq('user_id', user.id)
    ]);

    // Hata kontrolü
    if (eventsResult.error) throw eventsResult.error;
    if (vaultResult.error) throw vaultResult.error;
    if (journeyResult.error) throw journeyResult.error;

    __DEV__ && console.log(`✅ [DANGER ZONE] Kullanıcı verileri başarıyla silindi.`);
    
  } catch (error) {
    console.error('⛔️ Tüm kullanıcı verilerini silme hatası:', (error as Error).message);
    // Hatanın UI katmanına da ulaşması için tekrar fırlatıyoruz.
    throw error;
  }
}

// --------------------------------------------------
// AŞAMA 5: TRAIT YÖNETİMİ
// --------------------------------------------------

export const traitKeys = [
  'confidence', 'anxiety_level', 'extraversion', 'openness', 'neuroticism',
  'writing_style', 'preferred_tone', 'attachment_style', 'conflict_response',
] as const;

export type TraitKey = (typeof traitKeys)[number];
export type TraitValue = number | string;
export type Traits = Partial<Record<TraitKey, TraitValue>>;

// Seçenekleri daha sofistike hale getiriyoruz.
interface UpdateTraitOptions {
  /**
   * 'overwrite': Eski veriyi yok say, yeni veriyi doğrudan yaz.
   * 'average': Üstel hareketli ortalama kullanarak eski veriyle harmanla.
   */
  mode: 'overwrite' | 'average';
  /**
   * Öğrenme katsayısı (alpha). 0.01 (çok yavaş öğrenen) ile 0.99 (çok hızlı öğrenen) arasında.
   * Sadece 'average' modunda geçerlidir.
   * Varsayılan değer, sistemin ani değişimlere aşırı tepki vermesini engelleyen 0.1'dir.
   */
  alpha?: number;
}

/**
 * Kullanıcının tek bir kişilik özelliğini (trait) akıllıca günceller.
 * Bu fonksiyon, bir bilincin hafıza bütünlüğünü korumak için tasarlanmıştır.
 * @param key Güncellenecek özellik. Tip güvenliği için `TraitKey` olmalıdır.
 * @param value Yeni gelen değer.
 * @param options Güncelleme stratejisini belirler.
 */
export async function updateTrait<K extends TraitKey>(
  key: K,
  value: Traits[K],
  options: UpdateTraitOptions = { mode: 'average', alpha: 0.1 }
): Promise<void> {
  // Varsayılan alpha değerini atayalım
  const alpha = options.alpha ?? 0.1;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('YETKİLENDİRME BAŞARISIZ: Trait güncellemesi için kullanıcı oturumu şarttır.');

    const currentVault = await getUserVault();
    // Vault'u kopyalamak yerine yeni bir nesne oluşturmak daha temiz.
    const newVault = currentVault ? JSON.parse(JSON.stringify(currentVault)) : { traits: {} };

    if (!newVault.traits) {
      newVault.traits = {};
    }

    const currentValue = newVault.traits[key];

    // --- ÇEKİRDEK GÜNCELLEME MANTIĞI ---

    let finalValue = value; // Varsayılan olarak gelen değeri ata

    // Sadece 'average' modu ve numerik değerler için ortalama al.
    // 'writing_style' gibi metinsel bir özelliği ortalamaya çalışmak aptalcadır.
    if (options.mode === 'average' && typeof value === 'number') {
      if (typeof currentValue === 'number') {
        // Mevcut bir değer var: EMA formülünü uygula.
        const weightedAverage = (alpha * value) + ((1 - alpha) * currentValue);
        // Değerin sapıtmasını engellemek için 0-1 aralığına sıkıştıralım (clamping).
        // Bu, sistemin kendi kendini kalibre etmesini sağlar.
        finalValue = Math.max(0, Math.min(1, weightedAverage));
        __DEV__ && console.log(`[TRAIT-EMA] '${key}' güncellendi. Eski: ${currentValue.toFixed(3)}, Gelen: ${value.toFixed(3)}, Yeni: ${finalValue.toFixed(3)}, α=${alpha}`);
      } else {
        // Mevcut bir değer yok (ilk defa set ediliyor) veya mevcut değer sayı değil.
        // Bu durumda yeni değeri doğrudan ata.
        finalValue = Math.max(0, Math.min(1, value)); // Yine de clamp et
         __DEV__ && console.log(`[TRAIT-INIT] '${key}' ilk kez set edildi: ${finalValue.toFixed(3)}`);
      }
    } else {
      // 'overwrite' modu veya metinsel değerler için: Direkt üzerine yaz.
       __DEV__ && console.log(`[TRAIT-OVR] '${key}' üzerine yazıldı: ${value}`);
    }

    newVault.traits[key] = finalValue;

    // Vault'u veritabanında atomik olarak güncelle.
    await updateUserVault(newVault);

  } catch (error) {
    // Hata mesajları net ve izlenebilir olmalı.
    console.error(`⛔️ [TRAIT-CRITICAL] '${key}' özelliği güncellenirken sistem hatası oluştu.`, error);
  }
}