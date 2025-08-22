// app/sessions/voice_session.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router/";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    BackHandler,
    Easing,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { PremiumGate } from "../../../components/PremiumGate";
import { Colors } from "../../../constants/Colors";
import { useFeatureAccess } from "../../../hooks/useSubscription";
import { useVoiceSession } from "../../../hooks/useVoice";
import { incrementFeatureUsage } from "../../../services/api.service";
import { EventPayload } from "../../../services/event.service";
import { supabase } from "../../../utils/supabase";
import { therapists, TherapistID } from "../../../constants/therapists";

// Markdown render fonksiyonu - Paragraf düzenlemeli (voice session için)
const _renderMarkdownText = (text: string, accentColor: string) => {
    if (!text) return null;

    // Metni paragraflar halinde işle
    const paragraphs = text.split("\n\n").filter((p) => p.trim());

    return (
        <View>
            {paragraphs.map((paragraph, index) => {
                const trimmedParagraph = paragraph.trim();

                // Başlıklar
                if (trimmedParagraph.startsWith("###")) {
                    return (
                        <Text
                            key={index}
                            style={{
                                fontSize: 18,
                                color: "#1A202C",
                                lineHeight: 24,
                                fontWeight: "700",
                                marginTop: 12,
                                marginBottom: 6,
                            }}
                        >
                            {trimmedParagraph.slice(4)}
                        </Text>
                    );
                }

                if (trimmedParagraph.startsWith("##")) {
                    return (
                        <Text
                            key={index}
                            style={{
                                fontSize: 20,
                                color: "#1A202C",
                                lineHeight: 26,
                                fontWeight: "700",
                                marginTop: 15,
                                marginBottom: 8,
                            }}
                        >
                            {trimmedParagraph.slice(3)}
                        </Text>
                    );
                }

                // Madde işaretleri
                if (trimmedParagraph.startsWith("- ")) {
                    const lines = trimmedParagraph.split("\n");
                    return (
                        <View key={index} style={{ marginVertical: 4 }}>
                            {lines.map((line, lineIndex) => {
                                if (line.trim().startsWith("- ")) {
                                    return (
                                        <View
                                            key={lineIndex}
                                            style={{
                                                flexDirection: "row",
                                                marginBottom: 4,
                                                paddingLeft: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    color: accentColor,
                                                    marginRight: 6,
                                                    marginTop: 1,
                                                }}
                                            >
                                                •
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    color: "#2D3748",
                                                    lineHeight: 22,
                                                    flex: 1,
                                                }}
                                            >
                                                {line.trim().slice(2)}
                                            </Text>
                                        </View>
                                    );
                                }
                                return null;
                            })}
                        </View>
                    );
                }

                // Özel hatırlatma metni
                if (trimmedParagraph.includes("💭")) {
                    return (
                        <View
                            key={index}
                            style={{
                                backgroundColor: "#F7FAFC",
                                borderRadius: 8,
                                padding: 10,
                                marginVertical: 8,
                                borderLeftWidth: 3,
                                borderLeftColor: accentColor,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: "#4A5568",
                                    lineHeight: 20,
                                    fontStyle: "italic",
                                }}
                            >
                                {trimmedParagraph}
                            </Text>
                        </View>
                    );
                }

                // Normal paragraf - inline markdown ile
                const renderInlineFormats = (text: string) => {
                    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                    return (
                        <Text
                            key={index}
                            style={{
                                fontSize: 16,
                                color: "#2D3748",
                                lineHeight: 22,
                                letterSpacing: -0.2,
                                marginBottom: 8,
                            }}
                        >
                            {parts.map((part, i) => {
                                if (
                                    part.startsWith("**") && part.endsWith("**")
                                ) {
                                    return (
                                        <Text
                                            key={i}
                                            style={{
                                                fontWeight: "700",
                                                color: "#1A202C",
                                            }}
                                        >
                                            {part.slice(2, -2)}
                                        </Text>
                                    );
                                }
                                if (
                                    part.startsWith("*") &&
                                    part.endsWith("*") && !part.startsWith("**")
                                ) {
                                    return (
                                        <Text
                                            key={i}
                                            style={{
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {part.slice(1, -1)}
                                        </Text>
                                    );
                                }
                                return part;
                            })}
                        </Text>
                    );
                };

                return renderInlineFormats(trimmedParagraph);
            })}
        </View>
    );
};

