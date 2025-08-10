// services/orchestration.service.ts

import { InteractionContext } from "../types/context";
// 🚨 FAZ 0: AGENTIC CORE DEVRE DIŞI (STABİLİZASYON)
// import { askMainBrain, checkMainBrainHealth } from "./agentic.service";

// 🎯 FAZ 1: STRATEJİK SORGU YÖNLENDİRİCİ ENTEGRASYONU
import { EventPayload } from "./event.service";
import {
  eventHandlers,
  OrchestratorSuccessResult,
} from "./orchestration.handlers";
import { StrategicQueryRouter } from "./strategic-query-router.service";
import { SystemHealthMonitor } from "./system-health-monitor.service";
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
 * 🎯 FAZ 1: STRATEJİK SORGU YÖNLENDİRİCİ MODU
 *
 * Gemini 2.5 Pro anlaşması uyarınca:
 * ✅ Tek API çağrısı ile maksimum değer
 * ✅ Akıllı veri toplama ve birleştirme
 * ✅ Somut sistem sağlık metrikleri
 * ✅ Maliyet optimizasyonu
 * ✅ Yüksek güvenilirlik
 *
 * FAZ 0: Ana beyin devre dışı ✅
 * FAZ 1: Strategic Router aktif ✅
 * FAZ 2: Kontrollü hibrit sistem (gelecek)
 */
export async function processUserMessage(
  userId: string,
  eventPayload: EventPayload,
): Promise<OrchestratorSuccessResult> {
  // 1. İŞLEM BAŞLIYOR: Bağlamı oluştur.
  console.log(
    `[ORCHESTRATOR] 🎯 FAZ 1 Strategic Router - İşlem başlıyor: ${eventPayload.type}`,
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

  // 🎯 FAZ 1: STRATEJİK SORGU YÖNLENDİRİCİ AKTIF
  // Gemini 2.5 Pro anlaşması: Tek API çağrısı ile maksimum değer

  // Sistem sağlığını kontrol et
  const systemHealth = await SystemHealthMonitor.evaluateSystemHealth();
  console.log(
    `[ORCHESTRATOR] 🏥 Sistem sağlığı: ${systemHealth.overall_health} (${systemHealth.health_score}/100)`,
  );

  // Stratejik router'ı kullanmaya uygun mu?
  const shouldUseRouter = shouldUseStrategicRouter(eventPayload, systemHealth);

  if (shouldUseRouter) {
    console.log(
      `[ORCHESTRATOR] 🎯 Strategic Router kullanılıyor: ${eventPayload.type}`,
    );

    try {
      const strategicResult = await StrategicQueryRouter.handleSimpleQuery(
        context,
      );
      return ensureHumanityReminder(strategicResult);
    } catch (strategicError) {
      console.warn(
        `[ORCHESTRATOR] ⚠️ Strategic Router hatası, geleneksel sisteme geçiliyor:`,
        strategicError,
      );
      // Hata durumunda geleneksel sisteme devam et
    }
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
      `[ORCHESTRATOR] 📋 Geleneksel handler kullanılıyor (fallback): '${eventPayload.type}'`,
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

// 🎯 FAZ 1: STRATEJİK ROUTER KARAR FONKSİYONLARI

/**
 * Bu işlem Strategic Router tarafından mı işlenmeli?
 * Sistem sağlığı ve event tipi göz önünde bulundurulur.
 */
function shouldUseStrategicRouter(
  eventPayload: EventPayload,
  systemHealth: any,
): boolean {
  // Sistem sağlığı kötüyse geleneksel sistemi kullan
  if (systemHealth.health_score < 70) {
    console.log(
      `[ORCHESTRATOR] ⚠️ Sistem sağlığı düşük (${systemHealth.health_score}), geleneksel sistem kullanılıyor`,
    );
    return false;
  }

  // Strategic Router için uygun event tipleri
  const strategicRouterTypes = [
    "text_session", // Terapi seansları
    "dream_analysis", // Rüya analizleri
    "daily_reflection", // Günlük yansımalar
    "ai_analysis", // AI analizleri
  ];

  const shouldUse = strategicRouterTypes.includes(eventPayload.type);

  if (shouldUse) {
    console.log(
      `[ORCHESTRATOR] ✅ ${eventPayload.type} Strategic Router için uygun`,
    );
  } else {
    console.log(
      `[ORCHESTRATOR] ⏭️ ${eventPayload.type} geleneksel handler için uygun`,
    );
  }

  return shouldUse;
}

// 🚨 FAZ 0: ESKİ AGENTIC CORE FONKSİYONLARI (DEVRE DIŞI)
/*
function shouldUseAgenticCore(eventPayload: EventPayload): boolean {
  return false; // FAZ 0: Devre dışı
}

function createAgenticQuery(
  eventPayload: EventPayload,
  _context: InteractionContext,
): string {
  return ""; // FAZ 0: Kullanılmıyor
}
*/

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
