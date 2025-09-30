// services/event.service.ts
import { isDev } from "../utils/dev";
import { supabase } from "../utils/supabase";
import {
  AppEventSchema,
  DiaryEventsArraySchema,
} from "../schemas/diary.schema";
import type { z } from "zod";
import { getUsageStats } from "./subscription.service";
import { extractContentFromEvent } from "../utils/event-helpers";

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
  // Misafir akışı event'leri
  "primer_seen",
  "guest_start",
  "chip_select",
  "free_report_view",
  "softwall_open",
  "register_click",
  "register_success",
  // Mood reveal events
  "mood_reveal_seen",
  "mood_reveal_continue",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface AppEvent {
  id: string;
  user_id: string;
  type: EventType;
  timestamp: number; // Schema'da string'den number'a çevriliyor
  created_at: string;
  mood?: string;
  data: { [key: string]: import("../types/json.ts").JsonValue };
}

export type DiaryAppEvent = z.infer<typeof AppEventSchema>;

export type EventPayload = Omit<
  AppEvent,
  "id" | "user_id" | "timestamp" | "created_at"
>;

export async function logEvent(
  event: Omit<AppEvent, "id" | "user_id" | "timestamp" | "created_at">,
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // ⬇️ Misafir: şimdilik DB'ye yazma, sessizce geç
    if (!user) {
      if (isDev()) {
        console.debug(`[GuestEvent] ${event.type}`, event.data ?? {});
      }
      return null;
    }

    const eventData = { ...event, user_id: user.id }; // timestamp'ı kaldır - veritabanı otomatik doldursun
    const { data: inserted, error } = await supabase.from("events").insert([
      eventData,
    ])
      .select("id, created_at, data, type, mood").single();
    if (error) throw error;
    if (isDev()) console.log(`✅ [Event] ${event.type} kaydedildi.`);

    // İşlem zinciri için transactionId üret (RN ortamında fallback'li)
    const generateId = (): string =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    const transactionId = (globalThis.crypto &&
        typeof (globalThis.crypto as unknown as { randomUUID?: () => string })
            .randomUUID === "function")
      ? (globalThis.crypto as unknown as { randomUUID: () => string })
        .randomUUID()
      : generateId();

    // --- BİLİNÇ İŞLEME DEVRESİ ---
    // Event loglandıktan sonra, eğer analiz edilebilir bir içerik varsa,
    // bu içerik arkaplanda "beyin" tarafından işlenir.
    // Bu işlem "ateşle ve unut" prensibiyle çalışır, UI beklemez.
    const contentToAnalyze = extractContentFromEvent({
      type: inserted?.type as string,
      data: inserted?.data as Record<string, unknown> | null,
    }) ?? undefined;

    if (contentToAnalyze && inserted) {
      console.log(
        `🧠 [Event Brain][${transactionId}] Bilinç işleme tetikleniyor: ${event.type}`,
      );

      // ARKA PLANDA ÇALIŞACAK BEYİN FONKSİYONU
      // AWAIT KULLANMA! UI bunu beklememeli. Bu "ateşle ve unut" tarzı bir çağrı.
      supabase.functions.invoke("process-memory", {
        body: {
          source_event_id: inserted.id,
          user_id: user.id,
          content: contentToAnalyze,
          event_time: inserted.created_at,
          mood: inserted.mood,
          event_type: event.type,
          transaction_id: transactionId,
        },
      }).catch((err) =>
        console.error(
          `⛔️ Arka plan hafıza işleme hatası [${transactionId}]:`,
          err,
        )
      );
    }

    // TODO: Faz 2 - update_user_dna fonksiyonu, bu olaydan sonra
    // kullanıcının genetik haritasını (traits, core beliefs) günceller.
    // Örnek: "Terk edilme korkusu" +1 puan.

    return inserted.id.toString();
  } catch (error) {
    console.error("⛔️ Event log hatası:", (error as Error).message);
    throw error;
  }
}

// YENİ VE DAHA DOĞRU FONKSİYON: Pagination için sayfa parametresi alır.
export async function getDreamEvents(
  { pageParam }: { pageParam?: number },
): Promise<AppEvent[]> {
  const PAGE_SIZE = 20; // Bunu bir constants dosyasına taşı.
  const offset = (pageParam || 0) * PAGE_SIZE;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id) // Sadece bu kullanıcının
    .eq("type", "dream_analysis") // Sadece rüya analizleri
    .order("created_at", { ascending: false }) // En yeniden eskiye
    .range(offset, offset + PAGE_SIZE - 1); // Sayfalama burada

  if (error) {
    console.error("⛔️ Rüya eventlerini çekme hatası:", error);
    throw new Error("Rüya günlükleri yüklenemedi.");
  }

  return (data as AppEvent[]) || [];
}

