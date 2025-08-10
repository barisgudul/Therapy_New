// app/diary.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import { Colors } from "../constants/Colors.ts";
import { useAuth } from "../context/Auth.tsx";
import { useFeatureAccess } from "../hooks/useSubscription.ts";
import { useUpdateVault, useVault } from "../hooks/useVault.ts";
import {
  analyzeSessionForMemory,
  generateDiaryNextQuestions,
  generateDiaryStart,
  mergeVaultData,
} from "../services/ai.service.ts";
import { incrementFeatureUsage } from "../services/api.service.ts";
import {
  AppEvent,
  deleteEventById,
  getSessionEventsForUser,
  logEvent,
} from "../services/event.service.ts";
import { addJourneyLogEntry } from "../services/journey.service.ts";
import { VaultData } from "../services/vault.service.ts";
import { InteractionContext } from "../types/context.ts";
import { getErrorMessage } from "../utils/errors.ts";

// Markdown render fonksiyonu (daily_write.tsx'ten alındı)
const _renderMarkdownText = (text: string, accentColor: string) => {
  if (!text) return null;

  const parts = text.split(
    /(\*\*.*?\*\*|\*.*?\*|💭.*?$|^###.*?$|^##.*?$|^#.*?$|^\*\*\d+\..*?\*\*|^- .*?$)/gm,
  );

  return (
    <View>
      {parts.map((part, index) => {
        if (!part.trim()) return null;

        // Bold text **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 16,
                color: "#1A202C",
                lineHeight: 22,
                fontWeight: "700",
                marginVertical: 1,
              }}
            >
              {part.slice(2, -2)}
            </Text>
          );
        }

        // Italic text *text*
        if (
          part.startsWith("*") && part.endsWith("*") &&
          !part.startsWith("**")
        ) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 16,
                color: "#2D3748",
                lineHeight: 22,
                fontStyle: "italic",
              }}
            >
              {part.slice(1, -1)}
            </Text>
          );
        }

        // Headers
        if (part.startsWith("###")) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 18,
                color: "#1A202C",
                lineHeight: 24,
                fontWeight: "700",
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {part.slice(4)}
            </Text>
          );
        }

        if (part.startsWith("##")) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 20,
                color: "#1A202C",
                lineHeight: 26,
                fontWeight: "700",
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              {part.slice(3)}
            </Text>
          );
        }

        // Bullet points
        if (part.startsWith("- ")) {
          return (
            <View
              key={index}
              style={{
                flexDirection: "row",
                marginVertical: 1,
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
                {part.slice(2)}
              </Text>
            </View>
          );
        }

        // Special reminder text
        if (part.includes("💭")) {
          return (
            <View
              key={index}
              style={{
                backgroundColor: "#F7FAFC",
                borderRadius: 8,
                padding: 10,
                marginTop: 8,
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
                {part}
              </Text>
            </View>
          );
        }

        // Divider
        if (part.trim() === "---") {
          return (
            <View
              key={index}
              style={{
                height: 1,
                backgroundColor: "rgba(0,0,0,0.1)",
                marginVertical: 10,
              }}
            />
          );
        }

        // Regular text
        return (
          <Text
            key={index}
            style={{
              fontSize: 16,
              color: "#2D3748",
              lineHeight: 22,
              letterSpacing: -0.2,
              marginVertical: 1,
            }}
          >
            {part}
          </Text>
        );
      })}
    </View>
  );
};

