// services/unconscious-detection.service.ts
// BİLİNÇDIŞI SİNYAL TESPİT SİSTEMİ
// Kullanıcının söylediği değil, söyleyemediği şeyleri yakalar

import { supabase } from "../utils/supabase";
import { AIConsciousnessService } from "./ai-consciousness.service";

// ===========================================
// TİP TANIMLAMALARI
// ===========================================

interface UnconsciousSignal {
    type:
        | "suppressed_anxiety"
        | "hidden_anger"
        | "masked_sadness"
        | "denied_fear"
        | "concealed_shame"
        | "repressed_trauma"
        | "avoided_grief"
        | "suppressed_joy"
        | "hidden_loneliness"
        | "masked_insecurity";
    confidence: number; // 0-1 arası
    indicators: {
        linguistic: string[]; // Kelime seçimleri, tonlama ipuçları
        contextual: string[]; // Bağlamsal çelişkiler
        temporal: string[]; // Zaman içindeki tutarsızlıklar
    };
    intervention_strategy:
        | "gentle_probe"
        | "indirect_validation"
        | "wait_and_observe"
        | "direct_inquiry";
}

interface DetectionContext {
    user_id: string;
    content: string;
    mood_declared?: string; // Kullanıcının beyan ettiği ruh hali
    previous_interactions: string[]; // Son etkileşimler
    session_context: Record<string, unknown>;
}

// ===========================================
// ANA TESPİT SİSTEMİ
// ===========================================

/**
 * Kullanıcı metninde bilinçdışı sinyalleri tespit eder
 */
export async function detectUnconsciousSignals(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const signals: UnconsciousSignal[] = [];

    try {
        // Paralel tespit algoritmaları
        const [
            anxietySignals,
            angerSignals,
            sadnessSignals,
            fearSignals,
            shameSignals,
            lonelinessSignals,
        ] = await Promise.all([
            detectSuppressedAnxiety(context),
            detectHiddenAnger(context),
            detectMaskedSadness(context),
            detectDeniedFear(context),
            detectConcealedShame(context),
            detectHiddenLoneliness(context),
        ]);

        signals.push(
            ...anxietySignals,
            ...angerSignals,
            ...sadnessSignals,
            ...fearSignals,
            ...shameSignals,
            ...lonelinessSignals,
        );

        // Tespit edilen sinyalleri veritabanına kaydet
        for (const signal of signals) {
            await saveUnconsciousDetection(context, signal);
        }

        // AI'ın duygusal durumunu güncelle (tespit yapma yorgunluğu)
        if (signals.length > 0) {
            await AIConsciousnessService.updateEmotionalState({
                empathy_demand: signals.length * 0.1,
                processing_complexity: "complex",
                new_learning: true,
            });
        }

        return signals;
    } catch (error) {
        console.error("[UNCONSCIOUS_DETECTION] Tespit hatası:", error);
        return [];
    }
}

// ===========================================
// ÖZEL TESPİT ALGORİTMALARI
// ===========================================

/**
 * Bastırılmış kaygı tespiti
 */
