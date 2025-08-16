// services/behavioral-pattern-analyzer.service.ts
// 🚀 FAZ 2: BEHAVIORAL PATTERN ANALYZER
// "Unconscious Detection" yerine veri-temelli davranış analizi

import { AI_MODELS } from "../constants/AIConfig";
import type { JsonValue } from "../types/json";
import { supabase } from "../utils/supabase";
import { invokeGemini } from "./ai.service";
import type { AppEvent } from "./event.service";

export interface BehavioralPattern {
    pattern_id: string;
    pattern_name: string;
    pattern_type: "communication" | "mood" | "activity" | "temporal";
    description: string;
    frequency: number; // Kaç kez gözlemlendi
    confidence_score: number; // 0-1 arası güven skoru
    first_observed: string; // İlk gözlem tarihi
    last_observed: string; // Son gözlem tarihi
    examples: string[]; // Örnek davranışlar
    potential_triggers: string[]; // Olası tetikleyiciler
    suggested_insights: string[]; // Önerilen içgörüler (kesinlik değil!)
}

export interface BehavioralAnalysisResult {
    user_id: string;
    analysis_period_days: number;
    total_patterns_found: number;
    patterns: BehavioralPattern[];
    overall_trends: {
        communication_trend: "improving" | "stable" | "concerning";
        mood_stability: "high" | "medium" | "low";
        engagement_level: "high" | "medium" | "low";
    };
    data_quality_score: number; // Ne kadar veri var?
    analysis_confidence: number; // Analiz güvenilirliği
    generated_at: string;
}

export class BehavioralPatternAnalyzer {
    /**
     * 🔍 DAVRANIŞSAL KALIP ANALİZİ
     *
     * Bu fonksiyon, kullanıcının geçmiş verilerini analiz ederek
     * gözlemlenebilir davranış kalıplarını tespit eder.
     *
     * ÖNEMLİ: Bu bir "tanı" değil, sadece veri gözlemidir!
     */
    static async analyzePatterns(
        userId: string,
        periodDays: number = 30,
    ): Promise<BehavioralAnalysisResult> {
        console.log(
            `[BEHAVIORAL_ANALYZER] 🔍 ${userId} için ${periodDays} günlük kalıp analizi başlıyor...`,
        );

        try {
            // 1. VERİ TOPLAMA
            const userData = await this.gatherUserData(userId, periodDays);

            if (userData.events.length < 5) {
                console.log(
                    `[BEHAVIORAL_ANALYZER] ⚠️ Yetersiz veri (${userData.events.length} olay), analiz atlanıyor`,
                );
                return this.createMinimalAnalysis(userId, periodDays);
            }

            // 2. KALIP TESPİTİ
            const patterns = await this.detectPatterns(userData);

            // 3. TREND ANALİZİ
            const trends = this.analyzeTrends(userData);

            // 4. KALİTE DEĞERLENDİRMESİ
            const dataQuality = this.assessDataQuality(userData);

            const result: BehavioralAnalysisResult = {
                user_id: userId,
                analysis_period_days: periodDays,
                total_patterns_found: patterns.length,
                patterns,
                overall_trends: trends,
                data_quality_score: dataQuality,
                analysis_confidence: this.calculateAnalysisConfidence(
                    patterns,
                    dataQuality,
                ),
                generated_at: new Date().toISOString(),
            };

            console.log(
                `[BEHAVIORAL_ANALYZER] ✅ Analiz tamamlandı: ${patterns.length} kalıp tespit edildi`,
            );
            return result;
        } catch (error) {
            console.error(`[BEHAVIORAL_ANALYZER] ❌ Analiz hatası:`, error);
            return this.createMinimalAnalysis(userId, periodDays);
        }
    }

