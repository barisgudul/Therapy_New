// app/dream/analyze.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import { MotiView } from "moti";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from "react-native-toast-message";
import { COSMIC_COLORS } from "../../../constants/Colors";
import { useVault } from "../../../hooks/useVault";
import { canUserAnalyzeDream } from "../../../services/event.service";
import { supabase } from "../../../utils/supabase";

export default function AnalyzeDreamScreen() {
  const [dream, setDream] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // ADIM 2'DEKİ DÜZELTME: Vault verisini baştan alıyoruz.
  const { data: _vault, isLoading: isVaultLoading } = useVault();

  // YENİ VE AKILLI useMutation BLOĞU
  const analyzeMutation = useMutation<string, Error, void>({
    mutationFn: async (): Promise<string> => {
      // --- YENİ KONTROL KAPI KİLİDİ ---
      const { canAnalyze } = await canUserAnalyzeDream();
      if (!canAnalyze) {
        throw new Error("Günlük rüya analizi limitinize ulaştınız.");
      }
      // --- KONTROL BİTTİ ---

      if (dream.trim().length < 20) {
        throw new Error("Lütfen rüyanızı biraz daha detaylı anlatın.");
      }

      const eventPayload = {
        type: "dream_analysis" as const,
        data: { dreamText: dream.trim() },
      };

      // processUserEvent, "dream_analysis" eventinde string eventId döndürmeli.
      // Ancak linter hatası, dönüş tipinin yanlış olduğunu söylüyor.
      // processUserEvent'in dönüş tipi muhtemelen ConversationResponse (veya başka bir tip) olarak tanımlı.
      // Bunu çözmek için, dönen değerin eventId'sini açıkça çekiyoruz.

      const { data, error } = await supabase.functions.invoke("orchestrator", {
        body: { eventPayload },
      });
      
      if (error) throw error;
      
      // Backend'den eventId döndüğünü varsayıyoruz
      const eventId = typeof data === "string" ? data : data?.eventId || "";
      if (!eventId) throw new Error("Analiz tamamlandı ama event ID alınamadı");
      
      return eventId;
    },

    // BAŞARI DURUMU: Dönen şeyin eventId (string) olduğunu biliyoruz.
    onSuccess: (eventId: string) => {
      // Önce cache'i temizle ki liste güncellensin.
      queryClient.invalidateQueries({ queryKey: ["dreamEvents"] });

     
      router.replace({ pathname: "/dream/result", params: { id: eventId } });

      Toast.show({
        type: "success",
        text1: "Analiz Başarılı!",
        text2: "Sonuçlar yükleniyor...",
      });
    },

    // HATA DURUMU: Gelen hatayı olduğu gibi basma, anlaşılır hale getir.
    onError: (e: Error) => {
      setError(e.message || "Beklenmedik bir hata oluştu.");
      if ((e.message || "").includes("limitinize ulaştınız")) {
        Toast.show({ type: "info", text1: "Limit Doldu", text2: e.message });
      } else {
        Toast.show({
          type: "error",
          text1: "Analiz Başarısız Oldu",
          text2: e.message || "Lütfen daha sonra tekrar deneyin.",
        });
      }
    },
  });

  // GÜNCELLENMİŞ handleAnalyzePress FONKSİYONU
  const handleAnalyzePress = () => {
    setError(null); // Eski hataları temizle
    Keyboard.dismiss();
    analyzeMutation.mutate(); // Mutasyonu parametresiz çağır.
  };

  const MIN_LEN = 20;
  const trimmedLen = dream.trim().length;
  const canSubmit = trimmedLen >= MIN_LEN && !analyzeMutation.isPending && !isVaultLoading;

  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header'ı ScrollView'ın DIŞINA al, sabit kalsın */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ScrollView içeriği sarmalasın ama tüm alanı kaplamasın */}
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
          <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }}>
            <Ionicons name="moon-outline" size={36} color={COSMIC_COLORS.accent} style={styles.moonIcon} />
            <Text style={styles.headerTitle}>Yeni Rüya</Text>
            <Text style={styles.headerSubtext}>
              Zihninizin derinliklerinden gelen mesajı yazın.
            </Text>
          </MotiView>

          <MotiView from={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Gecenin sessizliğinde zihnimde belirenler..."
                placeholderTextColor={COSMIC_COLORS.textSecondary}
                multiline
                value={dream}
                onChangeText={setDream}
                editable={!analyzeMutation.isPending}
                selectionColor={COSMIC_COLORS.accent}
              />
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.helperText}>Özel kalır, sadece analiz için kullanılır.</Text>
              <Text style={styles.counter}>{trimmedLen}/{MIN_LEN}</Text>
            </View>
          </MotiView>

          {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          {/* Footer klavyenin üstünde kalsın */}
          <View style={styles.footer}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              style={styles.buttonContainer}
              disabled={!canSubmit}
              onPress={handleAnalyzePress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={!canSubmit ? COSMIC_COLORS.disabledGradient : COSMIC_COLORS.accentGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.analyzeButton}
              >
                {analyzeMutation.isPending ? (
                  <ActivityIndicator color={COSMIC_COLORS.textPrimary} />
                ) : (
                  <Text style={styles.analyzeButtonText}>Analiz Et</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    padding: 8
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  scrollContainer: {
    flexGrow: 1, // İçerik az olsa bile alanı doldurmaya çalışır
    justifyContent: 'center', // içeriği ortalar
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COSMIC_COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtext: {
    fontSize: 16,
    color: COSMIC_COLORS.textSecondary,
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    padding: 16,
    fontSize: 16,
    minHeight: 250,
    textAlignVertical: "top",
    color: COSMIC_COLORS.textPrimary,
    lineHeight: 24,
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    padding: 8,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 12,
  },
  counter: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: "#FF7B7B",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  analyzeButton: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    letterSpacing: 0.3,
  },

  footer: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COSMIC_COLORS.cardBorder,
  },
  moonIcon: {
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  buttonContainer: {
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
