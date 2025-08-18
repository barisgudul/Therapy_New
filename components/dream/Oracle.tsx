// components/dream/Oracle.tsx
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import React, { useReducer } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";

import { COSMIC_COLORS } from "../../constants/Colors";
import {
    generateSilentOracle,
    type OracleOutput,
} from "../../services/ai.service";
import type { AppEvent } from "../../services/event.service";
import type { OracleInputs } from "../../services/prompt.service";
import type { AnalysisReportContent } from "../../types/analysis";
import DreamSigil from "./Sigil";

// State yönetimi aynı, dokunmuyoruz.
type OracleState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: OracleOutput };

type OracleAction =
    | { type: "FETCH" }
    | { type: "RESOLVE"; payload: OracleOutput }
    | { type: "REJECT"; payload: string }
    | { type: "RESET" };

const oracleReducer = (state: OracleState, action: OracleAction): OracleState => {
    switch (action.type) {
        case "FETCH": return { status: "loading" };
        case "RESOLVE": return { status: "success", data: action.payload };
        case "REJECT": return { status: "error", message: action.payload };
        case "RESET": return { status: "idle" };
        default: return state;
    }
};

interface OracleProps {
    event: AppEvent;
    report: AnalysisReportContent | null;
    initialData?: OracleOutput;
    onSaveResult?: (data: OracleOutput) => void;
}

export default function Oracle({ event, report, initialData, onSaveResult }: OracleProps) {
    const initialState: OracleState = initialData ? { status: "success", data: initialData } : { status: "idle" };
    const [state, dispatch] = useReducer(oracleReducer, initialState);
    const tapAnimation = useSharedValue(0);

    const handleFetchOracle = async () => {
        dispatch({ type: "FETCH" });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        tapAnimation.value = withTiming(1, { duration: 600 });
        try {
            const inputs = buildInputs(event, report);
            const output = await generateSilentOracle(inputs);
            dispatch({ type: "RESOLVE", payload: output });
            onSaveResult?.(output);
        } catch (_error) {
            dispatch({ type: "REJECT", payload: "Analiz şu an mümkün değil. Lütfen daha sonra tekrar dene." });
        }
    };

    return (
        <MotiView
            style={styles.card}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 500 }}
        >
            <View style={styles.sigilBackground}>
                <DreamSigil tapAnimation={tapAnimation} />
            </View>

            {/* 🔥 DEĞİŞİKLİK 1: İKON VE BAŞLIK GÜNCELLENDİ 🔥 */}
            <View style={styles.cardHeader}>
                <Ionicons name="telescope-outline" size={24} color={COSMIC_COLORS.accent} />
                <Text style={styles.cardTitle}>Daha Derine İn</Text>
            </View>

            <View style={styles.contentContainer}>
                {state.status === "idle" && (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* 🔥 DEĞİŞİKLİK 2: ALT BAŞLIK VE BUTON METNİ GÜNCELLENDİ 🔥 */}
                        <Text style={styles.subtitle}>
                            Yüzeyin altındaki gizli bağlantıları ve eylem adımlarını gör.
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            onPress={handleFetchOracle}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={["#6AB1EC", "#4E98D9"]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>Keşfet</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </MotiView>
                )}

                {state.status === "loading" && (
                     <View style={styles.centered}>
                        <ActivityIndicator color={COSMIC_COLORS.accent} size="small" />
                        <Text style={styles.loadingText}>Analiz ediliyor...</Text>
                    </View>
                )}

                {state.status === "error" && (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.centered}>
                        <Text style={styles.errorText}>{state.message}</Text>
                        <TouchableOpacity style={styles.buttonContainer} onPress={handleFetchOracle} activeOpacity={0.8}>
                            <LinearGradient colors={["#6AB1EC", "#4E98D9"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.button}>
                                <Text style={styles.buttonText}>Tekrar Dene</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </MotiView>
                )}

                {state.status === "success" && (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.whispersContainer}>
                        <InsightBubble icon="book-outline" text={state.data.f1} delay={100} />
                        <InsightBubble icon="bulb-outline" text={state.data.f2} delay={300} />
                        <InsightBubble icon="compass-outline" text={state.data.f3} isAction delay={500} />
                    </MotiView>
                )}
            </View>
        </MotiView>
    );
}

const InsightBubble = ({ icon, text, isAction = false, delay = 0 }: { icon: keyof typeof Ionicons.glyphMap; text: string; isAction?: boolean; delay?: number; }) => {
    const textElement = (
        <Text style={[styles.whisper, isAction && styles.actionText]}>{`“${text}”`}</Text>
    );

    return (
        <MotiView
            style={styles.insightBubble}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 400, delay }}
        >
            <Ionicons
                name={icon}
                size={18}
                color={COSMIC_COLORS.accent}
                style={{ marginRight: 10, marginTop: 3 }}
            />
            {isAction ? (
                <MaskedView style={{ flex: 1 }} maskElement={textElement}>
                    <LinearGradient
                        colors={["#87C7FF", "#6AB1EC"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={[styles.whisper, { opacity: 0 }]}>{`“${text}”`}</Text>
                    </LinearGradient>
                </MaskedView>
            ) : (
                textElement
            )}
        </MotiView>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COSMIC_COLORS.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COSMIC_COLORS.cardBorder,
        overflow: 'hidden',
        position: 'relative',
    },
    sigilBackground: {
        position: 'absolute',
        top: -40,
        right: -40,
        opacity: 0.1,
        transform: [{ scale: 0.8 }],
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        zIndex: 1,
    },
    cardTitle: {
        color: COSMIC_COLORS.textPrimary,
        fontSize: 20,
        fontWeight: '600',
        marginLeft: 12,
    },
    contentContainer: {
        minHeight: 120,
        justifyContent: 'center',
        zIndex: 1,
    },
    centered: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    subtitle: {
        color: COSMIC_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    buttonContainer: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: COSMIC_COLORS.textPrimary,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        color: COSMIC_COLORS.textSecondary,
        marginTop: 12,
        fontSize: 15
    },
    errorText: {
        color: '#FF7B7B',
        textAlign: 'center',
        marginBottom: 16,
        fontSize: 15
    },
    whispersContainer: {
        gap: 12,
    },
    insightBubble: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: COSMIC_COLORS.cardBorder,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    whisper: {
        flex: 1,
        color: COSMIC_COLORS.textPrimary,
        fontSize: 15,
        lineHeight: 24,
    },
    actionText: {
        fontWeight: '700',
        color: 'white',
    },
});

function buildInputs(event: AppEvent, report: AnalysisReportContent | null): OracleInputs {
    const data = event.data as Record<string, any>;
    const a = (data?.analysis ?? {}) as any;
    const dreamTheme = a.themes?.[0] || "Kontrol Kaybı";
    const pastLink = a.crossConnections?.[0] ? `${a.crossConnections[0].connection}: ${a.crossConnections[0].evidence}` : (report?.reportSections.goldenThread || a.summary || a.interpretation || "Geçmiş bir bağ");
    const blindSpot = report?.reportSections.blindSpot || a.interpretation || "zor konuşmadan kaçınma";
    const goldenThread = report?.reportSections.goldenThread || a.summary || a.interpretation || "tekrar eden yönelim";
    return { dreamTheme, pastLink, blindSpot, goldenThread };
}