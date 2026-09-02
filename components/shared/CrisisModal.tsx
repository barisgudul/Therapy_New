// components/shared/CrisisModal.tsx
//
// Kriz (level_3_high_alert) ekranı. Backend bir kullanıcının yüksek riskli
// (örn. intihar) içerik gönderdiğini tespit ettiğinde normal hata toast'u yerine
// bu ŞEFKATLİ, sakin ekran gösterilir. Kapatılabilir ama acil yardım hatları
// belirgindir. İçerik (title/message/resources) zaten dile özel backend'den gelir;
// yalnızca "Ara" buton etiketi i18n'den okunur.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import { useCrisisStore } from "../../store/crisisStore";
import { toDialNumber, type CrisisResource } from "../../utils/crisis";

const PALETTE = {
    backdrop: "rgba(15, 27, 45, 0.55)",
    card: "#FFFFFF",
    headerGradient: ["#4E98D9", "#3E6B89"] as [string, string],
    title: "#1A2947",
    message: "#3D4A5C",
    resourceCard: "#F2F6FB",
    resourceBorder: "rgba(62, 107, 137, 0.18)",
    resourceLabel: "#1A2947",
    resourceNote: "#6B7A8D",
    callGradient: ["#5DA1D9", "#3E6B89"] as [string, string],
    close: "#8A97A8",
};

function ResourceRow({
    resource,
    callLabel,
}: {
    resource: CrisisResource;
    callLabel: string;
}) {
    const onCall = () => {
        const dial = toDialNumber(resource.phone);
        if (dial) {
            Linking.openURL(`tel:${dial}`).catch(() => {
                /* arama başlatılamazsa sessizce geç */
            });
        }
    };

    return (
        <View style={styles.resourceCard}>
            <View style={styles.resourceInfo}>
                <Text style={styles.resourceLabel}>{resource.label}</Text>
                <Text style={styles.resourcePhone}>{resource.phone}</Text>
                {!!resource.note && (
                    <Text style={styles.resourceNote}>{resource.note}</Text>
                )}
            </View>
            <TouchableOpacity
                onPress={onCall}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${callLabel} ${resource.label}`}
                testID={`crisis-call-${toDialNumber(resource.phone)}`}
            >
                <LinearGradient
                    colors={PALETTE.callGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.callButton}
                >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.callText}>{callLabel}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

export function CrisisModal() {
    const { t } = useTranslation();
    const payload = useCrisisStore((s) => s.payload);
    const hide = useCrisisStore((s) => s.hide);

    const callLabel = t("crisis.call_button", { defaultValue: "Call" });

    return (
        <ReactNativeModal
            isVisible={!!payload}
            onBackdropPress={hide}
            onBackButtonPress={hide}
            backdropColor={PALETTE.backdrop}
            backdropOpacity={1}
            backdropTransitionOutTiming={0}
            useNativeDriver
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
            animationIn="fadeInUp"
            animationOut="fadeOutDown"
            style={styles.modal}
        >
            <View style={styles.card}>
                <LinearGradient
                    colors={PALETTE.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <TouchableOpacity
                        onPress={hide}
                        style={styles.closeButton}
                        accessibilityRole="button"
                        accessibilityLabel={t("crisis.close", {
                            defaultValue: "Close",
                        })}
                        testID="crisis-close-button"
                    >
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.heartWrapper}>
                        <Ionicons name="heart" size={30} color="#FFFFFF" />
                    </View>
                    {!!payload?.title && (
                        <Text style={styles.title}>{payload.title}</Text>
                    )}
                </LinearGradient>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                >
                    {!!payload?.message && (
                        <Text style={styles.message}>{payload.message}</Text>
                    )}

                    {payload?.resources?.map((resource, index) => (
                        <ResourceRow
                            key={`${resource.phone}-${index}`}
                            resource={resource}
                            callLabel={callLabel}
                        />
                    ))}
                </ScrollView>
            </View>
        </ReactNativeModal>
    );
}

const styles = StyleSheet.create({
    modal: {
        margin: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "90%",
        maxHeight: "85%",
        backgroundColor: PALETTE.card,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    header: {
        paddingTop: 22,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
    },
    heartWrapper: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
    },
    title: {
        marginTop: 14,
        fontSize: 22,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
        letterSpacing: -0.4,
    },
    body: {
        flexGrow: 0,
    },
    bodyContent: {
        padding: 22,
    },
    message: {
        fontSize: 15,
        lineHeight: 23,
        color: PALETTE.message,
        textAlign: "center",
        marginBottom: 20,
    },
    resourceCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: PALETTE.resourceCard,
        borderWidth: 1,
        borderColor: PALETTE.resourceBorder,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    resourceInfo: {
        flex: 1,
        paddingRight: 12,
    },
    resourceLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: PALETTE.resourceLabel,
    },
    resourcePhone: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3E6B89",
        marginTop: 2,
        letterSpacing: 0.3,
    },
    resourceNote: {
        fontSize: 12,
        color: PALETTE.resourceNote,
        marginTop: 4,
        lineHeight: 17,
    },
    callButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    callText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
});