async function detectSuppressedAnxiety(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content, mood_declared } = context;
    const signals: UnconsciousSignal[] = [];

    // Kelime analizi
    const anxietyMasks = [
        "iyiyim",
        "sorun yok",
        "hallederim",
        "alışkınım",
        "normal",
        "önemli değil",
        "geçer",
        "daha kötüsü olabilir",
    ];

    const anxietyIndicators = [
        "ama",
        "sadece",
        "biraz",
        "sanki",
        "galiba",
        "belki",
        "herhalde",
        "aslında",
        "şey",
        "yani",
    ];

    const hasAnxietyMask = anxietyMasks.some((mask) =>
        content.toLowerCase().includes(mask.toLowerCase())
    );

    const anxietyIndicatorCount =
        anxietyIndicators.filter((indicator) =>
            content.toLowerCase().includes(indicator.toLowerCase())
        ).length;

    // Çelişki analizi: "İyiyim" diyor ama kaygı belirtileri var
    if (hasAnxietyMask && anxietyIndicatorCount >= 2) {
        const confidence = Math.min(0.9, 0.4 + (anxietyIndicatorCount * 0.1));

        signals.push({
            type: "suppressed_anxiety",
            confidence,
            indicators: {
                linguistic: [
                    "tereddüt edici kelimeler",
                    "minimizasyon ifadeleri",
                ],
                contextual: ["durum ile beyan edilen ruh hali çelişiyor"],
                temporal: [],
            },
            intervention_strategy: confidence > 0.7
                ? "gentle_probe"
                : "wait_and_observe",
        });
    }

    // Tempo analizi (çok hızlı veya çok yavaş cevaplar)
    if (content.length < 10 && mood_declared === "iyi") {
        signals.push({
            type: "suppressed_anxiety",
            confidence: 0.6,
            indicators: {
                linguistic: ["aşırı kısa cevaplar"],
                contextual: ["kaçınma davranışı"],
                temporal: [],
            },
            intervention_strategy: "indirect_validation",
        });
    }

    return signals;
}

/**
 * Gizli öfke tespiti
 */
async function detectHiddenAnger(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content } = context;
    const signals: UnconsciousSignal[] = [];

    // Pasif-agresif dil kalıpları
    const passiveAggressivePatterns = [
        "fark etmez",
        "ne olacaksa olsun",
        "nasıl istersen",
        "sen bilirsin",
        "önemli değil",
        "boş ver",
    ];

    const sarcasticIndicators = [
        "tabi",
        "elbette",
        "kesinlikle",
        "muhakkak",
        "tabii ki",
    ];

    const hasPassiveAggression = passiveAggressivePatterns.some((pattern) =>
        content.toLowerCase().includes(pattern.toLowerCase())
    );

    const hasSarcasm = sarcasticIndicators.some((indicator) =>
        content.toLowerCase().includes(indicator.toLowerCase())
    );

    if (hasPassiveAggression || hasSarcasm) {
        signals.push({
            type: "hidden_anger",
            confidence: hasPassiveAggression && hasSarcasm ? 0.8 : 0.6,
            indicators: {
                linguistic: hasPassiveAggression
                    ? ["pasif-agresif dil"]
                    : ["alaycı ton"],
                contextual: ["duygusal mesafe", "sorumluluk reddi"],
                temporal: [],
            },
            intervention_strategy: "indirect_validation",
        });
    }

    // Aşırı kontrol ihtiyacı (gizli öfkenin bir göstergesi)
    const controlPatterns = [
        "kesinlikle",
        "mutlaka",
        "asla",
        "hiçbir zaman",
        "her zaman",
    ];
    const controlCount =
        controlPatterns.filter((pattern) =>
            content.toLowerCase().includes(pattern.toLowerCase())
        ).length;

    if (controlCount >= 2) {
        signals.push({
            type: "hidden_anger",
            confidence: 0.5,
            indicators: {
                linguistic: ["aşırı kesin ifadeler"],
                contextual: ["kontrol ihtiyacı"],
                temporal: [],
            },
            intervention_strategy: "wait_and_observe",
        });
    }

    return signals;
}

/**
 * Maskelenmiş üzüntü tespiti
 */
