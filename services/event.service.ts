// services/event.service.ts
import { isDev } from "../utils/dev";
import { supabase } from "../utils/supabase";
import {
  AppEventSchema,
  DiaryEventsArraySchema,
} from "../schemas/diary.schema";
import type { z } from "zod";
import { getUsageStatsForUser } from "./subscription.service"; // Üst kısma ekle
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
    if (!user) {
      throw new Error("Olay kaydedilemiyor, kullanıcı giriş yapmamış.");
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
    .order("timestamp", { ascending: false }) // En yeniden eskiye
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

export async function canUserAnalyzeDream(): Promise<
  { canAnalyze: boolean; daysRemaining: number }
> {
  return { canAnalyze: true, daysRemaining: 0 };
}

export async function canUserWriteNewDiary(): Promise<
  { canWrite: boolean; message: string }
> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const usage = await getUsageStatsForUser(user.id, "diary_write");
    if (usage.can_use) {
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
    .order("timestamp", { ascending: false });

  if (error) {
    console.error(`⛔️ Son ${days} günlük olayları çekme hatası:`, error);
    throw new Error("Geçmiş olaylar yüklenemedi.");
  }

  return (data as AppEvent[]) || [];
}