export type ChatMessage = { id: string; sender: "user" | "ai"; text: string };

export default function VoiceSessionScreen() {
    const { therapistId, mood } = useLocalSearchParams<
        { therapistId: string; mood?: string }
    >();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedTherapist, setSelectedTherapist] = useState<
        typeof therapists[keyof typeof therapists] | null
    >(null);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Feature Access Hook
    const { _can_use, loading, refresh } = useFeatureAccess("voice_sessions");

    // YENİ: Tek bir yerden yönetilen animasyon değerleri
    const circleScale = useRef(new Animated.Value(1)).current;
    const dotOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (therapistId) {
            const therapist = therapists[therapistId as TherapistID];
            setSelectedTherapist(therapist || Object.values(therapists)[0]);
        } else {
            setSelectedTherapist(Object.values(therapists)[0]);
        }
    }, [therapistId]);

    const {
        isRecording,
        isProcessing,
        startRecording,
        stopRecording,
        cleanup,
        speakText,
    } = useVoiceSession({
        onSpeechPlaybackStatusUpdate: (status) => {
            console.log("🗣️ [VOICE-SESSION] Speaking status update received:", {
                isPlaying: status.isPlaying,
            });
            setIsSpeaking(status.isPlaying);
        },
        onTranscriptReceived: async (userText) => {
            if (!userText) return;

            console.log("🧠 [VOICE-SESSION] AI Processing START");
            setIsProcessingAI(true);

            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                sender: "user",
                text: userText,
            };
            setMessages((prev) => [...prev, userMessage]);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsProcessingAI(false);
                return;
            }

            const eventToProcess: EventPayload = {
                type: "voice_session",
                data: {
                    userMessage: userMessage.text,
                    therapistId,
                    initialMood: mood,
                    intraSessionChatHistory: [...messages, userMessage].map(
                        (m) =>
                            `${
                                m.sender === "user"
                                    ? "Danışan"
                                    : "Terapist"
                            }: ${m.text}`,
                    ).join("\n"),
                },
            };

            const { data, error } = await supabase.functions.invoke("orchestrator", {
                body: { eventPayload: eventToProcess },
            });
            
            if (error) throw error;
            
            const aiReplyText = typeof data === "string" ? data : data?.aiResponse || "";

            console.log("🧠 [VOICE-SESSION] AI Processing END");
            setIsProcessingAI(false);

            if (!aiReplyText) {
                const errorMessage = "Üzgünüm, şu an bir sorun yaşıyorum.";
                setMessages(
                    (prev) => [...prev, {
                        id: `ai-error-${Date.now()}`,
                        sender: "ai",
                        text: errorMessage,
                    }],
                );
                speakText(errorMessage, therapistId);
            } else {
                const aiMessage: ChatMessage = {
                    id: `ai-${Date.now()}`,
                    sender: "ai",
                    text: aiReplyText,
                };
                setMessages((prev) => [...prev, aiMessage]);
                speakText(aiReplyText, therapistId);
            }
        },
        therapistId,
    });

    // GÜNCELLENMİŞ ve KESİNTİSİZ: 3 aşamalı animasyon yöneticisi
    useEffect(() => {
        circleScale.stopAnimation();
        dotOpacity.stopAnimation();

        if (isRecording) {
            // --- DİNLİYOR ANİMASYONU (Beğenilen) ---
            Animated.loop(
                Animated.sequence([
                    Animated.timing(circleScale, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(circleScale, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ]),
            ).start();
        } else if (isProcessing || isProcessingAI) {
            // --- DÜŞÜNÜYOR ANİMASYONU (Yeniden tasarlandı) ---
            Animated.loop(
                Animated.sequence([
                    Animated.timing(circleScale, {
                        toValue: 1.07,
                        duration: 1600,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(circleScale, {
                        toValue: 1,
                        duration: 1600,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ]),
            ).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dotOpacity, {
                        toValue: 0.3,
                        duration: 1600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dotOpacity, {
                        toValue: 1,
                        duration: 1600,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        } else if (isSpeaking) {
            // --- KONUŞUYOR ANİMASYONU (Yeniden tasarlandı) ---
            Animated.loop(
                Animated.sequence([
                    Animated.timing(circleScale, {
                        toValue: 1.12,
                        duration: 500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(circleScale, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ]),
            ).start();
        } else {
            // --- DURMA HALİ ---
            Animated.spring(circleScale, { toValue: 1, useNativeDriver: true })
                .start();
            Animated.spring(dotOpacity, { toValue: 1, useNativeDriver: true })
                .start();
        }
    }, [isRecording, isProcessing, isProcessingAI, isSpeaking]);

    const handleSessionEnd = useCallback(async () => {
        await stopRecording?.();
        if (messages.length > 1) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const sessionEndPayload: EventPayload = {
                    type: "voice_session",
                    data: {
                        isSessionEnd: true,
                        therapistId,
                        initialMood: mood,
                        messages,
                        transcript: messages.map((m) =>
                            `${m.sender}: ${m.text}`
                        ).join("\n"),
                    },
                };
                await supabase.functions.invoke("orchestrator", {
                    body: { eventPayload: sessionEndPayload },
                });
                // Kullanım sayısını artır
                await incrementFeatureUsage("voice_sessions");
                console.log(
                    "✅ [USAGE] voice_sessions kullanımı başarıyla artırıldı.",
                );
            }
        }
        router.replace("/feel/after_feeling");
    }, [messages, therapistId, mood, router, stopRecording]);

    const onBackPress = useCallback(() => {
        Alert.alert(
            "Seansı Sonlandır",
            "Seansı sonlandırmak istediğinizden emin misiniz? Sohbetiniz kaydedilecek.",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sonlandır",
                    style: "destructive",
                    onPress: handleSessionEnd,
                },
            ],
        );
        return true;
    }, [handleSessionEnd]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress,
        );
        return () => subscription.remove();
    }, [onBackPress]);

    // Sayfa yüklendiğinde ve odaklandığında erişimi yenile
    useEffect(() => {
        refresh();
    }, []);

    /* ---------------------------- HELPERS --------------------------------- */
    const _formatDuration = (s: number) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    /* ---------------------------------------------------------------------- */
    /* RENDERERS                                                              */
    /* ---------------------------------------------------------------------- */

    return (
        <PremiumGate featureType="voice_sessions" premiumOnly>
            <LinearGradient
                colors={isDark
                    ? ["#232526", "#414345"]
                    : ["#F4F6FF", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                {loading
                    ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <ActivityIndicator
                                size="large"
                                color={isDark ? "#fff" : Colors.light.tint}
                            />
                        </View>
                    )
                    : (
                        <>
                            {/* Geri/Kapat butonu */}
                            <TouchableOpacity
                                onPress={onBackPress}
                                style={styles.back}
                            >
                                <Ionicons
                                    name="chevron-back"
                                    size={28}
                                    color={isDark ? "#fff" : Colors.light.tint}
                                />
                            </TouchableOpacity>

                            {/* Terapist avatar ve adı */}
                            <View style={styles.therapistHeaderRow}>
                                <View style={styles.avatarGradientBox}>
                                    <LinearGradient
                                        colors={[
                                            Colors.light.tint,
                                            "rgba(255,255,255,0.9)",
                                        ]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.avatarGradient}
                                    >
                                        <Image
                                            source={selectedTherapist
                                                ?.photo ||
                                                Object.values(therapists)[0].photo}
                                            style={styles.therapistAvatarXL}
                                        />
                                    </LinearGradient>
                                </View>
                                <View style={styles.therapistInfoBoxRow}>
                                    <Text
                                        style={[styles.therapistNameRow, {
                                            color: isDark
                                                ? "#fff"
                                                : Colors.light.tint,
                                        }]}
                                    >
                                        {selectedTherapist?.name || "Terapist"}
                                    </Text>
                                    <Text style={styles.therapistTitleRow}>
                                        {selectedTherapist?.title}
                                    </Text>
                                </View>
                            </View>

                            {/* Lüks ve premium, kart olmayan, markaya uygun alan */}
                            <View style={styles.premiumSessionArea}>
                                <Text style={styles.logo}>
                                    therapy<Text style={styles.dot}>.</Text>
                                </Text>
                                <Text
                                    style={[styles.title, {
                                        color: isDark
                                            ? "#222"
                                            : Colors.light.text,
                                    }]}
                                >
                                    Sesli Terapi
                                </Text>

                                <Animated.View
                                    style={[
                                        styles.circle,
                                        {
                                            backgroundColor: isRecording
                                                ? "#F8FAFF"
                                                : "#fff",
                                            borderColor: isProcessing
                                                ? "#FFD700"
                                                : (isRecording
                                                    ? Colors.light.tint
                                                    : "#E3E8F0"),
                                            borderWidth:
                                                isRecording || isProcessing
                                                    ? 2
                                                    : 1,
                                            shadowColor: isRecording
                                                ? Colors.light.tint
                                                : "#B0B8C1",
                                            shadowOpacity: isRecording
                                                ? 0.13
                                                : 0.07,
                                            transform: [{ scale: circleScale }], // İKİ ANİMASYONU BİRLEŞTİR
                                        },
                                    ]}
                                >
                                    {isProcessing
                                        ? (
                                            <ActivityIndicator
                                                size="large"
                                                color={Colors.light.tint}
                                            />
                                        )
                                        : (
                                            <>
                                                <Animated.View
                                                    style={[
                                                        styles.brandWave,
                                                        {
                                                            borderColor:
                                                                isRecording
                                                                    ? Colors
                                                                        .light
                                                                        .tint
                                                                    : "#E3E8F0",
                                                            opacity: isRecording
                                                                ? 0.18
                                                                : 0.10,
                                                            transform: [{
                                                                scale:
                                                                    circleScale,
                                                            }],
                                                        },
                                                    ]}
                                                />
                                                <Animated.View
                                                    style={[
                                                        styles.brandDot,
                                                        {
                                                            opacity: dotOpacity,
                                                        },
                                                    ]}
                                                />
                                            </>
                                        )}
                                </Animated.View>

                                <View style={styles.controls}>
                                    <TouchableOpacity
                                        disabled={isProcessing || isRecording}
                                        onPress={() => {
                                            if (!isRecording && !isProcessing) {
                                                startRecording();
                                            }
                                        }}
                                        style={[
                                            styles.button,
                                            isProcessing || isRecording
                                                ? styles.btnMuted
                                                : styles.btnActive,
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons
                                            name={isRecording
                                                ? "mic"
                                                : "mic-outline"}
                                            size={32}
                                            color={isProcessing || isRecording
                                                ? "#aaa"
                                                : Colors.light.tint}
                                        />
                                    </TouchableOpacity>
                                    {isRecording && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                stopRecording();
                                            }}
                                            style={[
                                                styles.button,
                                                styles.btnActive,
                                            ]}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons
                                                name="stop-circle-outline"
                                                size={32}
                                                color={Colors.light.tint}
                                            />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={onBackPress}
                                        style={[styles.button, styles.btnMuted]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={22}
                                            color={Colors.light.tint}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
            </LinearGradient>
        </PremiumGate>
    );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        minHeight: "100%",
    },
    back: {
        position: "absolute",
        top: 60,
        left: 24,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 16,
        padding: 8,
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        borderWidth: 0.5,
        borderColor: "rgba(227,232,240,0.4)",
    },
    therapistHeaderRow: {
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center",
        marginTop: 120,
        marginBottom: 20,
        backgroundColor: "transparent",
    },
    avatarGradientBox: {
        borderRadius: 70,
        padding: 3,
        backgroundColor: "transparent",
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 8,
    },
    avatarGradient: {
        borderRadius: 70,
        padding: 2.5,
        borderWidth: 1,
        borderColor: "rgba(93,161,217,0.4)",
    },
    therapistAvatarXL: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
    therapistInfoBoxRow: {
        flexDirection: "column",
        alignItems: "center",
        marginTop: 10,
    },
    therapistNameRow: {
        fontSize: 21,
        fontWeight: "600",
        color: Colors.light.tint,
        letterSpacing: 0.3,
        textShadowColor: "rgba(255,255,255,0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    therapistTitleRow: {
        fontSize: 15,
        color: "#8A94A6",
        fontWeight: "500",
        marginTop: 2,
        letterSpacing: 0.2,
        opacity: 0.9,
    },
    timerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(227, 232, 240, 0.6)",
    },
    timerText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A5568",
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    logo: {
        fontSize: 32,
        fontWeight: "600",
        color: Colors.light.tint,
        textTransform: "lowercase",
        letterSpacing: 2,
        marginBottom: 4,
        opacity: 0.95,
        textAlign: "center",
        marginTop: 10,
    },
    dot: {
        color: Colors.light.tint,
        fontSize: 38,
        fontWeight: "900",
    },
    title: {
        fontSize: 24,
        fontWeight: "600",
        textAlign: "center",
        marginVertical: 8,
        letterSpacing: 0.8,
        opacity: 0.92,
        marginBottom: 32,
        color: "#2D3748",
    },
    circle: {
        width: 180, // BÜYÜTÜLDÜ
        height: 180, // BÜYÜTÜLDÜ
        borderRadius: 90, // BÜYÜTÜLDÜ
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 20,
        backgroundColor: "#FFFFFF",
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: "rgba(93,161,217,0.3)",
    },
    brandWave: {
        position: "absolute",
        width: 160, // BÜYÜTÜLDÜ
        height: 160, // BÜYÜTÜLDÜ
        borderRadius: 80, // BÜYÜTÜLDÜ
        borderWidth: 3, // Daha belirgin
        borderColor: "rgba(93,161,217,0.25)",
        zIndex: 1,
        opacity: 0.15,
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    brandDot: {
        width: 30, // BÜYÜTÜLDÜ
        height: 30, // BÜYÜTÜLDÜ
        borderRadius: 15, // BÜYÜTÜLDÜ
        backgroundColor: Colors.light.tint,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        zIndex: 2,
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        alignSelf: "center",
    },
    controls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginTop: 36,
        marginBottom: 32,
        gap: 20,
    },
    button: {
        padding: 22,
        borderRadius: 54,
        backgroundColor: "#FFFFFF",
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: Colors.light.tint,
    },
    btnActive: {
        backgroundColor: "#FFFFFF",
        borderColor: Colors.light.tint,
        shadowColor: Colors.light.tint,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 12,
    },
    btnMuted: {
        backgroundColor: "#FFFFFF",
        borderColor: Colors.light.tint,
        shadowColor: "#B0B8C1",
        shadowOpacity: 0.12,
    },
    premiumSessionArea: {
        backgroundColor: "transparent",
        width: "100%",
        alignItems: "center",
        marginTop: 40,
    },
    premiumPrompt: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    premiumCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        width: "100%",
        maxWidth: 320,
    },
    premiumHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    premiumTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "white",
        marginTop: 8,
    },
    premiumDescription: {
        fontSize: 16,
        color: "white",
        textAlign: "center",
        opacity: 0.9,
        marginBottom: 24,
        lineHeight: 24,
    },
    premiumButton: {
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    premiumButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6366F1",
    },
});
