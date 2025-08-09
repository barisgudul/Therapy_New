// services/orchestration.service.ts

import { InteractionContext } from "../types/context";
import { askMainBrain, checkMainBrainHealth } from "./agentic.service";
import { EventPayload } from "./event.service";
import {
  eventHandlers,
  OrchestratorSuccessResult,
} from "./orchestration.handlers";
import * as VaultService from "./vault.service";

// React Native uyumlu UUID generator
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8); // == yerine === kullan
    return v.toString(16);
  });
}

/**
 * Kullanıcıdan gelen yeni bir terapi mesajını işler.
 * Bu fonksiyon, dinamik ve öğrenen bir AI beyni gibi davranır.
 *
 * YENİ: Agentic Core entegrasyonu - AI artık kendi kendine karar verebilir!
 */
export async function processUserMessage(
  userId: string,
  eventPayload: EventPayload,
): Promise<OrchestratorSuccessResult> {
  // 1. İŞLEM BAŞLIYOR: Bağlamı oluştur.
  console.log(`[ORCHESTRATOR] Yeni işlem başlıyor: ${eventPayload.type}`);
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

  // 🧠 YENİ: AGENTIC CORE KONTROLÜ
  // Eğer Ana Beyin aktifse ve bu bir karmaşık işlemse, ona devret
  try {
    const isMainBrainHealthy = await checkMainBrainHealth();
    const isComplexOperation = shouldUseAgenticCore(eventPayload);

    if (isMainBrainHealthy && isComplexOperation) {
      console.log(
        `[ORCHESTRATOR] 🧠 Ana Beyin'e yönlendiriliyor: ${eventPayload.type}`,
      );

      const agenticQuery = createAgenticQuery(eventPayload, context);
      const agenticResult = await askMainBrain(agenticQuery);

      console.log(`[ORCHESTRATOR] ✅ Ana Beyin cevabı alındı`);
      return ensureHumanityReminder(agenticResult);
    }
  } catch (agenticError) {
    console.warn(
      `[ORCHESTRATOR] ⚠️ Ana Beyin kullanılamadı, geleneksel sisteme geçiliyor:`,
      agenticError,
    );
    // Hata durumunda geleneksel sisteme devam et
  }

  // 2. GELENEKSEl HANDLER SİSTEMİ (Fallback)
  try {
    const handler = eventHandlers[eventPayload.type];

    if (!handler) {
      console.error(
        `[ORCHESTRATOR] Bilinmeyen event tipi için handler bulunamadı: ${eventPayload.type}`,
      );
      throw new Error(`Desteklenmeyen işlem: ${eventPayload.type}`);
    }

    console.log(
      `[ORCHESTRATOR] Geleneksel handler kullanılıyor: '${eventPayload.type}'`,
    );
    const handlerResult = await handler(context);
    return ensureHumanityReminder(handlerResult);
  } catch (error) {
    console.error(
      `[ORCHESTRATOR] İşlem sırasında kritik hata: ${context.transactionId}`,
      error,
    );
    throw error;
  }
}

/**
 * Bu işlem Agentic Core tarafından mı işlenmeli?
 * Karmaşık, çok adımlı işlemler Ana Beyin'e yönlendirilir.
 */
function shouldUseAgenticCore(eventPayload: EventPayload): boolean {
  const agenticOperations = [
    "text_session", // Terapi seansları
    "dream_analysis", // Rüya analizleri
    "ai_analysis", // AI analiz istekleri
    "daily_reflection", // Günlük yansımalar
  ];

  return agenticOperations.includes(eventPayload.type);
}

/**
 * EventPayload'ı Ana Beyin'in anlayacağı bir soruya çevirir
 */
function createAgenticQuery(
  eventPayload: EventPayload,
  _context: InteractionContext,
): string {
  const { type, data } = eventPayload;

  switch (type) {
    case "text_session":
      return `Kullanıcı benimle terapi seansı yapmak istiyor. Mesajı: "${data.userMessage}". Ona nasıl yardım edebilirim?`;

    case "dream_analysis":
      return `Kullanıcı rüyasını analiz etmemi istiyor. Rüya: "${data.dreamText}". Detaylı bir analiz yapabilir misin?`;

    case "ai_analysis":
      return `Kullanıcı ${data.days} günlük AI analizi istiyor. Kapsamlı bir değerlendirme yapabilir misin?`;

    case "daily_reflection":
      return `Kullanıcı bugünkü notuna yansıma istiyor. Not: "${data.todayNote}", Mood: "${data.todayMood}". Ona nasıl bir geri bildirim verebilirim?`;

    default:
      return `Kullanıcı ${type} işlemi gerçekleştirmek istiyor. Veri: ${
        JSON.stringify(data)
      }. Nasıl yardım edebilirim?`;
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

// === ZARIF VE YALGIN ORKESTRATÖR ===
// Tüm handler mantığı orchestration.handlers.ts'e taşındı.
// Bu dosya artık sadece bir "postacı" - gelen paketi doğru adrese yönlendiriyor.
