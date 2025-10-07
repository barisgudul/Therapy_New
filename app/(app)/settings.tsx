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
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/Auth.tsx";
import { FeaturedCard } from "../../components/settings/FeaturedCard";
import { SettingsCard } from "../../components/settings/SettingsCard";
import { useSettings } from "../../hooks/useSettings";

// === YENİ COMPONENT: DİL SEÇİCİ ===
const LanguageSelector = () => {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language;

    const languages = [
        { code: 'tr', name: t('settings.language.turkish') },
        { code: 'en', name: t('settings.language.english') },
        { code: 'de', name: t('settings.language.german') },
    ];

    return (
        <View style={styles.languageContainer}>
            <Text style={styles.sectionTitle}>{t('settings.language.title')}</Text>
            <View style={styles.languageButtons}>
                {languages.map((lang) => (
                    <Pressable
                        key={lang.code}
                        style={[
                            styles.langButton,
                            currentLanguage === lang.code && styles.langButtonActive
                        ]}
                        onPress={() => i18n.changeLanguage(lang.code)}
                    >
                        <Text style={[
                            styles.langButtonText,
                            currentLanguage === lang.code && styles.langButtonTextActive
                        ]}>
                            {lang.name}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

// --- BÖLÜM 2: ANA AYARLAR EKRANI ---

export default function SettingsScreen() {
    const router = useRouter();
    const { t } = useTranslation();

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
                        <Text style={styles.pageTitle}>{t('settings.main.title')}</Text>
                    </View>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        testID="back-button"
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
                            label={t('settings.main.editProfile')}
                            onPress={() => router.push("/(settings)/profile")}
                        />
                        <SettingsCard
                            icon="shield-half-outline"
                            label={t('settings.main.security')}
                            onPress={() => router.push("/(settings)/security")}
                        />
                    </View>

                    <LanguageSelector />

                    <FeaturedCard />

                    <View style={styles.destructiveZone}>
                        <View style={styles.destructiveHeader}>
                            <Ionicons
                                name="warning-outline"
                                size={22}
                                color="#BE123C"
                            />
                            <Text style={styles.destructiveTitle}>
                                {t('settings.main.dangerZone_title')}
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
                                        {t('settings.main.dangerZone_resetData')}
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
                                {t('settings.main.dangerZone_signOut')}
                            </Text>
                            <Ionicons
                                name="log-out-outline"
                                size={20}
                                color="#BE123C"
                            />
                        </Pressable>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t('settings.main.footer_version')}</Text>
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },
    languageContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    languageButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 10,
    },
    langButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
    },
    langButtonActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4338CA',
    },
    langButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
    },
    langButtonTextActive: {
        color: '#4338CA',
    },
});
