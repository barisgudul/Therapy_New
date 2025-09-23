// app/sessions/voice_session.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router/";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { PremiumGate } from "../../../components/PremiumGate";
import { Colors } from "../../../constants/Colors";
import { useFeatureAccess } from "../../../hooks/useSubscription";
import { useVoiceSessionReducer } from "../../../hooks";
import { useTranslation } from "react-i18next";

export default function VoiceSessionScreen() {
    const { mood: _mood } = useLocalSearchParams<
        { mood?: string }
    >();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { t } = useTranslation();

    // Feature Access Hook
    const { loading, refresh } = useFeatureAccess("voice_sessions");

    // YENİ: Yeni beyin hook'u - tüm state yönetimi burada
    const { state, actions } = useVoiceSessionReducer({
        onSessionEnd: () => router.replace('/feel/after_feeling'),
    });

    // YENİ: Tek bir yerden yönetilen animasyon değerleri
    const circleScale = useRef(new Animated.Value(1)).current;
    const dotOpacity = useRef(new Animated.Value(1)).current;

    // GÜNCELLENMİŞ ve KESİNTİSİZ: 3 aşamalı animasyon yöneticisi
    useEffect(() => {
        circleScale.stopAnimation();
        dotOpacity.stopAnimation();

        if (state.status === 'recording') {
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
        } else if (state.status === 'processing' || state.status === 'thinking') {
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
        } else if (state.status === 'speaking') {
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
    }, [state.status, circleScale, dotOpacity]); // Dependency'leri ekledim

    // Sayfa yüklendiğinde ve odaklandığında erişimi yenile
    useEffect(() => {
        refresh();
    }, [refresh]); // refresh dependency'sini ekledim

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
                <SafeAreaView style={styles.flex}>
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
                                {/* YENİ VE SON KEZ DOĞRU HEADER YAPISI */}
                                <View style={styles.header}>
                                    <TouchableOpacity
                                        onPress={actions.handleBackPress}
                                        style={styles.backButton}
                                    >
                                        <Ionicons
                                            name="chevron-back"
                                            size={28}
                                            color={isDark ? "#fff" : Colors.light.tint}
                                        />
                                    </TouchableOpacity>
                                    {/* Header'ın sağ tarafını boş bırakarak simetri sağla */}
                                    <View style={{ width: 44 }} />
                                </View>

                                {/* İÇERİĞİ SCROLLVIEW İLE SAR */}
                                <ScrollView
                                    style={styles.scrollView}
                                    contentContainerStyle={styles.scrollContent}
                                    showsVerticalScrollIndicator={false}
                                >
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

                                            </LinearGradient>
                                        </View>
                                        <View style={styles.therapistInfoBoxRow}>

                                        </View>
                                    </View>

                                    {/* Lüks ve premium, kart olmayan, markaya uygun alan */}
                                    <View style={styles.premiumSessionArea}>
                                        <Text style={styles.logo}>
                                            Gisbel<Text style={styles.dot}>.</Text>
                                        </Text>
                                        <Text
                                            style={[styles.title, {
                                                color: isDark
                                                    ? "#222"
                                                    : Colors.light.text,
                                            }]}
                                        >
                                            {t('voice_session.title')}
                                        </Text>

                                        <Animated.View
                                            style={[
                                                styles.circle,
                                                {
                                                    backgroundColor: state.status === 'recording'
                                                        ? "#F8FAFF"
                                                        : "#fff",
                                                    borderColor: state.status === 'processing' || state.status === 'thinking'
                                                        ? "#FFD700"
                                                        : (state.status === 'recording'
                                                            ? Colors.light.tint
                                                            : "#E3E8F0"),
                                                    borderWidth:
                                                        state.status === 'recording' || state.status === 'processing' || state.status === 'thinking'
                                                            ? 2
                                                            : 1,
                                                    shadowColor: state.status === 'recording'
                                                        ? Colors.light.tint
                                                        : "#B0B8C1",
                                                    shadowOpacity: state.status === 'recording'
                                                        ? 0.13
                                                        : 0.07,
                                                    transform: [{ scale: circleScale }], // İKİ ANİMASYONU BİRLEŞTİR
                                                },
                                            ]}
                                        >
                                            {state.status === 'processing' || state.status === 'thinking'
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
                                                                        state.status === 'recording'
                                                                            ? Colors
                                                                                .light
                                                                                .tint
                                                                            : "#E3E8F0",
                                                                    opacity: state.status === 'recording'
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
                                                disabled={state.status === 'processing' || state.status === 'thinking' || state.status === 'recording'}
                                                onPress={() => {
                                                    if (state.status === 'idle' || state.status === 'speaking') {
                                                        actions.startRecording();
                                                    }
                                                }}
                                                style={[
                                                    styles.button,
                                                    state.status === 'processing' || state.status === 'thinking' || state.status === 'recording'
                                                        ? styles.btnMuted
                                                        : styles.btnActive,
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                <Ionicons
                                                    name={state.status === 'recording'
                                                        ? "mic"
                                                        : "mic-outline"}
                                                    size={32}
                                                    color={state.status === 'processing' || state.status === 'thinking' || state.status === 'recording'
                                                        ? "#aaa"
                                                        : Colors.light.tint}
                                                />
                                            </TouchableOpacity>
                                            {state.status === 'recording' && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        actions.stopRecording();
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
                                                onPress={actions.handleBackPress}
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
                                </ScrollView>
                            </>
                        )}
                </SafeAreaView>
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
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    backButton: {
        // position, top, left, zIndex GİTTİ - Artık doğal akışta
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center', // ScrollView içeriğini ortala
        paddingBottom: 40,
    },
    therapistHeaderRow: {
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center",
        marginTop: 20, // marginTop: 120'yi SİL - artık header'ın altında
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