export async function deleteEventById(eventId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı giriş yapmamış, olay silinemiyor.");
    const { error } = await supabase.from("events").delete().eq("id", eventId)
      .eq("user_id", user.id);
    if (error) throw error;
    if (isDev()) console.log(`✅ [Event] ID'si ${eventId} olan olay silindi.`);
  } catch (error) {
    console.error("⛔️ Olay silme hatası:", (error as Error).message);
    throw error;
  }
}

export async function updateEventData(
  eventId: string,
  newData: { [key: string]: import("../types/json.ts").JsonValue },
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı, olay güncellenemiyor.");
    const { error } = await supabase.from("events").update({ data: newData })
      .eq("id", eventId).eq("user_id", user.id);
    if (error) throw error;
    if (isDev()) {
      console.log(
        `✅ [Event] ID'si ${eventId} olan olayın verisi güncellendi.`,
      );
    }
  } catch (error) {
    console.error("⛔️ Olay veri güncelleme hatası:", (error as Error).message);
    throw error;
  }
}

export function canUserAnalyzeDream(): {
  canAnalyze: boolean;
  daysRemaining: number;
} {
  return { canAnalyze: true, daysRemaining: 0 };
}

export async function canUserWriteNewDiary(): Promise<
  { canWrite: boolean; message: string }
> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const usageStats = await getUsageStats();
    if (!usageStats) {
      throw new Error("Kullanım istatistikleri alınamadı.");
    }

    const diaryUsage = usageStats.diary_write;
    if (diaryUsage.can_use) {
      return { canWrite: true, message: "" };
    } else {
      return {
        canWrite: false,
        message:
          `Bu özellik için günlük limitine ulaştın. Sınırsız yazmak için Premium'a geçebilirsin.`,
      };
    }
  } catch (error) {
    console.error(
      "Günlük yazma izni kontrolü hatası:",
      (error as Error).message,
    );
    throw error;
  }
}

export async function getSessionEventsForUser(): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış, seanslar çekilemedi.");
    }
    const { data, error } = await supabase.from("events").select("*").eq(
      "user_id",
      user.id,
    ).in("type", ["text_session", "voice_session", "video_session"]).order(
      "created_at",
      { ascending: false },
    );
    if (error) throw error;
    return (data as AppEvent[]) || [];
  } catch (error) {
    console.error(
      "⛔️ Geçmiş seansları çekme hatası:",
      (error as Error).message,
    );
    throw error;
  }
}

// Yalnızca günlük (diary_entry) event'lerini getirir
export async function getDiaryEventsForUser(): Promise<DiaryAppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış, günlükler çekilemedi.");
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "diary_entry")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return DiaryEventsArraySchema.parse(data || []);
  } catch (error) {
    console.error("⛔️ Günlük verisi doğrulama hatası:", error);
    throw error;
  }
}

export async function getAIAnalysisEvents(): Promise<AppEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(
        "Kullanıcı giriş yapmamış, AI analiz olayları çekilemiyor.",
      );
    }
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "ai_analysis") // Sadece AI analizlerini filtrele
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as AppEvent[]) || [];
  } catch (error) {
    console.error(
      "⛔️ AI analiz olayları çekme hatası:",
      (error as Error).message,
    );
    throw error;
  }
}

export async function getOldestEventDate(): Promise<Date | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(
        "Kullanıcı giriş yapmamış, en eski olay tarihi çekilemiyor.",
      );
    }
    const { data, error } = await supabase
      .from("events")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }) // En eskiyi bul
      .limit(1)
      .single();
    // PGRST116 (tek kayıt beklenirken kayıt bulunamadı) hatası normaldir, o zaman null döneriz.
    if (error && error.code !== "PGRST116") throw error;
    return data ? new Date(data.created_at) : null;
  } catch (error) {
    console.error(
      "⛔️ En eski olay tarihi çekme hatası:",
      (error as Error).message,
    );
    throw error;
  }
}

