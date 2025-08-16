// services/orchestration.handlers.ts
import { PromptTemplate } from "@langchain/core/prompts";
import { InteractionContext } from "../types/context";
import { ValidationError } from "../utils/errors";
import { parseAndValidateJson } from "../utils/jsonValidator";
import { DiaryStart, DreamAnalysisResultSchema } from "../utils/schemas";
import * as AiService from "./ai.service";
import * as EventService from "./event.service";
import * as JourneyService from "./journey.service";
import * as RagService from "./rag.service";
import * as VaultService from "./vault.service";

// Orkestratörden dönebilecek tüm olası başarılı sonuç tipleri
export type OrchestratorSuccessResult =
    | string // Basit metin yanıtları (terapi, yansıma vb.) - Rüya analizi için eventId de döner
    | DiaryStart // Günlük başlangıç sonucu
    | { success: boolean; message: string }; // onboarding gibi işlemler için

// ===============================================
// YARDIMCI FONKSİYONLAR
// ===============================================

/**
 * Kullanıcının durumuna göre en uygun terapist KİŞİLİĞİNİ seçer ve
 * bu kişilikle adaptif yanıt fonksiyonunu çağırır.
 */
function selectTherapistFunction(context: InteractionContext): Promise<string> {
    const { initialEvent, initialVault } = context;
    const eventData = initialEvent.data as EventService.TextSessionEventData;

    // ÖNCELİK 1: Eğer event ile doğrudan bir kişilik gönderildiyse, onu kullan!
    if (eventData.therapistPersona) {
        console.log(
            `[ORCHESTRATOR] Doğrudan kişilik kullanılıyor: ${eventData.therapistPersona}`,
        );
        return AiService.generateAdaptiveTherapistReply(
            context,
            eventData.therapistPersona,
        );
    }

    // --- Fallback (Eğer persona gönderilmediyse, özelliklere göre adaptif seçim yap) ---
    const { traits } = initialVault;

    // Kaygı seviyesi yüksekse 'sakinleştirici' yaklaşım
    const anxiety = Number(traits?.anxiety_level);
    if (!Number.isNaN(anxiety) && anxiety > 0.7) {
        console.log(
            `[ORCHESTRATOR] Yüksek kaygı tespit edildi (${
                (anxiety * 100).toFixed(0)
            }%). 'calm' kişiliği seçiliyor.`,
        );
        return AiService.generateAdaptiveTherapistReply(context, "calm");
    }

    // Motivasyon düşükse 'motivasyonel' yaklaşım
    const motivation = Number(traits?.motivation);
    if (!Number.isNaN(motivation) && motivation < 0.4) {
        console.log(
            `[ORCHESTRATOR] Düşük motivasyon tespit edildi (${
                (motivation * 100).toFixed(0)
            }%). 'motivational' kişiliği seçiliyor.`,
        );
        return AiService.generateAdaptiveTherapistReply(
            context,
            "motivational",
        );
    }

    // Açıklık yüksekse 'analitik' yaklaşım
    const openness = Number(traits?.openness);
    if (!Number.isNaN(openness) && openness > 0.7) {
        console.log(
            `[ORCHESTRATOR] Yüksek açıklık tespit edildi (${
                (openness * 100).toFixed(0)
            }%). 'analytical' kişiliği seçiliyor.`,
        );
        return AiService.generateAdaptiveTherapistReply(context, "analytical");
    }

    // Hiçbir koşul karşılanmazsa 'varsayılan' yaklaşım
    console.log(
        `[ORCHESTRATOR] Standart ('default') terapist kişiliği seçiliyor.`,
    );
    return AiService.generateAdaptiveTherapistReply(context, "default");
}

/**
 * Mood'u vault'a kaydet ve mood history'yi güncelle
 */
async function updateMoodInVault(
    context: InteractionContext,
    mood: string,
): Promise<void> {
    if (!mood || mood === "belirsiz") return;

    const currentVault = context.initialVault;
    const moodHistory = currentVault.moodHistory || [];

    // Yeni mood entry'si
    const moodEntry = {
        mood: mood,
        timestamp: new Date().toISOString(),
        source: context.initialEvent.type,
    };

    // Mood history'ye ekle (son 30 günlük)
    const updatedMoodHistory = [...moodHistory, moodEntry].slice(-30);

    // Vault'u güncelle
    const updatedVault = {
        ...currentVault,
        currentMood: mood,
        lastMoodUpdate: new Date().toISOString(),
        moodHistory: updatedMoodHistory,
    };

    await VaultService.updateUserVault(updatedVault);
    console.log(
        `[ORCHESTRATOR] Mood güncellendi: ${mood} (${context.initialEvent.type})`,
    );
}

/**
 * Mood trend'ini analiz et
 */
