// supabase/functions/_shared/orchestration.service.ts

import { ControlledHybridPipeline } from "./controlled-hybrid-pipeline.service.ts";
import { ApiError } from "./errors.ts";
import type { EventPayload } from "./event.service.ts";
import { SystemHealthMonitor } from "./system-health-monitor.service.ts";
import type { InteractionContext } from "./types/context.ts";
import { LoggingService } from "./utils/LoggingService.ts";

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
): Promise<string> {
  // 1. İşlem bağlamını oluştur
  console.log(
    `[ORCHESTRATOR] 🎯 Tek Beyin - İşlem başlıyor: ${eventPayload.type}`,
  );

  // Basit vault objesi - gerçek vault verisi create-analysis-report'ta alınacak
  const initialVault = {};
  const transactionId = generateId();

  // Logger oluştur
  const logger = new LoggingService(transactionId, userId);

  const context: InteractionContext = {
    transactionId,
    userId,
    initialVault,
    initialEvent: {
      ...eventPayload,
      id: generateId(),
      user_id: userId,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
    },
    logger,
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
    return ensureHumanityReminder(String(result));
  } catch (error) {
    console.error(
      `[ORCHESTRATOR] ❌ Pipeline işlemi sırasında kritik hata:`,
      error,
    );
    // Hata durumunda kullanıcıya anlamlı bir mesaj ver
    throw new ApiError("İsteğiniz işlenirken bir sorun oluştu.");
  }
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
  result: string,
): string {
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
