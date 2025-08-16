// supabase/functions/_shared/event.service.ts

export const EVENT_TYPES = [
  "daily_reflection",
  "session_start",
  "session_end",
  "mood_comparison_note",
  "text_session",
  "voice_session",
  "video_session",
  "diary_entry",
  "dream_analysis",
  "ai_analysis",
  "onboarding_completed",
  "diary_analysis_background",
  "daily_write_error",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface AppEvent {
  id: string;
  user_id: string;
  type: EventType;
  timestamp: number;
  created_at: string;
  mood?: string;
  data: { [key: string]: any };
}

export type EventPayload = Omit<
  AppEvent,
  "id" | "user_id" | "timestamp" | "created_at"
>;

// Basit event payload oluşturucu
export function createEventPayload(
  type: EventType,
  data: Record<string, any>,
  mood?: string
): EventPayload {
  return {
    type,
    data,
    mood,
  };
}

// Son X gündeki BÜTÜN olayları çekecek fonksiyon
export async function getEventsForLastDays(days: number, userId: string, adminClient: any): Promise<AppEvent[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await adminClient
        .from("events")
        .select("type, created_at, mood, data") // Sadece gerekli alanları çek
        .eq("user_id", userId)
        .gte("created_at", fromDate.toISOString())
        // ==========================================================
        // === İŞTE YENİ FİLTRE BURADA! ===
        // 'type' sütunu, 'ai_analysis' OLMAYANLARI getir.
        .not("type", "eq", "ai_analysis") 
        // ==========================================================
        .order("created_at", { ascending: false });

    if (error) {
        console.error(`Son ${days} günlük olaylar çekilirken hata:`, error);
        throw new Error("Geçmiş olaylar yüklenemedi.");
    }
    
    // Veri döndüğünden ve null olmadığından emin ol
    const filteredEvents = (data as AppEvent[]) || [];
    console.log(`[EventService] Toplam ${data?.length || 0} olay bulundu, ${filteredEvents.length} tanesi analiz için uygun.`);
    
    return filteredEvents;
}