async function detectMaskedSadness(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content, mood_declared } = context;
    const signals: UnconsciousSignal[] = [];

    // Üzüntüyü maskeleme kalıpları
    const sadnessMasks = [
        "çok mutluyum",
        "harika",
        "mükemmel",
        "süper",
        "fantastik",
        "her şey yolunda",
        "daha iyi olamaz",
    ];

    const sadnessLeaks = [
        "yorgun",
        "bitkin",
        "ağır",
        "boş",
        "anlamsız",
        "değmez",
        "zor",
        "yalnız",
        "uzak",
    ];

    const hasSadnessMask = sadnessMasks.some((mask) =>
        content.toLowerCase().includes(mask.toLowerCase())
    );

    const sadnessLeakCount =
        sadnessLeaks.filter((leak) =>
            content.toLowerCase().includes(leak.toLowerCase())
        ).length;

    // Aşırı pozitif ifadeler + üzüntü sızıntıları
    if (hasSadnessMask && sadnessLeakCount >= 1) {
        signals.push({
            type: "masked_sadness",
            confidence: 0.7,
            indicators: {
                linguistic: ["aşırı pozitif ifadeler", "üzüntü sızıntıları"],
                contextual: ["duygusal çelişki"],
                temporal: [],
            },
            intervention_strategy: "gentle_probe",
        });
    }

    // Geçmiş odaklı ifadeler (üzüntünün bir göstergesi)
    const pastFocusedWords = ["eskiden", "önceden", "geçmişte", "o zamanlar"];
    const pastFocusCount =
        pastFocusedWords.filter((word) =>
            content.toLowerCase().includes(word.toLowerCase())
        ).length;

    if (pastFocusCount >= 2 && mood_declared !== "üzgün") {
        signals.push({
            type: "masked_sadness",
            confidence: 0.6,
            indicators: {
                linguistic: ["geçmiş odaklı ifadeler"],
                contextual: ["nostalji ile maskelenmiş üzüntü"],
                temporal: [],
            },
            intervention_strategy: "indirect_validation",
        });
    }

    return signals;
}

/**
 * İnkar edilen korku tespiti
 */
async function detectDeniedFear(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content } = context;
    const signals: UnconsciousSignal[] = [];

    // Korku inkârı kalıpları
    const fearDenials = [
        "korkmuyorum",
        "cesurdum",
        "rahatım",
        "endişelenmiyorum",
        "sorun değil",
        "alışığım",
        "kolay",
    ];

    const fearIndicators = [
        "eğer",
        "ya",
        "acaba",
        "umarım",
        "keşke",
        "belki",
        "sanırım",
        "galiba",
    ];

    const hasFearDenial = fearDenials.some((denial) =>
        content.toLowerCase().includes(denial.toLowerCase())
    );

    const fearIndicatorCount =
        fearIndicators.filter((indicator) =>
            content.toLowerCase().includes(indicator.toLowerCase())
        ).length;

    if (hasFearDenial && fearIndicatorCount >= 2) {
        signals.push({
            type: "denied_fear",
            confidence: 0.65,
            indicators: {
                linguistic: ["korku inkârı", "belirsizlik ifadeleri"],
                contextual: ["çelişkili duygusal durum"],
                temporal: [],
            },
            intervention_strategy: "indirect_validation",
        });
    }

    // Aşırı detay verme (kaygının bir göstergesi)
    if (content.length > 200 && content.split(".").length > 3) {
        signals.push({
            type: "denied_fear",
            confidence: 0.4,
            indicators: {
                linguistic: ["aşırı detaylı anlatım"],
                contextual: ["kontrol ihtiyacı"],
                temporal: [],
            },
            intervention_strategy: "wait_and_observe",
        });
    }

    return signals;
}

/**
 * Gizli utanç tespiti
 */
async function detectConcealedShame(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content } = context;
    const signals: UnconsciousSignal[] = [];

    // Utanç maskeleme kalıpları
    const shameMasks = [
        "önemli değil",
        "normal",
        "herkesin başına gelir",
        "büyütmüyorum",
        "abartmıyorum",
    ];

    const shameIndicators = [
        "aptal",
        "salak",
        "başarısız",
        "değersiz",
        "kötü",
        "yanlış",
        "hata",
        "suçlu",
        "mahcup",
    ];

    const selfCriticismCount =
        shameIndicators.filter((indicator) =>
            content.toLowerCase().includes(indicator.toLowerCase())
        ).length;

    const hasShameMask = shameMasks.some((mask) =>
        content.toLowerCase().includes(mask.toLowerCase())
    );

    if (selfCriticismCount >= 2 || (hasShameMask && selfCriticismCount >= 1)) {
        signals.push({
            type: "concealed_shame",
            confidence: selfCriticismCount >= 2 ? 0.8 : 0.6,
            indicators: {
                linguistic: ["öz-eleştiri", "minimizasyon"],
                contextual: ["öz-değer problemleri"],
                temporal: [],
            },
            intervention_strategy: "gentle_probe",
        });
    }

    return signals;
}