function analyzeMoodTrend(context: InteractionContext): string | null {
    const { moodHistory } = context.initialVault;
    if (!moodHistory || moodHistory.length < 3) return null;

    const recentMoods = moodHistory.slice(-5).map((entry) => entry.mood);
    const positiveMoods = ["mutlu", "neşeli", "enerjik", "huzurlu", "güvenli"];
    const negativeMoods = ["üzgün", "kaygılı", "stresli", "yorgun", "kızgın"];

    const positiveCount =
        recentMoods.filter((mood) => positiveMoods.includes(mood)).length;
    const negativeCount =
        recentMoods.filter((mood) => negativeMoods.includes(mood)).length;

    if (positiveCount > negativeCount) return "pozitif_trend";
    if (negativeCount > positiveCount) return "negatif_trend";
    return "kararsız_trend";
}

// ===============================================
// HANDLER FONKSİYONLARI
// ===============================================

/**
 * Akıllı terapi seansı akışı
 */
async function handleTherapySession(
    context: InteractionContext,
): Promise<string> {
    const isSessionEnd = context.initialEvent.data.isSessionEnd === true;

    if (isSessionEnd) {
        console.log(
            `[ORCHESTRATOR] Seans sonu hafıza işlemi başlatılıyor: ${context.transactionId}`,
        );
        await EventService.logEvent({
            type: context.initialEvent.type,
            mood: String(context.initialEvent.data.finalMood ?? ""),
            data: {
                therapistId: String(
                    context.initialEvent.data.therapistId ?? "",
                ),
                messages: context.initialEvent.data.messages,
                // Diğer önemli meta-veriler...
            },
        });
        const memory = await AiService.analyzeSessionForMemory(context);
        if (memory) {
            if (memory.vaultUpdate) {
                const updatedVault = AiService.mergeVaultData(
                    context.initialVault,
                    memory.vaultUpdate,
                );
                await VaultService.updateUserVault(updatedVault);
            }
            if (memory.log) {
                await JourneyService.addJourneyLogEntry(memory.log);
            }
        }
        console.log(`[ORCHESTRATOR] Seans sonu işlemi tamamlandı.`);
        return "SESSION_ENDED_OK";
    } else {
        console.log(
            `[ORCHESTRATOR] Seans içi yanıt üretiliyor: ${context.transactionId}`,
        );
        const reply = await selectTherapistFunction(context);
        context.derivedData.generatedReply = reply;
        const moodTrend = analyzeMoodTrend(context);
        if (moodTrend) {
            context.derivedData.moodTrend = moodTrend;
        }
        return reply;
    }
}

/**
 * Rüya analizi akışı (YENİ VE AKILLI VERSİYON)
 * RAG pipeline'ını kullanarak, kullanıcının geçmişiyle bağlam kurar.
 */