interface Message {
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function DiaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: vault } = useVault();
  const updateVaultMutation = useUpdateVault();
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [isViewingDiary, setIsViewingDiary] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<AppEvent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [step, setStep] = useState(0); // 0: İlk yazı, 1: 1. soru seti, 2: 2. soru seti, 3: 3. soru seti, 4: Tamamlama
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Başlangıçta yükleniyor olarak ayarla
  const [diaryEvents, setDiaryEvents] = useState<AppEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const modalPosition = useRef(new Animated.Value(0)).current;

  // Feature Access Hook
  const { can_use, loading: accessLoading, refresh: refreshAccess } =
    useFeatureAccess("diary_write");

  const processDiaryInBackground = async (
    diaryMessages: Message[],
    currentVault: VaultData,
    currentUserId: string,
  ) => {
    try {
      console.log(
        "🔥 [BACKGROUND-PROCESS] Günlük analizi arka planda başlatılıyor...",
      );

      const fullTranscript = diaryMessages.map((m) =>
        `${m.isUser ? "Kullanıcı" : "AI"}: ${m.text}`
      ).join("\n");

      const memoryContext: InteractionContext = {
        transactionId: uuidv4(),
        userId: currentUserId,
        initialVault: currentVault,
        initialEvent: {
          id: uuidv4(),
          user_id: currentUserId,
          type: "diary_analysis_background",
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: { transcript: fullTranscript },
        },
        derivedData: {},
      };

      const memoryPieces = await analyzeSessionForMemory(memoryContext);

      if (memoryPieces) {
        await addJourneyLogEntry(memoryPieces.log);
        const newVault = mergeVaultData(currentVault, memoryPieces.vaultUpdate);
        updateVaultMutation.mutate(newVault);
        console.log(
          "✅ [BACKGROUND-PROCESS] Günlükten çıkarılan anlam Vault'a işlendi.",
        );
      }
    } catch (error) {
      console.error(
        "⛔️ [BACKGROUND-PROCESS] Günlük işlenirken arka planda hata oluştu:",
        getErrorMessage(error),
      );
    }
  };

  useEffect(() => {
    loadDiaryEvents();
  }, []);

  useEffect(() => {
    if (isSaving) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [isSaving, spinAnim]);

  const _spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const loadDiaryEvents = async () => {
    try {
      const allEvents = await getSessionEventsForUser();
      const diaryOnlyEvents = allEvents.filter((event) =>
        event.type === "diary_entry"
      );
      setDiaryEvents(diaryOnlyEvents);
    } catch (error) {
      console.error("Günlük olayları yüklenirken hata:", error);
      Alert.alert("Hata", "Günlük olayları yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false); // Her durumda yüklemeyi bitir
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      text,
      isUser,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Adım 1: Kullanıcı ilk metnini yazdığında.
  const handleInitialEntry = async () => {
    if (!currentInput.trim() || !vault) return;
    setIsLoading(true);
    addMessage(currentInput, true);

    try {
      const context: InteractionContext = {
        transactionId: uuidv4(),
        userId: user!.id,
        initialVault: vault as VaultData,
        initialEvent: {
          id: uuidv4(),
          user_id: user!.id,
          type: "diary_entry",
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: { initialEntry: currentInput.trim() },
        },
        derivedData: {},
      };

      const { mood: _mood, questions } = await generateDiaryStart(context);
      setCurrentQuestions(questions);
      setStep(1);
    } catch (error) {
      console.error("Günlük başlatma hatası:", getErrorMessage(error));
      addMessage(
        "Şu anda bir sorun oluştu, lütfen daha sonra tekrar deneyin.",
        false,
      );
    }

    setCurrentInput("");
    setIsLoading(false);
    handleModalClose();
  };

  // Adım 2: Kullanıcı bir AI sorusuna cevap verdiğinde.
  const handleQuestionResponse = async () => {
    if (!currentInput.trim() || !vault) return;
    setIsLoading(true);
    addMessage(selectedQuestion, false);
    addMessage(currentInput, true);

    try {
      const history = [...messages, {
        text: currentInput,
        isUser: true,
        timestamp: 0,
      }]
        .map((m) => `${m.isUser ? "User" : "AI"}: ${m.text}`)
        .join("\n");

      const context: InteractionContext = {
        transactionId: uuidv4(),
        userId: user!.id,
        initialVault: vault as VaultData,
        initialEvent: {
          id: uuidv4(),
          user_id: user!.id,
          type: "diary_entry",
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: { conversationHistory: history },
        },
        derivedData: {},
      };

      const nextQuestions = await generateDiaryNextQuestions(context);
      setCurrentQuestions(nextQuestions);
      setStep((prev) => prev + 1);

      if (step >= 3) {
        setCurrentQuestions([]);
        setStep(4);
        addMessage(
          "Bu derinlemesine keşif için teşekkürler. Dilersen bu anlamlı sohbeti günlüğüne kaydedebilirsin.",
          false,
        );
      }
    } catch (error) {
      console.error("Sonraki soruları üretme hatası:", getErrorMessage(error));
      addMessage(
        "Cevabını işlerken bir sorun oluştu. Lütfen kaydetmeyi dene veya baştan başla.",
        false,
      );
    }

    setCurrentInput("");
    setSelectedQuestion("");
    setIsLoading(false);
    handleModalClose();
  };

  // Adım 3: Günlüğü kalıcı hafızaya işleme.
  const saveDiary = async () => {
    if (messages.length === 0 || isSaving || !vault) return;
    setIsSaving(true);

    try {
      // 1. ÖNCE KULLANICININ VERİSİNİ ANINDA KAYDET. BU EN ÖNEMLİ ADIM.
      await logEvent({
        type: "diary_entry",
        mood: "mixed",
        data: { messages: messages as unknown as Record<string, unknown> },
      });
      console.log("✅ Günlük diyaloğu ham olarak kaydedildi.");

      // 2. ARAYÜZÜ HEMEN SERBEST BIRAK. KULLANICIYI BEKLETME.
      await loadDiaryEvents();
      setIsSaving(false);
      setIsWritingMode(false);

      // Kullanım sayısını artır
      await incrementFeatureUsage("diary_write");
      console.log("✅ [USAGE] diary_write kullanımı başarıyla artırıldı.");

      // 3. AĞIR İŞİ (YAPAY ZEKA ANALİZİ) ARKA PLANDA BAŞLAT.
      // 'await' kullanmıyoruz, böylece fonksiyonun bitmesini beklemiyoruz.
      processDiaryInBackground(messages, vault as VaultData, user!.id);

      // 4. State'i temizle
      setMessages([]);
      setStep(0);
    } catch (error) {
      console.error(
        "Günlüğü kaydederken kritik hata (ilk kayıt):",
        getErrorMessage(error),
      );
      Alert.alert("Kayıt Hatası", "Günlüğün kaydedilirken bir sorun oluştu.");
      // Hata durumunda UI'ı serbest bırak.
      setIsSaving(false);
    }
  };

  // Soru seçildiğinde
  const handleQuestionSelect = (question: string) => {
    setSelectedQuestion(question);
    setIsModalVisible(true);
    // Modal'ı yukarı konumlandır
    Animated.timing(modalPosition, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleModalClose = () => {
    // Modal'ı ortala
    Animated.timing(modalPosition, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  const startNewDiary = async () => {
    // Önce erişim hakkını yenileyip kontrol et
    await refreshAccess();

    if (accessLoading) {
      // Eğer hala yükleniyorsa kısa bir bekleme göster
      Alert.alert(
        "Kontrol ediliyor...",
        "Günlük yazma hakkınız kontrol ediliyor.",
      );
      return;
    }

    if (!can_use) {
      Alert.alert(
        "Günlük Limiti Doldu",
        "Bu özellik için günlük kullanım limitinize ulaştınız. Sınırsız günlük yazmak için Premium'a geçebilirsiniz.",
        [
          { text: "Kapat", style: "cancel" },
          {
            text: "Premium'a Geç",
            onPress: () => router.push("/subscription"),
          },
        ],
      );
      return;
    }

    // Kullanıcının hakkı varsa devam et
    setIsWritingMode(true);
    setMessages([]);
    setCurrentInput("");
    setCurrentQuestions([]);
    setStep(0);
  };

  const viewDiary = (event: AppEvent) => {
    setSelectedDiary(event);
    setIsViewingDiary(true);
    setIsWritingMode(false);
  };

  const handleDeleteDiary = (timestamp: number | undefined) => {
    if (!timestamp) return;

    Alert.alert(
      "Günlüğü Sil",
      "Bu günlük kaydını silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => deleteEventById(timestamp.toString()),
        },
      ],
    );
  };

  const renderDiaryList = () => (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>
          therapy<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.title}>Günlüklerim</Text>
        <Text style={styles.subtitle}>
          Duygularını ve düşüncelerini kaydet.
        </Text>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.diaryContainer}>
            {isLoading
              ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    height: 300,
                  }}
                >
                  <ActivityIndicator size="large" color={Colors.light.tint} />
                  <Text
                    style={{
                      marginTop: 15,
                      color: Colors.light.tint,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    Günlüklerin Yükleniyor...
                  </Text>
                </View>
              )
              : diaryEvents.length === 0
              ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconContainer}>
                    <LinearGradient
                      colors={[Colors.light.tint, "rgba(255,255,255,0.9)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.emptyStateIconGradient}
                    >
                      <Ionicons
                        name="journal-outline"
                        size={48}
                        color={Colors.light.tint}
                      />
                    </LinearGradient>
                  </View>
                  <Text style={styles.emptyStateText}>
                    Henüz günlük yazmamışsın
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Yeni bir günlük yazarak başla
                  </Text>
                </View>
              )
              : (
                diaryEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.diaryCard}
                    onPress={() => viewDiary(event)}
                  >
                    <LinearGradient
                      colors={["#FFFFFF", "#F8FAFF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.diaryCardGradient}
                    >
                      <View style={styles.diaryCardHeader}>
                        <View style={styles.diaryCardDateContainer}>
                          <Ionicons
                            name="calendar"
                            size={20}
                            color={Colors.light.tint}
                          />
                          <Text style={styles.diaryDate}>
                            {new Date(event.timestamp).toLocaleDateString(
                              "tr-TR",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </Text>
                        </View>
                        <Text style={styles.diaryTime}>
                          {new Date(event.timestamp).toLocaleTimeString(
                            "tr-TR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </Text>
                      </View>
                      <View style={styles.diaryPreview}>
                        <Text style={styles.diaryPreviewText} numberOfLines={2}>
                          {event.data?.messages?.[0]?.text || "Boş günlük"}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              )}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.newDiaryButton}
        onPress={startNewDiary}
      >
        <LinearGradient
          colors={["#F8FAFF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.newDiaryButtonGradient}
        >
          <View style={styles.newDiaryButtonContent}>
            <View style={styles.newDiaryButtonIconCircle}>
              <Ionicons name="add" size={28} color={Colors.light.tint} />
            </View>
            <Text style={styles.newDiaryButtonText}>Yeni Günlük</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderDiaryView = () => (
    <View style={styles.diaryViewContainer}>
      <TouchableOpacity
        onPress={() => {
          setSelectedDiary(null);
          setIsViewingDiary(false);
        }}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDiary(selectedDiary?.timestamp)}
      >
        <Ionicons name="trash-outline" size={24} color="#E53E3E" />
      </TouchableOpacity>

      <Text style={styles.diaryViewTitle}>Günlük</Text>

      <ScrollView
        style={styles.diaryViewScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.diaryContainer}>
          <View style={styles.writingPageSection}>
            <View style={styles.writingPageHeader}>
              <View style={styles.writingPageInfo}>
                <Ionicons
                  name="document-text"
                  size={24}
                  color={Colors.light.tint}
                />
                <Text style={styles.writingPageTitle}>Günlük Sayfası</Text>
              </View>
              <Text style={styles.writingPageDate}>
                {selectedDiary
                  ? new Date(selectedDiary.timestamp).toLocaleDateString(
                    "tr-TR",
                  )
                  : ""}
              </Text>
            </View>
            <View style={styles.writingPageContent}>
              {selectedDiary?.data?.messages &&
                Array.isArray(selectedDiary.data.messages) &&
                (selectedDiary.data.messages as unknown as Message[]).map((
                  message: Message,
                  index: number,
                ) => (
                  <View key={index} style={styles.writingMessageBlock}>
                    <View style={styles.writingMessageHeader}>
                      <Ionicons
                        name={message.isUser ? "person-circle" : "sparkles"}
                        size={20}
                        color={Colors.light.tint}
                      />
                      <Text style={styles.writingMessageTitle}>
                        {message.isUser ? "Sen" : "AI Asistan"}
                      </Text>
                      <Text style={styles.writingMessageTime}>
                        {new Date(message.timestamp).toLocaleTimeString(
                          "tr-TR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.writingMessageText,
                        !message.isUser && styles.writingAiMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderWritingMode = () => (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topBar}></View>

      <Text style={styles.headerTitle}>Yeni Günlük</Text>

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.diaryContainer}>
            <View style={styles.writingPageSection}>
              <View style={styles.writingPageHeader}>
                <View style={styles.writingPageInfo}>
                  <Ionicons
                    name="document-text"
                    size={24}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.writingPageTitle}>Günlük Sayfası</Text>
                </View>
                <Text style={styles.writingPageDate}>
                  {new Date().toLocaleDateString("tr-TR")}
                </Text>
              </View>
              <View style={styles.writingPageContent}>
                {messages.map((message, index) => (
                  <View key={index} style={styles.writingMessageBlock}>
                    <View style={styles.writingMessageHeader}>
                      <Ionicons
                        name={message.isUser ? "person-circle" : "sparkles"}
                        size={20}
                        color={Colors.light.tint}
                      />
                      <Text style={styles.writingMessageTitle}>
                        {message.isUser ? "Sen" : "AI Asistan"}
                      </Text>
                      <Text style={styles.writingMessageTime}>
                        {new Date(message.timestamp).toLocaleTimeString(
                          "tr-TR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.writingMessageText,
                        !message.isUser && styles.writingAiMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}

                {isLoading && (
                  <View style={styles.writingAnalyzingContainer}>
                    <ActivityIndicator color={Colors.light.tint} />
                    <Text style={styles.writingAnalyzingText}>
                      Düşüncelerin analiz ediliyor...
                    </Text>
                  </View>
                )}

                {messages.length === 0 && (
                  <TouchableOpacity
                    style={styles.writingDiaryInputPlaceholder}
                    onPress={() => setIsModalVisible(true)}
                  >
                    <Text style={styles.writingDiaryInputPlaceholderText}>
                      Düşüncelerini yazmaya başla...
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {messages.length > 0 && step === 4 && (
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveDiary}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#F8FAFF", "#FFFFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <View style={styles.saveButtonContent}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={24}
                      color={Colors.light.tint}
                    />
                    <Text style={styles.saveButtonText}>
                      Günlüğü Tamamla ve Kaydet
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.diaryContainer}>
            {currentQuestions.length > 0 && step > 0 && step < 4 && (
              <View style={styles.writingQuestionsContainer}>
                <Text style={styles.writingQuestionsTitle}>
                  Şimdi bunlardan birini seçerek devam edelim...
                </Text>
                {currentQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.writingQuestionButton}
                    onPress={() => handleQuestionSelect(question)}
                  >
                    <Text style={styles.writingQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons
                    name="document-text"
                    size={24}
                    color={Colors.light.tint}
                  />
                  <Text style={styles.modalTitle}>Yeni Günlük</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleModalClose}
                >
                  <Ionicons name="close" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {selectedQuestion
                  ? (
                    <View style={styles.selectedQuestionContainer}>
                      <View style={styles.selectedQuestionHeader}>
                        <Ionicons
                          name="sparkles"
                          size={20}
                          color={Colors.light.tint}
                        />
                        <Text style={styles.selectedQuestionTitle}>
                          AI Asistan Sorusu
                        </Text>
                      </View>
                      <Text style={styles.selectedQuestionText}>
                        {selectedQuestion}
                      </Text>
                    </View>
                  )
                  : null}
                <TextInput
                  style={[
                    styles.modalInput,
                    selectedQuestion && styles.modalInputWithQuestion,
                  ]}
                  placeholder=""
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                  blurOnSubmit
                  onBlur={() => Keyboard.dismiss()}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    (!currentInput.trim() || step >= 4) &&
                    styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (step === 0) {
                      handleInitialEntry();
                    } else {
                      handleQuestionResponse();
                    }
                  }}
                  disabled={!currentInput.trim() || isLoading || step >= 4}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#FFFFFF", "#F8FAFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>
                      {step === 0 ? "Günlüğü Başlat" : "Cevabı Gönder"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );

  if (isViewingDiary) {
    return renderDiaryView();
  }
  return isWritingMode ? renderWritingMode() : renderDiaryList();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    paddingTop: 120,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  writingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 30,
  },
  writingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  back: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 30,
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
  writingBack: {
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
  logo: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.95,
    textAlign: "center",
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: "900",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  diaryContainer: {
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "transparent",
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  emptyStateIconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    padding: 2.5,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1F36",
    marginTop: 24,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#4A5568",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  diaryCard: {
    marginBottom: 20,
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
  diaryCardGradient: {
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  diaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  diaryCardDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  diaryDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  diaryTime: {
    fontSize: 15,
    color: "#4A5568",
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  diaryPreview: {
    backgroundColor: "rgba(248,250,255,0.9)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  diaryPreviewText: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  newDiaryButton: {
    position: "absolute",
    bottom: 80,
    right: 24,
    width: 180,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
    transform: [{ scale: 1.05 }],
  },
  newDiaryButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  newDiaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  newDiaryButtonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.4)",
  },
  newDiaryButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  diaryViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(249,250,251,0.95)",
  },
  deleteButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 30,
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
  saveButtonContainer: {
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  saveButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
  },
  saveButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  writingPageSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  writingPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.1)",
    paddingBottom: 20,
  },
  writingPageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  writingPageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingPageDate: {
    fontSize: 14,
    color: "#5D6D7E",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  writingPageContent: {
    backgroundColor: "rgba(248,250,255,0.8)",
    borderRadius: 20,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  writingInput: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2C3E50",
    letterSpacing: -0.2,
    textAlignVertical: "top",
    minHeight: 200,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  writingSendButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: Colors.light.tint,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  writingQuestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
    marginTop: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  writingQuestionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.tint,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  writingQuestionButton: {
    backgroundColor: "rgba(248,250,255,0.8)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  writingQuestionText: {
    fontSize: 15,
    color: "#2C3E50",
    fontWeight: "500",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  writingDiaryInputPlaceholder: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
    borderRadius: 16,
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  writingDiaryInputPlaceholderText: {
    color: "#9CA3AF",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.1)",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
  },
  modalBody: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    padding: 20,
    minHeight: 300,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#2C3E50",
    lineHeight: 24,
    textAlignVertical: "top",
    minHeight: 260,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(93,161,217,0.1)",
  },
  modalButton: {
    width: 180,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
    transform: [{ scale: 1.05 }],
  },
  modalButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  selectedQuestionContainer: {
    backgroundColor: "rgba(93,161,217,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  selectedQuestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedQuestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 8,
  },
  selectedQuestionText: {
    fontSize: 15,
    color: "#2C3E50",
    lineHeight: 22,
  },
  modalInputWithQuestion: {
    minHeight: 200,
  },
  questionsContainer: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.tint,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  questionButton: {
    backgroundColor: "rgba(248,250,255,0.8)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  questionText: {
    fontSize: 15,
    color: "#2C3E50",
    fontWeight: "500",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  diaryInputPlaceholder: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
    borderRadius: 16,
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  diaryInputPlaceholderText: {
    color: "#9CA3AF",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  writingGradient: {
    flex: 1,
  },
  diaryViewTitle: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 8,
  },
  diaryViewScrollView: {
    flex: 1,
    marginTop: 70,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  brand: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 2,
    opacity: 0.95,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  userMessage: {
    backgroundColor: "rgba(248,250,255,0.8)",
  },
  aiMessage: {
    backgroundColor: "rgba(248,250,255,0.8)",
  },
  messageText: {
    fontSize: 16,
    color: "#2C3E50",
    lineHeight: 24,
  },
  writingAnalyzingContainer: {
    alignItems: "center",
    padding: 24,
  },
  writingAnalyzingText: {
    marginTop: 16,
    color: "#5D6D7E",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  writingMessageBlock: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.1)",
  },
  writingMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  writingMessageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingMessageTime: {
    fontSize: 14,
    color: "#5D6D7E",
    marginLeft: "auto",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  writingMessageText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2C3E50",
    letterSpacing: -0.2,
  },
  writingAiMessageText: {
    color: "#5D6D7E",
    fontStyle: "italic",
  },
});