/**
 * Gizli yalnızlık tespiti
 */
async function detectHiddenLoneliness(
    context: DetectionContext,
): Promise<UnconsciousSignal[]> {
    const { content } = context;
    const signals: UnconsciousSignal[] = [];

    // Yalnızlık maskeleme kalıpları
    const lonelinessMasks = [
        "bağımsızım",
        "özgürüm",
        "rahatım",
        "tek başıma iyiyim",
        "kimseye ihtiyacım yok",
        "kendi halimde",
    ];

    const lonelinessLeaks = [
        "sessiz",
        "boş",
        "uzak",
        "farklı",
        "anlaşılmıyor",
        "kimse",
        "yalnız",
        "tek",
        "hiç",
    ];

    const hasLonelinessMask = lonelinessMasks.some((mask) =>
        content.toLowerCase().includes(mask.toLowerCase())
    );

    const lonelinessLeakCount =
        lonelinessLeaks.filter((leak) =>
            content.toLowerCase().includes(leak.toLowerCase())
        ).length;

    if (hasLonelinessMask && lonelinessLeakCount >= 1) {
        signals.push({
            type: "hidden_loneliness",
            confidence: 0.7,
            indicators: {
                linguistic: ["bağımsızlık vurgusu", "yalnızlık sızıntıları"],
                contextual: ["sosyal bağlantı kaçınması"],
                temporal: [],
            },
            intervention_strategy: "indirect_validation",
        });
    }

    // Sosyal referans eksikliği
    const socialWords = [
        "arkadaş",
        "aile",
        "sevgili",
        "birisi",
        "beraber",
        "birlikte",
    ];
    const socialWordCount =
        socialWords.filter((word) =>
            content.toLowerCase().includes(word.toLowerCase())
        ).length;

    if (content.length > 100 && socialWordCount === 0) {
        signals.push({
            type: "hidden_loneliness",
            confidence: 0.5,
            indicators: {
                linguistic: ["sosyal referans eksikliği"],
                contextual: ["izolasyon eğilimi"],
                temporal: [],
            },
            intervention_strategy: "wait_and_observe",
        });
    }

    return signals;
}

// ===========================================
// VERİTABANI İŞLEMLERİ
// ===========================================

/**
 * Tespit edilen bilinçdışı sinyali veritabanına kaydeder
 */
async function saveUnconsciousDetection(
    context: DetectionContext,
    signal: UnconsciousSignal,
): Promise<void> {
    try {
        const { error } = await supabase
            .from("ai_unconscious_detections")
            .insert([{
                user_id: context.user_id,
                detected_signal: signal.type,
                confidence_score: signal.confidence,
                source_content: context.content,
                linguistic_indicators: signal.indicators.linguistic,
                contextual_clues: signal.indicators.contextual,
                ai_response_strategy: signal.intervention_strategy,
                intervention_level: determineInterventionLevel(
                    signal.confidence,
                ),
            }]);

        if (error) {
            console.error("[UNCONSCIOUS_DETECTION] Kayıt hatası:", error);
        } else {
            console.log(
                `[UNCONSCIOUS_DETECTION] 🎭 ${signal.type} tespiti kaydedildi (güven: ${
                    signal.confidence.toFixed(2)
                })`,
            );
        }
    } catch (error) {
        console.error(
            "[UNCONSCIOUS_DETECTION] saveUnconsciousDetection hatası:",
            error,
        );
    }
}

/**
 * Güven skoruna göre müdahale seviyesini belirler
 */
function determineInterventionLevel(
    confidence: number,
): "none" | "subtle" | "moderate" | "direct" {
    if (confidence >= 0.8) return "moderate";
    if (confidence >= 0.6) return "subtle";
    if (confidence >= 0.4) return "subtle";
    return "none";
}

// ===========================================
// MÜDAHALE STRATEJİLERİ
// ===========================================

