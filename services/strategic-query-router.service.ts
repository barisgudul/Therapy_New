// services/strategic-query-router.service.ts
// 🎯 FAZ 1: STRATEJİK SORGU YÖNLENDİRİCİ
// Gemini 2.5 Pro anlaşması uyarınca: Tek API çağrısı, akıllı veri toplama

import { AI_MODELS } from "../constants/AIConfig";
import { InteractionContext } from "../types/context";
import { invokeGemini } from "./ai.service";
import { EventPayload } from "./event.service";
import { retrieveContext } from "./rag.service";
import * as VaultService from "./vault.service";

export class StrategicQueryRouter {
    /**
     * 🎯 SEVİYE 1: BASİT SORGULAR İÇİN TEK ÇAĞRI
     *
     * Bu fonksiyon, kullanıcının basit sorularını tek bir API çağrısı ile yanıtlar.
     * Tüm gerekli veriyi önceden toplar ve optimize edilmiş bir prompt ile gönderir.
     */
    static async handleSimpleQuery(
        context: InteractionContext,
    ): Promise<string> {
        console.log(
            `[STRATEGIC_ROUTER] 🎯 Seviye 1 basit sorgu işleniyor: ${context.initialEvent.type}`,
        );

        try {
            // 1. VERİ TOPLAMA AŞAMASI (Paralel ve Hızlı)
            const [userVault, ragContext] = await Promise.all([
                VaultService.getUserVault(),
                this.shouldUseRAG(context.initialEvent)
                    ? retrieveContext(
                        context.userId,
                        this.extractQueryFromEvent(context.initialEvent),
                    )
                    : Promise.resolve([]),
            ]);

            // 2. AKILLI PROMPT OLUŞTURMA
            const optimizedPrompt = this.buildOptimizedPrompt(
                context.initialEvent,
                userVault || {},
                ragContext,
            );

            // 3. TEK API ÇAĞRISI
            const response = await invokeGemini(
                optimizedPrompt,
                AI_MODELS.FAST,
                {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                },
            );

            console.log(
                `[STRATEGIC_ROUTER] ✅ Seviye 1 tamamlandı - tek çağrı ile yanıt alındı`,
            );
            console.log(`[STRATEGIC_ROUTER] 📤 Döndürülen yanıt:`, response);
            console.log(
                `[STRATEGIC_ROUTER] 📏 Yanıt uzunluğu:`,
                response?.length,
            );
            return response;
        } catch (error) {
            console.error(`[STRATEGIC_ROUTER] ❌ Seviye 1 hatası:`, error);
            throw new Error(
                "Sorgu işlenirken bir hata oluştu. Lütfen tekrar deneyin.",
            );
        }
    }

    /**
     * 🤔 SORGU KOMPLEKSİTE ANALİZİ
     * Bu sorgu RAG (hafıza araması) gerektirir mi?
     */
    private static shouldUseRAG(event: EventPayload): boolean {
        const ragRequiredTypes = [
            "dream_analysis", // Rüya analizleri geçmiş veriye ihtiyaç duyar
            "ai_analysis", // AI analizleri geçmiş patterns'a bakar
            "text_session", // Terapi seansları context gerektirir
        ];

        return ragRequiredTypes.includes(event.type);
    }

    /**
     * 📝 EVENT'TEN SORGU METNİ ÇIKARMA
     */
    private static extractQueryFromEvent(event: EventPayload): string {
        switch (event.type) {
            case "dream_analysis":
                return event.data.dreamText || "";
            case "text_session":
                return event.data.userMessage || "";
            case "ai_analysis":
                return `Son ${event.data.days} günlük analiz`;
            case "daily_reflection":
                return event.data.todayNote || "";
            default:
                return "Genel sorgu";
        }
    }

    /**
     * 🎯 OPTİMİZE EDİLMİŞ PROMPT OLUŞTURUCU
     *
     * Bu fonksiyon, tek API çağrısında maksimum değer elde etmek için
     * tüm gerekli bilgiyi akıllıca birleştirir.
     */
    private static buildOptimizedPrompt(
        event: EventPayload,
        userVault: any,
        ragContext: { content: string; source_layer: string }[],
    ): string {
        // Temel sistem talimatları
        let prompt =
            `Sen, kullanıcının mental sağlığını destekleyen bir AI terapistsin. Empati ile yaklaş, yapıcı ol, umut ver.

`;

        // Kullanıcı profili (eğer varsa)
        if (userVault && Object.keys(userVault).length > 0) {
            prompt += `### KULLANICI PROFİLİ ###
${JSON.stringify(userVault, null, 2)}

`;
        }

        // RAG bağlamı (eğer varsa)
        if (ragContext && ragContext.length > 0) {
            prompt += `### GEÇMİŞ ANILARIN BAĞLAMI ###
${ragContext.map((ctx) => `- (${ctx.source_layer}): ${ctx.content}`).join("\n")}

`;
        }

        // Özel event tipi talimatları
        prompt += this.getEventSpecificInstructions(event);

        return prompt;
    }

