// app/index.tsx (Gelişmiş Oturum Yönetimi)
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router/";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PendingDeletionScreen from "../components/PendingDeletionScreen.tsx";
import ReportModal from "../components/ReportModal.tsx";
import { Colors } from "../constants/Colors.ts";
import { useAuth } from "../context/Auth.tsx";
import { useVault } from "../hooks/useVault.ts";
import { getLatestUserReport, UserReport } from "../services/report.service.ts";
import { VaultData } from "../services/vault.service.ts";

const todayISO = () => new Date().toISOString().split("T")[0];
const { width } = Dimensions.get("window");

// Markdown render fonksiyonu (daily_write.tsx'ten alındı)
const renderMarkdownText = (text: string, accentColor: string) => {
  if (!text) return null;

  // Paragrafları ayır
  const paragraphs = text.trim().split(/\n\s*\n/);

  return (
    <View>
      {paragraphs.map((paragraph, paragraphIndex) => {
        if (!paragraph.trim()) return null;

        // Özel formatları kontrol et
        if (paragraph.includes("💭")) {
          // Özel kutu içindeki text'i de markdown ile işle
          const renderSpecialText = (text: string) => {
            const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);

            return (
              <Text
                style={{
                  fontSize: 14,
                  color: "#4A5568",
                  lineHeight: 22,
                  fontStyle: "italic",
                }}
              >
                {parts.map((part, index) => {
                  // Bold format **text**
                  if (
                    part.startsWith("**") && part.endsWith("**") &&
                    part.length > 4
                  ) {
                    return (
                      <Text
                        key={index}
                        style={{
                          fontWeight: "700",
                          color: "#2D3748",
                          fontStyle: "normal",
                        }}
                      >
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }

                  // Italic format *text*
                  if (
                    part.startsWith("*") && part.endsWith("*") &&
                    part.length > 2 && !part.startsWith("**")
                  ) {
                    return (
                      <Text
                        key={index}
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

          return (
            <View
              key={paragraphIndex}
              style={{
                backgroundColor: "#F7FAFC",
                borderRadius: 12,
                padding: 15,
                marginVertical: 8,
                borderLeftWidth: 4,
                borderLeftColor: accentColor,
              }}
            >
              {renderSpecialText(paragraph)}
            </View>
          );
        }

        // Header kontrolü
        if (paragraph.startsWith("###")) {
          return (
            <Text
              key={paragraphIndex}
              style={{
                fontSize: 18,
                color: "#1A202C",
                lineHeight: 28,
                fontWeight: "700",
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              {paragraph.slice(4)}
            </Text>
          );
        }

        if (paragraph.startsWith("##")) {
          return (
            <Text
              key={paragraphIndex}
              style={{
                fontSize: 20,
                color: "#1A202C",
                lineHeight: 30,
                fontWeight: "700",
                marginTop: 15,
                marginBottom: 8,
              }}
            >
              {paragraph.slice(3)}
            </Text>
          );
        }

        // Bullet point kontrolü
        if (paragraph.startsWith("- ")) {
          return (
            <View
              key={paragraphIndex}
              style={{
                flexDirection: "row",
                marginVertical: 4,
                paddingLeft: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: accentColor,
                  marginRight: 8,
                  marginTop: 2,
                }}
              >
                •
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#2D3748",
                  lineHeight: 26,
                  flex: 1,
                }}
              >
                {paragraph.slice(2)}
              </Text>
            </View>
          );
        }

        // Normal paragraf - inline formatları işle
        const renderInlineFormats = (text: string) => {
          // Daha güçlü regex - ** formatını önce yakala
          const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);

          return (
            <Text
              key={paragraphIndex}
              style={{
                fontSize: 16,
                color: "#2D3748",
                lineHeight: 26,
                letterSpacing: -0.3,
                marginVertical: 4,
              }}
            >
              {parts.map((part, index) => {
                // Bold format **text**
                if (
                  part.startsWith("**") && part.endsWith("**") &&
                  part.length > 4
                ) {
                  return (
                    <Text
                      key={index}
                      style={{
                        fontWeight: "700",
                        color: "#1A202C",
                      }}
                    >
                      {part.slice(2, -2)}
                    </Text>
                  );
                }

                // Italic format *text*
                if (
                  part.startsWith("*") &&
                  part.endsWith("*") &&
                  part.length > 2 &&
                  !part.startsWith("**")
                ) {
                  return (
                    <Text
                      key={index}
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

        return renderInlineFormats(paragraph);
      })}
    </View>
  );
};

export default function HomeScreen() {
  // === HOOKS & AUTH STATE (Mevcut Kısım) ===
  const router = useRouter();
  const { isPendingDeletion, isLoading: isAuthLoading } = useAuth();
  const { data: vault, isLoading: isVaultLoading } = useVault() as {
    data: VaultData | null;
    isLoading: boolean;
  };

  // === YENİ KONTROL PANELİ ===
  const [modalVisible, setModalVisible] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const queryClient = useQueryClient();

  // En son raporu çek. 'enabled' seçeneği, vault yüklendikten sonra çalışmasını sağlar.
  const { data: latestReport, isLoading: isReportLoading } = useQuery<
    UserReport | null
  >({
    queryKey: ["latestReport"],
    queryFn: getLatestUserReport,
    enabled: !isVaultLoading, // Sadece vault yüklendikten sonra rapor sorgusu yap.
  });

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // === BİLDİRİM YÖNETİMİ (Vault kontrolü ile) ===
  useEffect(() => {
    if (!isVaultLoading && vault) {
      (async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Günaydın!",
            body: "Bugün kendine iyi bakmayı unutma.",
            data: { route: "/daily_write" },
          },
          trigger: {
            hour: 8,
            minute: 0,
            repeats: true,
          } as Notifications.NotificationTriggerInput,
        });
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Bugün nasılsın?",
            body: "1 cümleyle kendini ifade etmek ister misin?",
            data: { route: "/daily_write" },
          },
          trigger: {
            hour: 20,
            minute: 0,
            repeats: true,
          } as Notifications.NotificationTriggerInput,
        });
      })();
    }
  }, [isVaultLoading, vault]);

  // Ana içeriği göstermeden önce kritik durumları kontrol et
  if (isAuthLoading || isVaultLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // Kullanıcı silinme sürecindeyse, özel ekranı göster
  if (isPendingDeletion) {
    return <PendingDeletionScreen />;
  }

  const animateBg = (open: boolean) =>
    Animated.timing(scaleAnim, {
      toValue: open ? 0.9 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

  // === GÜNLÜK KARTI: ARTIK VAULT'TAN OKUYOR ===
  const handleCardPress = () => {
    if (vault?.metadata?.lastDailyReflectionDate === todayISO()) {
      setModalVisible(true);
      animateBg(true);
    } else {
      router.push("/daily_write" as const);
    }
  };

  // === TERAPİSTİNİ SEÇ: ARTIK VAULT'TAN OKUYOR ===
  const handleStart = () => {
    if (vault?.profile?.nickname) {
      router.push("/therapy/avatar" as const);
    } else {
      router.push("/profile" as const);
    }
  };

  // === GEÇMİŞ SEANSLARIM: DİREKT YÖNLENDİRME ===
  const handleGoToAllTranscripts = () => {
    router.push("/transcripts");
  };

  // Not: Görünen mesaj, AI'dan gelen ve Vault'a kaydedilen bir mesaj olmalı.
  const dailyMessage = (!isVaultLoading && vault?.metadata?.dailyMessageContent)
    ? String(vault.metadata.dailyMessageContent)
    : "Bugün için mesajın burada görünecek.";

  // ------------- UI KISMI (DEĞİŞİKLİK AZ) -------------
  return (
    <LinearGradient colors={["#F8F9FC", "#FFFFFF"]} style={styles.flex}>
      <Animated.View
        style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Üst Bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            therapy<Text style={styles.dot}>.</Text>
          </Text>
          <View style={styles.topButtons}>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={styles.settingButton}
            >
              <Ionicons
                name="settings-sharp"
                size={28}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ana İçerik */}
        <View style={styles.mainContent}>
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../assets/therapy-illustration.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
          <View
            style={[styles.textContainer, { marginTop: -60, marginBottom: 10 }]}
          >
            <Text style={styles.title}>Zihnine İyi Bak</Text>
            <Text style={styles.subtitle}>
              Yapay zekâ destekli terapiyi deneyimle
            </Text>
          </View>
          <View style={[styles.buttonContainer, { marginTop: 0 }]}>
            {/* === YENİ VE AKILLI RAPOR KARTI / BUTONU === */}
            {isReportLoading && (
              <ActivityIndicator style={{ marginBottom: 12 }} />
            )}

            {latestReport && !latestReport.read_at && (
              <Pressable
                onPress={() => setReportModalVisible(true)}
                style={({ pressed }) => [
                  styles.button,
                  styles.specialButton, // Vurgulamak için özel bir stil
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <LinearGradient
                  colors={["#4F46E5", "#6D28D9"]} // Farklı, dikkat çekici bir renk
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="sparkles-sharp" size={20} color="#FFFFFF" />
                    <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                      Haftalık İçgörü Keşfin Hazır!
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}

            {/* --- Mevcut Butonlar Buradan Devam Eder --- */}
            <Pressable
              onPress={handleCardPress}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="sparkles-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>
                    Bugün Nasıl Hissediyorsun?
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push("/diary" as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>
                    Yapay Zeka Destekli Günlük
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => router.push("/dream" as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="cloudy-night-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>
                    Yapay Zeka Destekli Rüya Analizi
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push("/ai_summary" as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="analytics-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>
                    Yapay Zeka Destekli Ruh Hâli Analizi
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="heart-circle-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>Terapistini Seç</Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={handleGoToAllTranscripts}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.buttonText}>Geçmiş Seanslarım</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/how_it_works" as const)}
            >
              <Text style={styles.linkText}>Terapiler nasıl işler?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      {modalVisible && (
        <BlurView
          intensity={60}
          tint="default"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Günlük Mesaj Modalı */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  animateBg(false);
                }}
                style={styles.modalBackButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
              <View style={styles.modalIcon}>
                <LinearGradient
                  colors={[Colors.light.tint, "#8B5CF6"]}
                  style={styles.modalIconGradient}
                >
                  <Ionicons
                    name="sparkles"
                    size={24}
                    color="white"
                  />
                </LinearGradient>
              </View>
              <View style={{ width: 40, height: 40 }} />
            </View>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Günlük Yansıman</Text>
              <Text style={styles.modalSubtitle}>
                Bugünkü duygularına dair düşüncelerim
              </Text>
            </View>
            <View style={styles.modalDivider} />
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {renderMarkdownText(dailyMessage, Colors.light.tint)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Raporu Gösterecek Olan Modal component'i */}
      {latestReport && (
        <ReportModal
          isVisible={isReportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            // Rapor okundu, listeyi yenile ki buton kaybolsun.
            queryClient.invalidateQueries({ queryKey: ["latestReport"] });
          }}
          report={latestReport}
        />
      )}
    </LinearGradient>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 1.5,
    opacity: 0.95,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 32,
    fontWeight: "900",
  },
  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  devButton: {
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(227,232,240,0.4)",
  },
  devButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    height: "100%",
  },
  devButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  settingButton: {
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
  button: {
    width: "100%",
    height: 52,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
  },
  specialButton: {
    borderColor: "rgba(129, 140, 248, 0.5)", // Özel border rengi
    shadowColor: "#6D28D9", // Özel gölge rengi
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
  },
  illustrationContainer: {
    width: width * 0.85,
    height: width * 0.6,
    marginBottom: 32,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  linkButton: {
    alignItems: "center",
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: Colors.light.tint,
    textDecorationLine: "underline",
    letterSpacing: -0.2,
  },
  debugContainer: {
    position: "absolute",
    bottom: 40,
    right: 24,
    flexDirection: "row",
    gap: 12,
  },
  resetBtn: {
    backgroundColor: "#e11d48",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      }
      : { elevation: 2 }),
  },
  resetTxt: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 450,
    maxHeight: "85%",
    minHeight: "60%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 0,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A202C",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 5,
    letterSpacing: -0.2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 20,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  modalText: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: "center",
  },
});
