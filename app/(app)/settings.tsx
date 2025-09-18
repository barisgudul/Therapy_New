// app/settings.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router/";
import React from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/Auth.tsx";
import { FeaturedCard } from "../../components/settings/FeaturedCard";
import { SettingsCard } from "../../components/settings/SettingsCard";
import { useSettings } from "../../hooks/useSettings";

// --- BÖLÜM 2: ANA AYARLAR EKRANI ---

export default function SettingsScreen() {
    const router = useRouter();

    // ARTIK GÜVENLİ: AuthProvider hazır olmadan bu kod zaten çalışmayacak.
    const { user } = useAuth();
    const { isResetting, handleSignOut, handleResetData } = useSettings();

    return (
        <LinearGradient
            colors={["#FDFEFF", "#F4F6FF"]}
            style={styles.container}
        >
            <SafeAreaView style={styles.flex}>
                <View style={styles.header}>
                    <View style={{ width: 44 }} />
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Hesap Kontrol Merkezi</Text>
                    </View>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="close" size={28} color="#1E293B" />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.contentContainer}>
                    {user?.email && (
                        <Text style={styles.emailText}>{user.email}</Text>
                    )}

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

                    <FeaturedCard />

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
                        <Text style={styles.footerText}>Gisbel. v1.0.0</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

// STİLLER ARTIK SADECE BU SAYFANIN LAYOUT'UNA AİT
const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    contentContainer: {
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    backButton: {
        backgroundColor: "rgba(255,255,255,0.5)",
        borderRadius: 30,
        padding: 8,
    },
    pageHeader: {
        alignItems: "center",
        flex: 1,
    },
    emailText: {
        fontSize: 16,
        color: "#64748B",
        fontWeight: "500",
        textAlign: 'center',
        marginBottom: 20,
    },
    pageTitle: { fontSize: 24, fontWeight: "bold", color: "#1E293B" },

    gridContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 16,
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
    cardPressed: { transform: [{ scale: 0.97 }], shadowOpacity: 0.1 },
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
