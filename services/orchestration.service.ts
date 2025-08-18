// services/orchestration.service.ts

import { InteractionContext } from "../types/context";
import { ApiError } from "../utils/errors";
import { ControlledHybridPipeline } from "./controlled-hybrid-pipeline.service";
import { EventPayload } from "./event.service";
import { DiaryStart } from "../utils/schemas";
import { SystemHealthMonitor } from "./system-health-monitor.service";
import * as VaultService from "./vault.service";
import { supabase } from "../utils/supabase";
type OrchestratorSuccessResult = string | DiaryStart | {
  success: boolean;
  message: string;
};

// React Native uyumlu UUID generator
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function processUserMessage(
  userId: string,
  eventPayload: EventPayload,
): Promise<OrchestratorSuccessResult> {
  // 1. İşlem bağlamını oluştur
  console.log(
    `[ORCHESTRATOR] 🎯 Tek Beyin - İşlem başlıyor: ${eventPayload.type}`,
  );
  const initialVault = await VaultService.getUserVault() ?? {};

  const context: InteractionContext = {
    transactionId: generateId(),
    userId,
    initialVault,
    initialEvent: {
      ...eventPayload,
      id: generateId(),
      user_id: userId,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
    },
    derivedData: {},
  };

  // 2. SİSTEM SAĞLIĞINI KONTROL ET
  const systemHealth = await SystemHealthMonitor.evaluateSystemHealth();
  console.log(
    `[ORCHESTRATOR] 🏥 Sistem sağlığı: ${systemHealth.health_score}/100`,
  );

  // EĞER SAĞLIK KÖTÜYSE, BASİT BİR CEVAP VER VE ÇIK
  if (systemHealth.health_score < 60) {
    console.warn(
      `[ORCHESTRATOR] ⚠️ Sistem sağlığı kritik (${systemHealth.health_score}), basit cevap moduna geçiliyor.`,
    );
    return "Sistem şu an yoğun, lütfen daha sonra tekrar deneyin.";
  }

  // 3. DOĞRU PİPELİNE'I BELİRLE VE BEYNE GÖNDER
  const pipelineType = determinePipelineType(eventPayload.type);
  console.log(`[ORCHESTRATOR] 🧠 Pipeline tipi belirlendi: ${pipelineType}`);

  try {
    // 4. BEYNİ (PIPELINE'I) ÇAĞIR
    const result = await ControlledHybridPipeline.executeComplexQuery(
      context,
      pipelineType,
    );

    // Sonuca insanlık hatırlatıcısı ekle
    return ensureHumanityReminder(result);
  } catch (error) {
    console.error(
      `[ORCHESTRATOR] ❌ Pipeline işlemi sırasında kritik hata:`,
      error,
    );
    // Hata durumunda kullanıcıya anlamlı bir mesaj ver
    throw new ApiError("İsteğiniz işlenirken bir sorun oluştu.");
  }
}

// Yeni sözleşme tipleri
export interface ConversationPayload {
  userInput: string;
  conversationId: string | null;
  turn: number;
}
export interface ConversationResponse {
  aiResponse: string;
  nextQuestions?: string[];
  isFinal: boolean;
  conversationId: string;
}

// BU FONKSİYON GÜNCELLENDİ: Günlük konuşması tetikleyicisi
export async function processUserEvent(
  eventPayload: { type: "diary_entry"; data: ConversationPayload },
): Promise<ConversationResponse> {
  const { data, error } = await supabase.functions.invoke("orchestrator", {
    body: { eventPayload },
  });

  if (error) {
    console.error("Orchestrator function invoke error:", error);
    throw new Error(error.message);
  }

  return data as ConversationResponse;
}

// Rüya analizi için dar tipli yardımcı
export async function processDreamAnalysisEvent(
  eventPayload: { type: "dream_analysis"; data: { dreamText: string } },
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("orchestrator", {
    body: { eventPayload },
  });

  if (error) {
    console.error("Orchestrator function invoke error:", error);
    throw new Error(error.message);
  }

  // Beklenen sözleşme: { eventId: string }
  if (
    data && typeof data === "object" &&
    "eventId" in (data as Record<string, unknown>) &&
    typeof (data as { eventId?: unknown }).eventId === "string"
  ) {
    return (data as { eventId: string }).eventId;
  }

  console.error("Beklenmedik yanıt formatı:", data);
  throw new Error("Sunucudan geçersiz analiz ID'si formatı alındı.");
}

/**
 * Event tipine göre uygun pipeline tipini belirle
 */
function determinePipelineType(
  eventType: string,
):
  | "deep_analysis"
  | "pattern_discovery"
  | "insight_synthesis"
  | "therapy_session"
  | "dream_analysis"
  | "diary_management"
  | "daily_reflection" {
  switch (eventType) {
    case "text_session":
    case "voice_session":
    case "video_session":
      return "therapy_session"; // Terapi seansları için özel pipeline

    case "dream_analysis":
      return "dream_analysis"; // Rüya analizi için özel pipeline

    case "daily_reflection":
      return "daily_reflection"; // Günlük yansıma için özel pipeline

    case "diary_entry":
      return "diary_management"; // Günlük giriş için özel pipeline

    case "ai_analysis":
      return "deep_analysis"; // AI analizi için derin analiz

    case "onboarding_completed":
      return "insight_synthesis"; // Onboarding için içgörü sentezi

    default:
      console.log(
        `[ORCHESTRATOR] ⚠️ Bilinmeyen event tipi: ${eventType}, varsayılan pipeline kullanılıyor`,
      );
      return "deep_analysis"; // Varsayılan olarak derin analiz
  }
}

/**
 * Tüm AI cevaplarının dürüst olmasını sağlar - "Ben bir makineyim" anımsatıcısı
 */
function ensureHumanityReminder(
  result: OrchestratorSuccessResult,
): OrchestratorSuccessResult {
  // Eğer sonuç string ise (çoğu durumda böyle)
  if (typeof result === "string") {
    const reminder =
      "\n\n---\n💭 **Unutma:** Ben senin düşüncelerini anlamana yardımcı olan bir aracım. Nihai kararlar ve hisler sana aittir.";

    // Zaten reminder varsa eklemeyiz
    if (
      result.includes("Unutma") || result.includes("Ben senin") ||
      result.includes("bir aracım")
    ) {
      return result;
    }

    return result + reminder;
  }

  // DiaryStart veya diğer object tiplerinde reminder eklemeyiz
  // Çünkü onlar UI'da farklı şekilde işleniyor
  return result;
}