    /**
     * 📋 EVENT TİPİNE ÖZEL TALİMATLAR
     */
    private static getEventSpecificInstructions(event: EventPayload): string {
        switch (event.type) {
            case "dream_analysis":
                return `### GÖREV: RÜYA ANALİZİ ###
Kullanıcı şu rüyayı gördü: "${event.data.dreamText}"

Lütfen:
1. Rüyanın temel sembollerini açıkla
2. Duygusal anlamını yorumla
3. Geçmiş anılarla bağlantı kur (eğer varsa)
4. Yapıcı bir içgörü sun

Cevabın empatik, destekleyici ve umut verici olsun.`;

            case "text_session":
                return `### GÖREV: TERAPİ SEANSI ###
Kullanıcı şunu söyledi: "${event.data.userMessage}"

Sen bir arkadaş gibi yaklaş. Yapay zeka olduğunu unuttur, sıcak ve samimi ol.

**MARKDOWN FORMATINDA YAZ:**
- **Önemli kelimeler** için kalın yazı kullan
- Başlıklarda ### kullan (varsa)
- Madde işaretleri için - kullan
- Son kısımda 💭 ile başlayan bir hatırlatma ekle

Yanıtında:
- Duygularını anlayarak yanıtla
- Destekleyici sorular sor
- Geçmiş bağlamı kullan (eğer varsa)
- Pratik öneriler ver
- Güzel bir görsel format kullan

Ton: Samimi, empatik, destekleyici.`;

            case "daily_reflection":
                return `### GÖREV: SAMİMİ GÜNLÜK YANSIMA ###
Kullanıcı bugün şunu yazdı: "${event.data.todayNote}"
Ruh hali: ${event.data.todayMood || "belirsiz"}

Sen bir arkadaş gibi yaklaş. Yapay zeka olduğunu unuttur, sıcak ve samimi ol.

**MARKDOWN FORMATINDA YAZ:**
- **Önemli kelimeler** için kalın yazı kullan
- Başlıklarda ### kullan (varsa)
- Madde işaretleri için - kullan
- Son kısımda 💭 ile başlayan bir hatırlatma ekle

Yanıtında:
- Kısa ve öz ol (maksimum 2-3 paragraf)
- Doğal konuş, samimi ol
- Kullanıcının adını kullan (eğer biliyorsan)
- Duygularını anladığını hissettir
- Güzel bir görsel format kullan

Ton: Arkadaşça, destekleyici, gerçek.`;

            case "ai_analysis":
                return `### GÖREV: KİŞİSEL ANALİZ ###
Kullanıcı son ${event.data.days} günlük analiz istiyor.

Lütfen:
1. Genel ruh hali trendini değerlendir
2. Güçlü yönleri belirle
3. Gelişim fırsatlarını göster
4. Somut öneriler ver

Objektif ama destekleyici ol.`;

            default:
                return `### GÖREV: GENEL DESTEK ###
Kullanıcıya yardım et: ${JSON.stringify(event.data)}

Empati ile yaklaş ve yapıcı ol.`;
        }
    }

    /**
     * 📊 PERFORMANS METRİKLERİ
     * FAZ 1'de sistem performansını izlemek için
     */
    static getPerformanceMetrics(): {
        total_queries_processed: number;
        avg_response_time_ms: number;
        success_rate: number;
    } {
        // TODO: Gerçek metrikler için veritabanı entegrasyonu
        return {
            total_queries_processed: 0,
            avg_response_time_ms: 0,
            success_rate: 100,
        };
    }
}

/**
 * 🎯 FAZ 2 İÇİN HAZIRLIK: KARMAŞIK SORGULAR
 *
 * Bu interface, FAZ 2'de implement edilecek olan
 * karmaşık sorgu pipeline'ı için hazırlık.
 */
export interface ComplexQueryPipeline {
    // TODO FAZ 2: Kontrollü pipeline sistemi
    // - Multi-step reasoning
    // - Tool usage (controlled)
    // - Advanced pattern analysis
    placeholder?: boolean; // Geçici placeholder - FAZ 2'de kaldırılacak
}