/**
 * Tespit edilen sinyale göre AI'ın nasıl yanıt vereceğini belirler
 */
export function generateInterventionResponse(
    signal: UnconsciousSignal,
    originalResponse: string,
): string {
    const interventions = {
        gentle_probe: generateGentleProbe(signal, originalResponse),
        indirect_validation: generateIndirectValidation(
            signal,
            originalResponse,
        ),
        wait_and_observe: originalResponse, // Değişiklik yok, gözlem modu
        direct_inquiry: generateDirectInquiry(signal, originalResponse),
    };

    return interventions[signal.intervention_strategy];
}

/**
 * Nazik sondaj cevabı oluşturur
 */
function generateGentleProbe(
    signal: UnconsciousSignal,
    originalResponse: string,
): string {
    const probes = {
        suppressed_anxiety:
            "Bu durumla ilgili başka ne hissediyorsun? Bazen 'iyi' dediğimizde içimizde başka duygular da olabiliyor.",
        hidden_anger:
            "Sözlerinde bir şey var... Bu durumun seni nasıl etkilediğini merak ediyorum.",
        masked_sadness:
            "Çok pozitif konuşuyorsun, bu güzel. Ama içinde başka hisler de var gibi geliyor bana.",
        denied_fear:
            "Bu konuda çok rahat görünüyorsun. Peki ya içindeki küçük endişeler?",
        concealed_shame:
            "Kendine karşı biraz sert olduğunu fark ettim. Bu normal bir şey mi senin için?",
        hidden_loneliness:
            "Bağımsızlığından bahsediyorsun... Peki bazen birisiyle paylaşmak istediğin anlar oluyor mu?",
    };

    const probe = probes[signal.type] || "";
    return `${originalResponse}\n\n${probe}`;
}

/**
 * Dolaylı doğrulama cevabı oluşturur
 */
function generateIndirectValidation(
    signal: UnconsciousSignal,
    originalResponse: string,
): string {
    const validations = {
        suppressed_anxiety:
            "Bazen 'iyiyim' demek en kolay olanı olabiliyor. Bu da tamamen anlaşılabilir.",
        hidden_anger:
            "Bazı duygular ifade edilmesi zor olabiliyor. Bu çok normal.",
        masked_sadness:
            "Pozitif olmaya çalışmak güzel bir şey, ama tüm duygularımızın da yeri var.",
        denied_fear:
            "Cesur görünmek önemli, ama içimizdeki endişeleri de kabul etmek gerekiyor bazen.",
        concealed_shame:
            "Kendimize karşı eleştirel olabiliyoruz bazen. Bu çok insani bir şey.",
        hidden_loneliness:
            "Bağımsızlık değerli bir şey, ama bağlantı kurma ihtiyacımız da var.",
    };

    const validation = validations[signal.type] || "";
    return `${originalResponse}\n\n${validation}`;
}

/**
 * Doğrudan sorgulama cevabı oluşturur
 */
function generateDirectInquiry(
    signal: UnconsciousSignal,
    originalResponse: string,
): string {
    const inquiries = {
        suppressed_anxiety:
            "Gerçekten iyi misin? Çünkü sözlerinde farklı bir şey hissediyorum.",
        hidden_anger:
            "Bu durumun seni kızdırdığını düşünüyorum. Yanılıyor muyum?",
        masked_sadness:
            "Çok mutlu olduğunu söylüyorsun ama üzgün hissediyor olabilir misin?",
        denied_fear: "Bu durumdan korkmuyor olabilir misin?",
        concealed_shame: "Kendini suçlu hissettiğin bir şey var mı?",
        hidden_loneliness: "Yalnız hissettiğin oluyor mu?",
    };

    const inquiry = inquiries[signal.type] || "";
    return `${originalResponse}\n\n${inquiry}`;
}

// ===========================================
// EXPORT
// ===========================================

export const UnconsciousDetectionService = {
    detectSignals: detectUnconsciousSignals,
    generateIntervention: generateInterventionResponse,
};
