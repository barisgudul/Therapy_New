// services/event.service.ts
import { supabase } from '../utils/supabase';
import { getUsageStatsForUser } from './subscription.service'; // Üst kısma ekle

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
  'onboarding_completed',
  'diary_analysis_background',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface AppEvent {
  id: string;
  user_id: string;
  type: EventType;
  timestamp: number;
  created_at: string;
  mood?: string;
  data: Record<string, any>;
}

export type EventPayload = Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>;

export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Olay kaydedilemiyor, kullanıcı giriş yapmamış.');
    const eventData = { ...event, user_id: user.id, timestamp: Date.now() };
    const { data, error } = await supabase.from('events').insert([eventData]).select('id').single();
    if (error) throw error;
    __DEV__ && console.log(`✅ [Event] ${event.type} kaydedildi.`);
    return data.id.toString();
  } catch (error) {
    console.error('⛔️ Event log hatası:', (error as Error).message);
    throw error;
  }
}

export async function getEventsForLast(days: number): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, olay çekilemedi.');
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id).gte('created_at', fromDate.toISOString()).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AppEvent[]) || [];
  } catch (error) {
    console.error('⛔️ Event çekme hatası:', (error as Error).message);
    throw error;
  }
}

export async function deleteEventById(eventId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, olay silinemiyor.');
    const { error } = await supabase.from('events').delete().eq('id', eventId).eq('user_id', user.id);
    if (error) throw error;
    __DEV__ && console.log(`✅ [Event] ID'si ${eventId} olan olay silindi.`);
  } catch (error) {
    console.error('⛔️ Olay silme hatası:', (error as Error).message);
    throw error;
  }
}

export async function updateEventData(eventId: string, newData: Record<string, any>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı bulunamadı, olay güncellenemiyor.');
    const { error } = await supabase.from('events').update({ data: newData }).eq('id', eventId).eq('user_id', user.id);
    if (error) throw error;
    __DEV__ && console.log(`✅ [Event] ID'si ${eventId} olan olayın verisi güncellendi.`);
  } catch (error) {
    console.error('⛔️ Olay veri güncelleme hatası:', (error as Error).message);
    throw error;
  }
}

export async function canUserAnalyzeDream(): Promise<{ canAnalyze: boolean; daysRemaining: number }> {
  // 🔥 TEST MODU SİLİNDİ 🔥
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı.");
    
    const usage = await getUsageStatsForUser(user.id, 'dream_analysis');
    // 'daysRemaining' mantığı SQL tarafında daha karmaşık hale geleceği için şimdilik basitleştiriyoruz.
    // Sadece kullanıp kullanamayacağına odaklan.
    return { canAnalyze: usage.can_use, daysRemaining: 0 }; 
  } catch (e) {
    console.error("⛔️ Rüya analizi hakkı kontrol hatası:", e);
    return { canAnalyze: false, daysRemaining: 1 };
  }
}

export async function canUserWriteNewDiary(): Promise<{ canWrite: boolean; message: string }> {
  // 🔥 TEST MODU SİLİNDİ 🔥
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const usage = await getUsageStatsForUser(user.id, 'diary_write');
    if (usage.can_use) {
      return { canWrite: true, message: '' };
    } else {
      return {
        canWrite: false,
            message: `Bu özellik için günlük limitine ulaştın. Sınırsız yazmak için Premium'a geçebilirsin.`
      };
    }
  } catch (error) {
    console.error('Günlük yazma izni kontrolü hatası:', (error as Error).message);
    throw error;
  }
}

export async function getSessionEventsForUser(): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, seanslar çekilemedi.');
    const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id).in('type', ['text_session', 'voice_session', 'video_session']).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AppEvent[]) || [];
  } catch (error) {
    console.error('⛔️ Geçmiş seansları çekme hatası:', (error as Error).message);
    throw error;
  }
}

export async function getAIAnalysisEvents(): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, AI analiz olayları çekilemiyor.');
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'ai_analysis') // Sadece AI analizlerini filtrele
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AppEvent[]) || [];
  } catch (error) {
    console.error('⛔️ AI analiz olayları çekme hatası:', (error as Error).message);
    throw error;
  }
}

export async function getOldestEventDate(): Promise<Date | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı giriş yapmamış, en eski olay tarihi çekilemiyor.');
    const { data, error } = await supabase
      .from('events')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }) // En eskiyi bul
      .limit(1)
      .single();
    // PGRST116 (tek kayıt beklenirken kayıt bulunamadı) hatası normaldir, o zaman null döneriz.
    if (error && error.code !== 'PGRST116') throw error;
    return data ? new Date(data.created_at) : null;
  } catch (error) {
    console.error('⛔️ En eski olay tarihi çekme hatası:', (error as Error).message);
    throw error;
  }
}

// Bir metin tabanlı terapi seansı sırasındaki olaylar
export type TextSessionEventData = {
  userMessage: string;
  therapistId: string;
  therapistPersona?: string; // AI kişiliğini doğrudan iletmek için eklendi
  initialMood?: string;
  finalMood?: string;
}
