// services/session.service.ts
import { supabase } from "../utils/supabase";
import { incrementFeatureUsage } from "./api.service";
import { AppEvent, EventPayload, getEventById } from "./event.service";
import { processUserMessage } from "./orchestration.service";

export interface SessionEndData {
    initialMood?: string;
    finalMood: string;
    transcript: string;
    messages: { sender: "user" | "ai"; text: string }[];
}

export interface SendMessageData {
    userMessage: string;
    messages: { sender: "user" | "ai"; text: string }[]; // YENİ: yapılandırılmış dizi
    initialMood?: string;
}

export interface SendMessageResponse {
    aiResponse: string;
    usedMemory: { content: string; source_layer: string } | null;
}

export class SessionService {
    /**
     * Kullanıcı mesajını gönderir ve AI yanıtını alır
     */
    static async sendMessage(
        data: SendMessageData,
    ): Promise<SendMessageResponse> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const eventToProcess: EventPayload = {
            type: "text_session",
            data: {
                userMessage: data.userMessage,
                messages: data.messages, // YENİ: yapılandırılmış mesaj dizisi
                initialMood: data.initialMood,
            },
        };

        const aiReply = await processUserMessage(user.id, eventToProcess);

        if (!aiReply) {
            throw new Error("No AI response received");
        }

        // YENİ: Backend'den gelen yanıtı parse et
        if (typeof aiReply === "string") {
            // Eski format - sadece string
            return {
                aiResponse: aiReply,
                usedMemory: null,
            };
        } else if (typeof aiReply === "object" && aiReply !== null) {
            // Yeni format - { aiResponse, usedMemory }
            const response = aiReply as {
                aiResponse: string;
                usedMemory: { content: string; source_layer: string } | null;
            };
            return {
                aiResponse: response.aiResponse,
                usedMemory: response.usedMemory,
            };
        }

        // Fallback
        return {
            aiResponse: "Yanıt alındı",
            usedMemory: null,
        };
    }

    /**
     * Seansı sonlandırır ve verileri kaydeder
     */
    static async endSession(data: SessionEndData): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // ADIM 1: Mevcut session_end event'ini logla. Bu zaten vardı.
        const sessionEndPayload: EventPayload = {
            type: "session_end", // Tipini 'text_session' yerine 'session_end' yapalım ki karışmasın
            data: { ...data },
        };
        await processUserMessage(user.id, sessionEndPayload);

        // ADIM 2: ARKA PLANDA "HAFIZAYA KAYDET" İŞLEMİNİ TETİKLE (ATEŞLE VE UNUT)
        // Kullanıcı bu işlemin bitmesini beklemeyecek.
        if (data.messages.length > 2) { // En az bir kullanıcı ve bir AI mesajı varsa
            console.log(
                "🧠 [Memory] Sohbet özeti için backend tetikleniyor...",
            );
            supabase.functions.invoke("process-session-memory", {
                body: { transcript: data.transcript },
            }).catch((err) => {
                // Bu hata kritik değil, sadece logla.
                console.error("⛔️ Arka plan hafıza işleme hatası:", err);
            });
        }

        // ADIM 3: Kullanım sayacını artır
        incrementFeatureUsage("text_sessions");
        console.log("✅ [USAGE] text_sessions kullanımı başarıyla artırıldı.");
    }

    /**
     * Mevcut kullanıcıyı getirir
     */
    static async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    }

    /**
     * ID ile tek bir seans olayını getirir
     */
    static async getSessionById(eventId: string): Promise<AppEvent | null> {
        // event.service içindeki mevcut mantığı yeniden kullanıyoruz.
        // Bu, kod tekrarını önler.
        return await getEventById(eventId);
    }
}
