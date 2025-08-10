// app/settings.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuth } from "../context/Auth.tsx";
import { signOut } from "../utils/auth.ts";
import { supabase } from "../utils/supabase.ts";

// --- BÖLÜM 1: YENİ, ÖZELLEŞTİRİLMİŞ COMPONENT'LER ---

// Izgara yapısı için Kare Ayar Kartı
const SettingsCard = (
    { icon, label, onPress }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        onPress: () => void;
    },
) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
        <View style={styles.cardIconContainer}>
            <Ionicons name={icon} size={28} color="#1E293B" />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
);

// Öne Çıkan, Tam Genişlikli Kart (Abonelik için)
const FeaturedCard = (
    { icon, label, subtitle, onPress }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        subtitle: string;
        onPress: () => void;
    },
) => (
    <Pressable
        onPress={onPress}
        style={(
            { pressed },
        ) => [styles.featuredCard, pressed && styles.cardPressed]}
    >
        <LinearGradient
            colors={["#EDE9FE", "#F0F9FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.featuredIconContainer}>
            <Ionicons name={icon} size={32} color="#5B21B6" />
        </View>
        <View style={styles.featuredTextContainer}>
            <Text style={styles.featuredLabel}>{label}</Text>
            <Text style={styles.featuredSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="arrow-forward" size={24} color="#5B21B6" />
    </Pressable>
);

// --- BÖLÜM 2: ANA AYARLAR EKRANI ---

export default function SettingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isResetting, setIsResetting] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            "Çıkış Yap",
            "Hesabınızdan çıkış yapmak istediğinizden emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Çıkış Yap",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace("/login");
                        } catch (error: unknown) {
                            const errorMessage = error instanceof Error
                                ? error.message
                                : "Beklenmedik bir hata oluştu";
                            console.error(
                                "Çıkış yapılırken bir hata oluştu:",
                                errorMessage,
                            );
                            Alert.alert("Hata", errorMessage);
                        }
                    },
                },
            ],
        );
    };

    const handleResetData = () => {
        const confirmationText = "tüm verilerimi sil";
        Alert.alert(
            "Emin misiniz?",
            `Bu işlem GERİ ALINAMAZ! Tüm uygulama verileriniz kalıcı olarak silinecektir.`,
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Devam Et",
                    style: "destructive",
                    onPress: () => {
                        Alert.prompt(
                            "Son Onay",
                            `Lütfen devam etmek için aşağıdaki kutucuğa "${confirmationText}" yazın.`,
                            [
                                { text: "Vazgeç", style: "cancel" },
                                {
                                    text: "ONAYLIYORUM, SİL",
                                    style: "destructive",
                                    onPress: async (inputText) => {
                                        if (
                                            inputText?.toLowerCase() !==
                                                confirmationText
                                        ) {
                                            Alert.alert(
                                                "Hata",
                                                "Yazdığınız metin eşleşmedi. İşlem iptal edildi.",
                                            );
                                            return;
                                        }
                                        await executeDataReset();
                                    },
                                },
                            ],
                            "plain-text",
                        );
                    },
                },
            ],
        );
    };

    const executeDataReset = async () => {
        setIsResetting(true);
        try {
            const { error } = await supabase.functions.invoke(
                "reset-user-data",
            );
            if (error) throw error;

            Alert.alert(
                "İşlem Başlatıldı",
                "Hesabınız 7 gün içinde kalıcı olarak silinmek üzere sıraya alındı. Bu süre zarfında fikrinizi değiştirirseniz, tekrar giriş yaparak işlemi iptal edebilirsiniz.",
            );
            await signOut();
            router.replace("/login");
        } catch (err: unknown) {
            console.error("Veri sıfırlama işlemi sırasında hata:", err);
            let errorMessage =
                "Beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.";

            if (err instanceof Error) {
                if (err.message === "Failed to fetch") {
                    errorMessage =
                        "İnternet bağlantınız kontrol edin. Sunucuya ulaşılamadı.";
                } else if (
                    "details" in err &&
                    typeof (err as { details?: string }).details === "string"
                ) {
                    errorMessage = `Sunucu Hatası: ${
                        (err as { details: string }).details
                    }`;
                }
            }

            Alert.alert("Başarısız Oldu", errorMessage);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <LinearGradient
            colors={["#FDFEFF", "#F4F6FF"]}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="close" size={28} color="#1E293B" />
                </Pressable>

                <View style={styles.pageHeader}>
                    {user?.email && (
                        <Text style={styles.emailText}>{user.email}</Text>
                    )}
                    <Text style={styles.pageTitle}>Hesap Kontrol Merkezi</Text>
                </View>

                {/* Izgara Düzeninde Hesap Yönetimi */}
                <View style={styles.gridContainer}>
                    <SettingsCard
                        icon="person-circle-outline"
                        label="Profili Düzenle"
                        onPress={() => router.push("/(settings)/profile")}
                    />
                    <SettingsCard
                        icon="shield-half-outline"
                        label="Güvenlik"
                        onPress={() => router.push("/(settings)/security")}
                    />
                </View>

                {/* Öne Çıkan Abonelik Kartı */}
                <FeaturedCard
                    icon="diamond"
                    label="Abonelik ve Ayrıcalıklar"
                    subtitle="Premium özelliklere yükseltin"
                    onPress={() => router.push("/(settings)/subscription")}
                />

                {/* Tehlikeli Bölge */}
                <View style={styles.destructiveZone}>
                    <View style={styles.destructiveHeader}>
                        <Ionicons
                            name="warning-outline"
                            size={22}
                            color="#BE123C"
                        />
                        <Text style={styles.destructiveTitle}>
                            Tehlikeli Bölge
                        </Text>
                    </View>
                    {isResetting
                        ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator color="#475569" />
                            </View>
                        )
                        : (
                            <Pressable
                                onPress={handleResetData}
                                style={(
                                    { pressed },
                                ) => [
                                    styles.destructiveButton,
                                    pressed && styles.cardPressed,
                                ]}
                            >
                                <Text style={styles.destructiveButtonText}>
                                    Tüm Verileri Sıfırla
                                </Text>
                                <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color="#BE123C"
                                />
                            </Pressable>
                        )}
                    <Pressable
                        onPress={handleSignOut}
                        style={(
                            { pressed },
                        ) => [
                            styles.destructiveButton,
                            pressed && styles.cardPressed,
                        ]}
                    >
                        <Text style={styles.destructiveButtonText}>
                            Güvenli Çıkış
                        </Text>
                        <Ionicons
                            name="log-out-outline"
                            size={20}
                            color="#BE123C"
                        />
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Therapy. v1.0.0</Text>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

// --- BÖLÜM 3: EN ÜST SEVİYE STİLLER ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    backButton: {
        position: "absolute",
        top: 60,
        right: 20,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.5)",
        borderRadius: 30,
        padding: 8,
    },
    pageHeader: { alignItems: "center", marginVertical: 40 },
    emailText: {
        fontSize: 16,
        color: "#64748B",
        marginBottom: 8,
        fontWeight: "500",
    },
    pageTitle: { fontSize: 32, fontWeight: "bold", color: "#1E293B" },

    gridContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 16,
    },
    card: {
        width: "48%", // Izgarada iki sütun oluşturur
        aspectRatio: 1, // Kare olmasını sağlar
        backgroundColor: "#FFFFFF",
        borderRadius: 28,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#C0C8D6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardPressed: { transform: [{ scale: 0.97 }], shadowOpacity: 0.1 },
    cardIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        textAlign: "center",
    },

    featuredCard: {
        width: "100%",
        backgroundColor: "#F3F4FF",
        borderRadius: 28,
        padding: 24,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden", // LinearGradient'in taşmasını engeller
        marginBottom: 32,
        shadowColor: "#A0AEC0",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    featuredIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.8)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    featuredTextContainer: { flex: 1 },
    featuredLabel: { fontSize: 18, fontWeight: "bold", color: "#4C1D95" },
    featuredSubtitle: {
        fontSize: 14,
        color: "#6D28D9",
        marginTop: 4,
        opacity: 0.8,
    },

    destructiveZone: {
        backgroundColor: "#FFF1F2",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#FECDD3",
        padding: 20,
        marginTop: 16,
    },
    destructiveHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
    },
    destructiveTitle: { fontSize: 18, fontWeight: "bold", color: "#9F1239" },
    destructiveButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#FEE2E2",
    },
    destructiveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#BE123C",
    },

    footer: {
        alignItems: "center",
        paddingTop: 40,
        borderTopWidth: 1,
        borderTopColor: "rgba(226, 232, 240, 0.5)",
        marginTop: 40,
    },
    footerText: { fontSize: 14, color: "#94A3B8" },
    loadingWrapper: { alignItems: "center", padding: 16 },
});