export async function handleDreamAnalysis(
    context: InteractionContext,
): Promise<string> {
    console.log(
        `[ORCHESTRATOR] RAG tabanlı rüya analizi başlatılıyor: ${context.transactionId}`,
    );
    const { dreamText } = context.initialEvent.data;
    const userId = context.userId;

    try {
        const dreamPrompt = PromptTemplate.fromTemplate(`
    ### ROL & GÖREV ###
    Sen, keskin bir dedektif ve empatik bir psikolog yeteneklerine sahip bir AI'sın. Görevin, sana sunulan YENİ RÜYA'yı analiz etmek ve bu rüyanın, kullanıcının geçmiş anılarıyla olan GİZLİ BAĞLANTILARINI ortaya çıkarmaktır.

    ### VERİLER ###
    1.  **GEÇMİŞ ANILAR (Arşiv Dosyaları):** 
        {context}
    2.  **ANALİZ EDİLECEK YENİ RÜYA (Vaka Dosyası):** 
        "{question}"

    ### ÇIKTI FORMATI (KESİNLİKLE UYULMALIDIR) ###
    Cevabını, başka HİÇBİR metin eklemeden, doğrudan aşağıdaki JSON formatında ver:

    {{
      "title": "SADECE YENİ RÜYA için 2-5 kelimelik, yaratıcı bir başlık.",
      "summary": "SADECE YENİ RÜYA'nın en fazla 2 cümlelik kısa ve vurucu bir özeti.",
      "themes": [
        "SADECE YENİ RÜYA'daki en önemli 3 ana temayı içeren bir string dizisi (Örn: 'Kontrol Kaybı', 'Yüzleşme', 'Değer Arayışı')."
      ],
      "interpretation": "SADECE YENİ RÜYA'nın derinlemesine, empatik ve adım adım yorumu. Sembolleri ve duyguları analiz et. Bu bölümde geçmiş anılardan BAHSETME.",
      "crossConnections": [
        {{
          "connection": "Yeni rüyadaki [sembol/duygu], geçmiş anılardaki [olay/tema] ile bağlantılı olabilir.",
          "evidence": "Bu bağlantıyı neden kurduğunun 1-2 cümlelik kanıtı."
        }},
        {{
          "connection": "Geçmişteki [duygu durumu], bu yeni rüyanın ortaya çıkmasında bir tetikleyici olabilir.",
          "evidence": "Bu tetikleyici ilişkinin kanıtı."
        }},
        {{
          "connection": "Arşivdeki [farklı bir rüya/olay], bu yeni rüyanın bir başka katmanı olabilir.",
          "evidence": "Bu iki olay arasındaki sembolik veya duygusal bağın açıklaması."
        }}
      ]
    }}

    ### KESİN KURALLAR ###
    -   'title', 'summary', 'themes' ve 'interpretation' alanları SADECE VE SADECE YENİ RÜYA ile ilgili olmalıdır.
    -   'crossConnections' alanı, YENİ RÜYA ile GEÇMİŞ ANILAR arasındaki en ilginç ve anlamlı 3 bağlantıyı içermelidir.
    -   Eğer anlamlı bir bağlantı bulamazsan, 'crossConnections' dizisini boş bırak.
`);

        // ADIM 1: Ham yanıtı al.
        const rawResponse = await RagService.queryWithContext(
            userId,
            String(dreamText ?? ""),
            dreamPrompt,
        );

        // 🔥🔥🔥 CASUS KODU BURAYA EKLİYORSUN 🔥🔥🔥
        console.log("--- AI'DAN GELEN HAM CEVAP ---");
        console.log(rawResponse);
        console.log("----------------------------");

        console.log(`[ORCHESTRATOR] Ham yanıt alındı.`);

        // ADIM 2: YANITI DOĞRULA VE AYRIŞTIR (ZOD İLE)
        const analysisData = parseAndValidateJson(
            rawResponse,
            DreamAnalysisResultSchema,
        );

        // parseAndValidateJson, hata durumunda null döner. Bunu kontrol ediyoruz.
        if (analysisData === null) {
            // Eğer AI'dan gelen veri, bizim Zod şemamıza uymuyorsa, bu bir validasyon hatasıdır.
            // Hata detayları zaten jsonValidator içinde konsola yazdırılıyor.
            // Frontend'e daha anlaşılır bir mesaj göndermek için kendi hata tipimizi fırlatıyoruz.
            throw new ValidationError(
                "Yapay zeka, anlaşılmaz bir rüya yorumu yaptı. Lütfen tekrar deneyin.",
            );
        }

        console.log(`[ORCHESTRATOR] Yanıt doğrulandı.`);

        // ADIM 3: VERİTABANINA KAYDET
        const newEventId = await EventService.logEvent({
            type: "dream_analysis",
            data: {
                dreamText: String(dreamText ?? ""),
                analysis: analysisData,
                dialogue: [],
            },
        });

        if (!newEventId) {
            throw new Error("Analiz üretildi ama veritabanına kaydedilemedi.");
        }
        console.log(
            `[ORCHESTRATOR] Analiz, ${newEventId} ID'si ile kaydedildi.`,
        );

        // 3. ADIM: HAFIZAYA EKLEME - ARTIK OTOMATİK!
        // logEvent içinde zaten process-and-embed-memory tetikleniyor.
        // Manuel hafıza eklemeye gerek yok.

        return newEventId; // Her şey yolunda, event ID'sini döndür.
    } catch (error) {
        console.error(
            `[ORCHESTRATOR] Rüya analizi sırasında kritik hata:`,
            error,
        );
        // Hatanın kendisini yukarı fırlat ki `useMutation`'ın onError'ı yakalasın.
        throw error;
    }
}

/**
 * Yapılandırılmış analiz akışı
 */
async function handleStructuredAnalysis(
    context: InteractionContext,
): Promise<string> {
    console.log(
        `[ORCHESTRATOR] Yapılandırılmış analiz başlatılıyor: ${context.transactionId}`,
    );

    // Adım 1: Analiz raporu üret
    const report = await AiService.generateStructuredAnalysisReport(context);
    context.derivedData.analysisReport = report;

    console.log(
        `[ORCHESTRATOR] Yapılandırılmış analiz tamamlandı: ${context.transactionId}`,
    );
    return report;
}

/**
 * Gelişmiş günlük başlangıç akışı
 */
