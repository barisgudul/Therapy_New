// app/(settings)/security.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useEffect, useState } from "react";

import { UserIdentity } from "@supabase/supabase-js";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { supabase } from "../../utils/supabase";

// --- BÖLÜM 1: KOMPONENTLER (GÜNCELLENDİ) ---

// ... InfoRow aynı, dokunma ...
const InfoRow = (
    { icon, label, value }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value: string;
    },
) => (
    <View style={styles.infoRow}>
        <Ionicons
            name={icon}
            size={22}
            color="#475569"
            style={styles.rowIcon}
        />
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

// ... ActionRow aynı, dokunma ...
const ActionRow = ({
    icon,
    label,
    onPress,
    hasSwitch,
    switchValue,
    onSwitchChange,
    disabled,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    disabled?: boolean;
}) => (
    <Pressable
        onPress={onPress}
        style={(
            { pressed },
        ) => [styles.actionRow, (pressed || disabled) && styles.rowPressed]}
        disabled={!onPress && !hasSwitch || disabled}
    >
        <Ionicons
            name={icon}
            size={22}
            color={disabled ? "#94A3B8" : "#1E293B"}
            style={styles.rowIcon}
        />
        <Text style={[styles.actionLabel, disabled && { color: "#94A3B8" }]}>
            {label}
        </Text>
        {hasSwitch
            ? (
                <Switch
                    trackColor={{ false: "#E2E8F0", true: "#818CF8" }}
                    thumbColor={switchValue ? "#4338CA" : "#F8FAFC"}
                    onValueChange={onSwitchChange}
                    value={switchValue}
                    disabled={disabled}
                />
            )
            : (
                <Ionicons
                    name="chevron-forward-outline"
                    size={22}
                    color={disabled ? "#94A3B8" : "#94A3B8"}
                />
            )}
    </Pressable>
);

// ADIM #2 GÜNCELLEMESİ: "Çıkış Yap" artık bir fonksiyon alıyor.
const SessionCard = (
    { device, location, lastSeen, isActive, onSignOut }: {
        device: string;
        location: string;
        lastSeen: string;
        isActive?: boolean;
        onSignOut?: () => void;
    },
) => (
    <View style={styles.sessionCard}>
        <Ionicons
            name={isActive ? "laptop-outline" : "phone-portrait-outline"}
            size={28}
            color={isActive ? "#4338CA" : "#475569"}
        />
        <View style={styles.sessionDetails}>
            <Text style={styles.sessionDevice}>
                {device}{" "}
                {isActive && (
                    <Text style={styles.activeText}>(Aktif Oturum)</Text>
                )}
            </Text>
            <Text style={styles.sessionLocation}>{location} · {lastSeen}</Text>
        </View>
        {/* BU BUTON ARTIK İŞE YARIYOR (Sadece aktif oturum için) */}
        {isActive && (
            <Pressable onPress={onSignOut}>
                <Text style={styles.signOutText}>Çıkış Yap</Text>
            </Pressable>
        )}
    </View>
);

// --- BÖLÜM 2: GÜVENLİK KONTROL PANELİ (TAM TEÇHİZATLI HALİ) ---

export default function SecurityDashboardScreen() {
    const router = useRouter();
    const [identities, setIdentities] = useState<UserIdentity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserSecurityInfo = async () => {
            setLoading(true); // Yüklemeyi başlat
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setIdentities(user.identities || []);
                }
            } catch (error) {
                console.error("Güvenlik bilgisi alınamadı:", error);
                // Burada kullanıcıya bir hata mesajı gösterebilirsin.
            } finally {
                setLoading(false); // Her durumda yüklemeyi bitir
            }
        };

        fetchUserSecurityInfo();
    }, []); // BU SEFERLİK BOŞ KALMASI KABUL EDİLEBİLİR.

    // ADIM #2: Basit bir "bu cihazdan çıkış yap" fonksiyonu.
    const handleSignOutFromThisDevice = () => {
        Alert.alert(
            "Çıkış Yap",
            "Bu cihazdaki oturumunuzu sonlandırmak istediğinizden emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Çıkış Yap",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (!error) {
                            router.replace("/(welcome)"); // veya login sayfan neyse
                        } else {
                            Alert.alert("Hata", error.message);
                        }
                    },
                },
            ],
        );
    };

    const hasEmailProvider = identities.some((id) => id.provider === "email");
    const providerNames = identities.map(
        (id) => (id.provider === "email" ? "Email" : id.provider)
    ).join(", ");

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4338CA" />
            </View>
        );
    }

    return (
        // DOKUNUŞ #6: SafeAreaView, her şeyi çentik ve alt bardan korur.
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8FF" }}>
            <LinearGradient
                colors={["#F7F8FF", "#FFFFFF"]}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    {/* ... Header ve diğer kısımlar aynı... */}
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="close" size={28} color="#1E293B" />
                    </Pressable>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>
                            Güvenlik Kontrol Paneli
                        </Text>
                        <Text style={styles.pageSubtitle}>
                            Hesap güvenliğinizi buradan yönetin ve izleyin.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Genel Bakış</Text>
                        <View style={styles.card}>
                            <InfoRow
                                icon="log-in-outline"
                                label="Giriş Yöntemleri"
                                value={providerNames}
                            />
                            {/* İKİ FAKTÖRLÜ DOĞRULAMA SATIRI ARTIK YOK */}
                        </View>
                    </View>

                    {
                        /* ADIM #1: Şifre değiştirme butonu artık olmayan bir sayfaya değil,
                        OLUŞTURULACAK OLAN '/(settings)/change-password' sayfasına gidiyor. */
                    }
                    {hasEmailProvider && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Şifre Yönetimi
                            </Text>
                            <View style={styles.card}>
                                <ActionRow
                                    icon="key-outline"
                                    label="Şifreyi Değiştir"
                                    onPress={() =>
                                        router.push(
                                            "/(settings)/change-password",
                                        )}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Aktif Oturumlar</Text>
                        <View style={styles.card}>
                            <SessionCard
                                device={"Bu Cihaz"} // Cihaz modelini dinamik olarak al, alamazsa "Bu Cihaz" yaz.
                                location="Mevcut Konum" // Konum bilgisi hassas ve karmaşık olduğu için genel bir ifade kullanıyoruz.
                                lastSeen="Şimdi"
                                isActive
                                onSignOut={handleSignOutFromThisDevice}
                            />
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

// --- BÖLÜM 3: STİLLER (DEĞİŞİKLİK YOK) ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F7F8FF",
    },
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
    pageTitle: { fontSize: 32, fontWeight: "bold", color: "#1E293B" },
    pageSubtitle: {
        fontSize: 16,
        color: "#64748B",
        marginTop: 8,
        textAlign: "center",
    },
    section: { marginBottom: 32 },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 4,
        shadowColor: "#C0C8D6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    rowPressed: { backgroundColor: "#F8FAFC" },
    rowIcon: { marginRight: 16 },
    infoLabel: { fontSize: 16, color: "#475569", flex: 1 },
    infoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        textTransform: "capitalize",
    },
    actionLabel: { fontSize: 16, fontWeight: "500", color: "#1E293B", flex: 1 },
    sessionCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    sessionDetails: { flex: 1, marginLeft: 16 },
    sessionDevice: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
    activeText: { color: "#4338CA", fontWeight: "bold" },
    sessionLocation: { fontSize: 14, color: "#64748B", marginTop: 2 },
    signOutText: { color: "#EF4444", fontWeight: "600" },
});
