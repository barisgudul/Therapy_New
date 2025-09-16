// components/ProcessingScreen.tsx
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from "react-native-reanimated";
import { supabase } from "../utils/supabase";
import { useOnboardingStore } from "../store/onboardingStore";
import { useTranslation } from "react-i18next";

// RENK SABİTLERİ
const START_BG: readonly [string, string] = ["#0D1B2A", "#1B263B"]; // Başlangıç rengi
const END_BG: readonly [string, string] = ["#E0ECFD", "#F4E6FF"];   // Bitiş rengi (Marka rengi)

// BU COMPONENT ARTIK PROPS ALIYOR!
interface ProcessingScreenProps {
  text: string;           // Ekranda ne yazacak?
  onComplete: () => void; // Animasyon bitince hangi fonksiyonu çağıracak?
}

export default function ProcessingScreen({ text, onComplete }: ProcessingScreenProps) {
  const transitionProgress = useSharedValue(0);
  const answersArray = useOnboardingStore((s) => s.answersArray);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding); // RESET FONKSİYONUNU ÇEK
  const { i18n } = useTranslation();

  useEffect(() => {
    const generateAndSaveInsight = async () => {
      // 1. Cevapların olduğundan emin ol
      if (answersArray.length < 3) {
        console.error("Onboarding cevapları eksik, analiz oluşturulamadı.");
        onComplete(); // Hata olsa bile devam et, kullanıcıyı kitleme
        return;
      }

      try {
        // 2. SUPABASE FONKSİYONUNU ÇAĞIR
        console.log("Analiz fonksiyonu çağrılıyor...");
        const { data, error } = await supabase.functions.invoke('generate-onboarding-insight', {
          body: {
            answer1: answersArray[0].answer,
            answer2: answersArray[1].answer,
            answer3: answersArray[2].answer,
            language: i18n.language,
          },
        });

        if (error) throw error;
        console.log("Analiz başarıyla oluşturuldu:", data);

        // === TEMİZLİK ZAMANI ===
        // Analiz başarıyla istendiğine göre, bu geçici veriye artık ihtiyacımız yok.
        resetOnboarding();
        console.log("Onboarding verileri temizlendi.");

      } catch (error) {
        console.error("Analiz oluşturma veya kaydetme hatası:", error);
      } finally {
        // 3. Animasyonu ve yönlendirmeyi başlat
        const animationDuration = 1500;
        transitionProgress.value = withTiming(1, { duration: animationDuration });
        setTimeout(onComplete, animationDuration);
      }
    };

    generateAndSaveInsight();
  }, [onComplete, transitionProgress, answersArray, i18n.language, resetOnboarding]); // resetOnboarding'i bağımlılıklara ekle

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    return { opacity: transitionProgress.value };
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={START_BG} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
        <LinearGradient colors={END_BG} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(500)} style={styles.statusText}>
          {text}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusText: {
    color: "#A0AEC0",
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