async function handleDiaryStart(
    context: InteractionContext,
): Promise<DiaryStart> {
    console.log(
        `[ORCHESTRATOR] Gelişmiş günlük başlangıç başlatılıyor: ${context.transactionId}`,
    );
    // Adım 1: Günlük başlangıç analizi
    const diaryStart = await AiService.generateDiaryStart(context);
    context.derivedData.dominantMood = diaryStart.mood;
    context.derivedData.questions = diaryStart.questions;
    // Adım 2: Mood'u vault'a kaydet ve history'yi güncelle
    await updateMoodInVault(context, diaryStart.mood);
    // Adım 3: Mood trend'ini analiz et
    const moodTrend = analyzeMoodTrend(context);
    if (moodTrend) {
        context.derivedData.moodTrend = moodTrend;
        console.log(`[ORCHESTRATOR] Mood trend tespit edildi: ${moodTrend}`);
    }
    // Adım 4: Seyir defterine kayıt
    const logEntry =
        `Günlük başlangıcı: ${diaryStart.mood} ruh hali, ${diaryStart.questions.length} soru üretildi.`;
    await JourneyService.addJourneyLogEntry(logEntry);
    // Adım 5: Temaları vault'a ekle
    if (diaryStart.mood) {
        const updatedVault = AiService.mergeVaultData(context.initialVault, {
            themes: [diaryStart.mood],
        });
        await VaultService.updateUserVault(updatedVault);
    }

    // Adım 6: Hafızaya ekleme - ARTIK OTOMATİK!
    // logEvent içinde zaten process-and-embed-memory tetikleniyor.

    console.log(
        `[ORCHESTRATOR] Gelişmiş günlük başlangıç tamamlandı: ${context.transactionId}`,
    );
    return diaryStart;
}

/**
 * Gelişmiş günlük yansıma akışı
 */
async function handleDailyReflection(
    context: InteractionContext,
): Promise<string> {
    console.log(
        `[ORCHESTRATOR] Gelişmiş günlük yansıma başlatılıyor: ${context.transactionId}`,
    );
    // Adım 1: Günlük yansıma yanıtı üret
    const reflection = await AiService.generateDailyReflectionResponse(context);
    context.derivedData.generatedReply = reflection;
    // Adım 2: Bugünkü mood'u vault'a kaydet
    const { todayMood } = context.initialEvent.data;
    if (todayMood) {
        await updateMoodInVault(context, String(todayMood));
    }
    // Adım 3: Mood trend'ini analiz et
    const moodTrend = analyzeMoodTrend(context);
    if (moodTrend) {
        context.derivedData.moodTrend = moodTrend;
        console.log(`[ORCHESTRATOR] Mood trend tespit edildi: ${moodTrend}`);
    }
    // Adım 4: Seyir defterine kayıt
    const logEntry = `Günlük yansıma: ${
        todayMood || "belirsiz"
    } ruh hali ile gün tamamlandı.`;
    await JourneyService.addJourneyLogEntry(logEntry);
    // Adım 5: Moodu vault'a tema olarak ekle
    if (todayMood) {
        const updatedVault = AiService.mergeVaultData(context.initialVault, {
            themes: [String(todayMood)],
        });
        await VaultService.updateUserVault(updatedVault);
    }

    // Adım 6: Hafızaya ekleme - ARTIK OTOMATİK!
    // logEvent içinde zaten process-and-embed-memory tetikleniyor.

    console.log(
        `[ORCHESTRATOR] Gelişmiş günlük yansıma tamamlandı: ${context.transactionId}`,
    );
    return reflection;
}

/**
 * Onboarding tamamlama akışı
 */
function handleOnboardingCompletion(
    context: InteractionContext,
): Promise<{ success: boolean; message: string }> {
    console.log(
        `[ORCHESTRATOR] Onboarding tamamlandı, cevaplar kaydediliyor: ${context.transactionId}`,
    );

    // AI analizi yapma - sadece cevapları kaydet
    // Trait analizi daha sonra yapılacak, şimdilik masraftan kaçın

    // Vault güncelleme summary.tsx'te yapılıyor, burada tekrar yapma
    // Conflict'i önlemek için sadece log at

    console.log(
        `[ORCHESTRATOR] Onboarding cevapları başarıyla kaydedildi: ${context.transactionId}`,
    );

    // UI'a başarılı olduğuna dair bir sinyal döndür
    return Promise.resolve({ success: true, message: "ONBOARDING_SAVED" });
}

// ===============================================
// STRATEJİ HARİTASI - HANDLER EXPORT
// ===============================================

export const eventHandlers: Record<
    string,
    (context: InteractionContext) => Promise<OrchestratorSuccessResult>
> = {
    "text_session": handleTherapySession,
    "voice_session": handleTherapySession,
    "video_session": handleTherapySession,
    "dream_analysis": handleDreamAnalysis,
    "ai_analysis": handleStructuredAnalysis,
    "diary_entry": handleDiaryStart,
    "daily_reflection": handleDailyReflection,
    "onboarding_completed": handleOnboardingCompletion,
};