export async function getEventById(eventId: string): Promise<AppEvent | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı giriş yapmamış, olay çekilemedi.");

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Kayıt bulunamadı, bu bir hata değil.
      throw error;
    }
    return data as AppEvent;
  } catch (error) {
    console.error(
      `⛔️ Event (ID: ${eventId}) çekme hatası:`,
      (error as Error).message,
    );
    throw error;
  }
}

// Bir metin tabanlı terapi seansı sırasındaki olaylar
export type TextSessionEventData = {
  userMessage: string;
  therapistPersona?: string; // AI kişiliğini doğrudan iletmek için eklendi
  initialMood?: string;
  finalMood?: string;
};

// 🔥🔥🔥 KAYIP FONKSİYON BURAYA EKLENİYOR 🔥🔥🔥
export async function getEventsForLast(days: number): Promise<AppEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  // Son 'days' günlük zaman aralığını hesapla
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", fromDate.toISOString()) // Belirtilen günden bugüne
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`⛔️ Son ${days} günlük olayları çekme hatası:`, error);
    throw new Error("Geçmiş olaylar yüklenemedi.");
  }

  return (data as AppEvent[]) || [];
}

// YENİ: Session özetleri için yardımcı fonksiyon
export async function getSessionSummariesForEventIds(
  eventIds: string[],
): Promise<Record<string, string>> {
  if (eventIds.length === 0) return {};
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  // Özetler cognitive_memories tablosunda 'text_session_summary' olarak tutulur
  const { data, error } = await supabase
    .from("cognitive_memories")
    .select("source_event_id, content, event_type")
    .in("source_event_id", eventIds)
    .eq("event_type", "text_session_summary")
    .eq("user_id", user.id);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    map[row.source_event_id] = String(row.content);
  }
  return map;
}

// YENİ: Belirli bir text_session event'ine bağlı özeti getirir (session_end veya cognitive_memories üzerinden)
export async function getSummaryForSessionEvent(
  eventId: string,
  createdAt?: string,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  // 1) İlgili text_session event'inin zamanını al (gerekirse)
  let textSessionCreatedAt: string | null = createdAt ?? null;
  if (!textSessionCreatedAt) {
    const { data: textSession, error: tsErr } = await supabase
      .from("events")
      .select("created_at, type")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (tsErr) {
      console.warn("Text session fetch hata:", tsErr);
    }
    textSessionCreatedAt = textSession?.created_at ?? null;
  }

  // Güvenli: Önce doğrudan bu eventId için 'text_session_summary' var mı bak
  const { data: cmDirect, error: cmDirectErr } = await supabase
    .from("cognitive_memories")
    .select("content")
    .eq("source_event_id", eventId)
    .eq("event_type", "text_session_summary")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (cmDirectErr) {
    console.warn("cognitive_memories direct fetch hata:", cmDirectErr);
  }
  if (cmDirect?.content) return String(cmDirect.content);

  // 2) Normal yol: text_session'dan SONRAKİ ilk session_end'i bul
  if (textSessionCreatedAt) {
    const { data: nextSessionEnd, error: nseErr } = await supabase
      .from("events")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("type", "session_end")
      .gte("created_at", textSessionCreatedAt)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nseErr) {
      console.warn("Next session_end fetch hata:", nseErr);
    }
    if (nextSessionEnd?.id) {
      const { data: cmAfter, error: cmAfterErr } = await supabase
        .from("cognitive_memories")
        .select("content")
        .eq("source_event_id", nextSessionEnd.id)
        .eq("event_type", "text_session_summary")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (cmAfterErr) {
        console.warn(
          "cognitive_memories after session_end fetch hata:",
          cmAfterErr,
        );
      }
      if (cmAfter?.content) return String(cmAfter.content);
    }

    // 3) Ek güvenli fallback: Zaman penceresiyle ara (ilk gelen özet)
    // Zaman penceresi: text_session'dan sonraki ilk 24 saat içinde gelen özet
    const oneDayLater = new Date(
      new Date(textSessionCreatedAt).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: cmByTime, error: cmByTimeErr } = await supabase
      .from("cognitive_memories")
      .select("content, event_time")
      .eq("user_id", user.id)
      .eq("event_type", "text_session_summary")
      .gte("event_time", textSessionCreatedAt)
      .lte("event_time", oneDayLater)
      .order("event_time", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (cmByTimeErr) {
      console.warn("cognitive_memories time window fetch hata:", cmByTimeErr);
    }
    if (cmByTime?.content) return String(cmByTime.content);
  }

  return null;
}