    /**
     * 📊 KULLANICI VERİSİNİ TOPLAMA
     */
    private static async gatherUserData(userId: string, days: number): Promise<{
        events: AppEvent[];
        vault: { [key: string]: JsonValue };
        period_start: string;
        period_end: string;
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [eventsResult, vaultResult] = await Promise.all([
            supabase
                .from("events")
                .select("*")
                .eq("user_id", userId)
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: true }),

            supabase
                .from("user_vault")
                .select("vault_data")
                .eq("user_id", userId)
                .single(),
        ]);

        return {
            events: (eventsResult.data as AppEvent[] | null) || [],
            vault: (vaultResult.data?.vault_data as
                | { [key: string]: JsonValue }
                | undefined) || {},
            period_start: startDate.toISOString(),
            period_end: new Date().toISOString(),
        };
    }

    /**
     * 🔍 KALIP TESPİT ALGORİTMASI
     *
     * Bu algoritma, sadece gözlemlenebilir verileri analiz eder:
     * ✅ Mesaj uzunlukları, kelime seçimleri
     * ✅ Zaman kalıpları, sıklık analizi
     * ✅ Mood değişimleri, tutarlılık
     * ❌ "Bilinçdışı" yorumlar, kesin tanılar
     */
    private static async detectPatterns(
        userData: { events: AppEvent[] },
    ): Promise<BehavioralPattern[]> {
        const patterns: BehavioralPattern[] = [];

        // 1. İLETİŞİM KALIPLARI
        const communicationPatterns = await this.detectCommunicationPatterns(
            userData.events,
        );
        patterns.push(...communicationPatterns);

        // 2. MOOD KALIPLARI
        const moodPatterns = await this.detectMoodPatterns(userData.events);
        patterns.push(...moodPatterns);

        // 3. AKTİVİTE KALIPLARI
        const activityPatterns = this.detectActivityPatterns(userData.events);
        patterns.push(...activityPatterns);

        // 4. ZAMAN KALIPLARI
        const temporalPatterns = this.detectTemporalPatterns(userData.events);
        patterns.push(...temporalPatterns);

        return patterns.filter((p) => p.confidence_score > 0.3); // Düşük güvenli kalıpları filtrele
    }

    /**
     * 💬 İLETİŞİM KALIPLARI TESPİTİ
     */
    private static detectCommunicationPatterns(
        events: AppEvent[],
    ): Promise<BehavioralPattern[]> {
        const textEvents = events.filter((e) =>
            e.data?.userMessage || e.data?.dreamText || e.data?.todayNote
        );

        if (textEvents.length < 3) return Promise.resolve([]);

        const patterns: BehavioralPattern[] = [];

        // Mesaj uzunluğu kalıpları
        const messageLengths = textEvents.map((e) => {
            const text = String(
                e.data?.userMessage || e.data?.dreamText || e.data?.todayNote ||
                    "",
            );
            return text.length;
        });

        const avgLength = messageLengths.reduce((a, b) => a + b, 0) /
            messageLengths.length;

        if (avgLength < 50) {
            patterns.push({
                pattern_id: "short_messages",
                pattern_name: "Kısa Mesajlar",
                pattern_type: "communication",
                description: "Kullanıcı genellikle kısa mesajlar yazıyor",
                frequency: textEvents.length,
                confidence_score: 0.8,
                first_observed: textEvents[0].created_at,
                last_observed: textEvents[textEvents.length - 1].created_at,
                examples: textEvents.slice(0, 3).map((e) =>
                    String(
                        e.data?.userMessage || e.data?.dreamText ||
                            e.data?.todayNote || "",
                    ).substring(0, 100)
                ),
                potential_triggers: [
                    "Zaman kısıtı",
                    "Düşük enerji",
                    "Konuşma tercihi",
                ],
                suggested_insights: [
                    "Kısa mesajlar hızlı iletişim tercihini gösterebilir",
                    "Detaya girme konusunda çekingenlik olabilir",
                    "Zaman yönetimi odaklı yaklaşım",
                ],
            });
        }

        return Promise.resolve(patterns);
    }

    /**
     * 🎭 MOOD KALIPLARI TESPİTİ
     */
    private static detectMoodPatterns(
        events: AppEvent[],
    ): Promise<BehavioralPattern[]> {
        const moodEvents = events.filter((e) => e.mood);

        if (moodEvents.length < 5) return Promise.resolve([]);

        const patterns: BehavioralPattern[] = [];
        const moods = moodEvents.map((e) => String(e.mood));
        const moodCounts = moods.reduce<Record<string, number>>((acc, mood) => {
            acc[mood] = (acc[mood] || 0) + 1;
            return acc;
        }, {});

        // Dominant mood tespiti
        const dominantMood = Object.keys(moodCounts).reduce((a, b) =>
            moodCounts[a] > moodCounts[b] ? a : b
        );

        if (moodCounts[dominantMood] / moods.length > 0.4) {
            patterns.push({
                pattern_id: `dominant_mood_${dominantMood}`,
                pattern_name: `Baskın Ruh Hali: ${dominantMood}`,
                pattern_type: "mood",
                description:
                    `Kullanıcı sıklıkla '${dominantMood}' ruh halini bildiriyor`,
                frequency: moodCounts[dominantMood],
                confidence_score: moodCounts[dominantMood] / moods.length,
                first_observed: moodEvents[0].created_at,
                last_observed: moodEvents[moodEvents.length - 1].created_at,
                examples: moodEvents.filter((e) => e.mood === dominantMood)
                    .slice(0, 3).map((e) =>
                        `${e.mood} - ${
                            new Date(e.created_at).toLocaleDateString()
                        }`
                    ),
                potential_triggers: [
                    "Kişilik özelliği",
                    "Yaşam koşulları",
                    "Mevsimsel etki",
                ],
                suggested_insights: [
                    `${dominantMood} ruh hali tutarlı bir eğilim gösteriyor`,
                    "Bu kalıp, genel yaşam memnuniyetini yansıtabilir",
                    "Değişim fırsatları değerlendirilebilir",
                ],
            });
        }

        return Promise.resolve(patterns);
    }

    /**
     * 🎯 AKTİVİTE KALIPLARI TESPİTİ
     */
    private static detectActivityPatterns(
        events: AppEvent[],
    ): BehavioralPattern[] {
        const patterns: BehavioralPattern[] = [];

        // Event tipi dağılımı
        const eventTypes = events.reduce<Record<string, number>>(
            (acc, event) => {
                acc[event.type] = (acc[event.type] || 0) + 1;
                return acc;
            },
            {},
        );

        const totalEvents = events.length;
        const dominantType = Object.keys(eventTypes).reduce((a, b) =>
            eventTypes[a] > eventTypes[b] ? a : b
        );

        if (eventTypes[dominantType] / totalEvents > 0.3) {
            const typeNames: Record<string, string> = {
                "text_session": "Metin Terapisi",
                "dream_analysis": "Rüya Analizi",
                "daily_reflection": "Günlük Yansıma",
                "diary_entry": "Günlük Yazma",
            };

            patterns.push({
                pattern_id: `preferred_activity_${dominantType}`,
                pattern_name: `Tercih Edilen Aktivite: ${
                    typeNames[dominantType] || dominantType
                }`,
                pattern_type: "activity",
                description: `Kullanıcı sıklıkla ${
                    typeNames[dominantType] || dominantType
                } aktivitesini tercih ediyor`,
                frequency: eventTypes[dominantType],
                confidence_score: eventTypes[dominantType] / totalEvents,
                first_observed: events.find((e) =>
                    e.type === dominantType
                )?.created_at || "",
                last_observed: events.filter((e) =>
                    e.type === dominantType
                ).pop()?.created_at || "",
                examples: events.filter((e) => e.type === dominantType).slice(
                    0,
                    3,
                ).map((e) =>
                    `${typeNames[e.type] || e.type} - ${
                        new Date(e.created_at).toLocaleDateString()
                    }`
                ),
                potential_triggers: [
                    "Kişisel tercih",
                    "Başarı deneyimi",
                    "Rahatlık hissi",
                ],
                suggested_insights: [
                    `${
                        typeNames[dominantType] || dominantType
                    } aktivitesinde tutarlılık var`,
                    "Bu tercih, kişisel gelişim tarzını yansıtabilir",
                    "Diğer aktiviteleri de keşfetme fırsatı olabilir",
                ],
            });
        }

        return patterns;
    }

    /**
     * ⏰ ZAMAN KALIPLARI TESPİTİ
     */
    private static detectTemporalPatterns(
        events: AppEvent[],
    ): BehavioralPattern[] {
        const patterns: BehavioralPattern[] = [];

        // Günün saati analizi
        const hours = events.map((e) => new Date(e.created_at).getHours());
        const hourCounts = hours.reduce<Record<number, number>>((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        const peakHour = Object.keys(hourCounts).reduce((a, b) =>
            hourCounts[a] > hourCounts[b] ? a : b
        );

        if (hourCounts[peakHour] / hours.length > 0.2) {
            const timeNames: Record<string, string> = {
                "6": "Sabah Erken",
                "7": "Sabah Erken",
                "8": "Sabah",
                "9": "Sabah",
                "10": "Öğleden Önce",
                "11": "Öğleden Önce",
                "12": "Öğle",
                "13": "Öğleden Sonra",
                "14": "Öğleden Sonra",
                "15": "Öğleden Sonra",
                "16": "İkindi",
                "17": "İkindi",
                "18": "Akşam",
                "19": "Akşam",
                "20": "Akşam",
                "21": "Gece",
                "22": "Gece",
                "23": "Gece Geç",
            };

            patterns.push({
                pattern_id: `peak_time_${peakHour}`,
                pattern_name: `Aktif Zaman: ${
                    timeNames[peakHour] || `${peakHour}:00`
                }`,
                pattern_type: "temporal",
                description: `Kullanıcı sıklıkla ${
                    timeNames[peakHour] || `${peakHour}:00`
                } saatlerinde aktif`,
                frequency: hourCounts[peakHour],
                confidence_score: hourCounts[peakHour] / hours.length,
                first_observed: events[0].created_at,
                last_observed: events[events.length - 1].created_at,
                examples: events.filter((e) =>
                    new Date(e.created_at).getHours() === parseInt(peakHour)
                ).slice(0, 3).map((e) =>
                    `${new Date(e.created_at).toLocaleString()}`
                ),
                potential_triggers: [
                    "Günlük rutin",
                    "Enerji seviyesi",
                    "Serbest zaman",
                ],
                suggested_insights: [
                    `${
                        timeNames[peakHour] || `${peakHour}:00`
                    } saatleri en verimli zaman olabilir`,
                    "Bu zaman dilimi, kişisel yansıma için ideal olabilir",
                    "Rutin oluşturma fırsatı değerlendirilebilir",
                ],
            });
        }

        return patterns;
    }

    /**
     * 📈 TREND ANALİZİ
     */
    private static analyzeTrends(userData: { events: AppEvent[] }) {
        const events = userData.events;

        // Basit trend analizi
        return {
            communication_trend: "stable" as const,
            mood_stability: events.filter((e) => e.mood).length > 5
                ? "medium" as const
                : "low" as const,
            engagement_level: events.length > 20
                ? "high" as const
                : events.length > 10
                ? "medium" as const
                : "low" as const,
        };
    }

    /**
     * 🎯 VERİ KALİTESİ DEĞERLENDİRMESİ
     */
    private static assessDataQuality(userData: { events: AppEvent[] }): number {
        const events = userData.events;

        let score = 0;

        // Event sayısı
        if (events.length > 20) score += 0.3;
        else if (events.length > 10) score += 0.2;
        else if (events.length > 5) score += 0.1;

        // Çeşitlilik
        const eventTypes = new Set(events.map((e) => e.type));
        score += Math.min(eventTypes.size * 0.1, 0.3);

        // Zaman dağılımı
        const timeSpan = events.length > 1
            ? new Date(events[events.length - 1].created_at).getTime() -
                new Date(events[0].created_at).getTime()
            : 0;
        const daySpan = timeSpan / (1000 * 60 * 60 * 24);
        if (daySpan > 20) score += 0.2;
        else if (daySpan > 10) score += 0.1;

        // Mood verileri
        const moodEvents = events.filter((e) => e.mood);
        if (moodEvents.length > 10) score += 0.2;
        else if (moodEvents.length > 5) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * 🎯 ANALİZ GÜVENİLİRLİĞİ HESAPLAMA
     */
    private static calculateAnalysisConfidence(
        patterns: BehavioralPattern[],
        dataQuality: number,
    ): number {
        if (patterns.length === 0) return 0;

        const avgPatternConfidence =
            patterns.reduce((sum, p) => sum + p.confidence_score, 0) /
            patterns.length;
        return (avgPatternConfidence * 0.7) + (dataQuality * 0.3);
    }

    /**
     * 🛡️ MİNİMAL ANALİZ (YETERSİZ VERİ)
     */
    private static createMinimalAnalysis(
        userId: string,
        periodDays: number,
    ): BehavioralAnalysisResult {
        return {
            user_id: userId,
            analysis_period_days: periodDays,
            total_patterns_found: 0,
            patterns: [],
            overall_trends: {
                communication_trend: "stable",
                mood_stability: "low",
                engagement_level: "low",
            },
            data_quality_score: 0,
            analysis_confidence: 0,
            generated_at: new Date().toISOString(),
        };
    }

    /**
     * 📊 KALIP ÖZETİ OLUŞTURMA
     */
    static async generatePatternSummary(
        analysis: BehavioralAnalysisResult,
    ): Promise<string> {
        if (analysis.total_patterns_found === 0) {
            return "Henüz yeterli veri bulunmuyor. Daha fazla etkileşim sonrasında kalıp analizi yapılabilir.";
        }

        const prompt = `
Sen bir davranış analisti olarak, aşağıdaki kalıp analizini kullanıcıya açıkla:

### ANALİZ VERİLERİ ###
- Toplam kalıp: ${analysis.total_patterns_found}
- Veri kalitesi: ${(analysis.data_quality_score * 100).toFixed(0)}%
- Analiz güvenilirliği: ${(analysis.analysis_confidence * 100).toFixed(0)}%

### TESPİT EDİLEN KALIPLAR ###
${
            analysis.patterns.map((p) => `
- ${p.pattern_name}: ${p.description}
  Güven: ${(p.confidence_score * 100).toFixed(0)}%
  Öneriler: ${p.suggested_insights.join(", ")}
`).join("\n")
        }

### TRENDLER ###
- İletişim trendi: ${analysis.overall_trends.communication_trend}
- Mood stabilite: ${analysis.overall_trends.mood_stability}
- Katılım seviyesi: ${analysis.overall_trends.engagement_level}

GÖREV: Bu veriyi kullanıcıya nazik, destekleyici ve yapıcı bir dilde özetle. 
Kesinlik belirtme, sadece gözlemlerden bahset. Umut verici ol.
Maksimum 300 kelime.
    `.trim();

        try {
            return await invokeGemini(prompt, AI_MODELS.FAST, {
                temperature: 0.6,
                maxOutputTokens: 400,
            });
        } catch (error) {
            console.error("Pattern summary generation failed:", error);
            return "Davranış kalıplarınız analiz edildi. Detaylar için sistem yöneticisine başvurun.";
        }
    }
}
