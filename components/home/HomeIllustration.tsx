import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet, Text, ActivityIndicator } from "react-native";
import { useOnboardingStore } from "../../store/onboardingStore";
import { generateOnboardingInsight } from "../../services/api.service";

export const HomeIllustration: React.FC = () => {
  const answersArray = useOnboardingStore((s) => s.answersArray);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [hasShownInsight, setHasShownInsight] = useState(false);

  useEffect(() => {
    // Sadece yeni kayıt olan kullanıcılar için insight göster
    const shouldShowInsight =
      answersArray.length === 3 &&
      !hasShownInsight &&
      !isLoadingInsight;

    if (shouldShowInsight) {
      const generateInsight = async () => {
        setIsLoadingInsight(true);
        try {
          const answer1 = answersArray.find(a => a.step === 1)?.answer || "";
          const answer2 = answersArray.find(a => a.step === 2)?.answer || "";
          const answer3 = answersArray.find(a => a.step === 3)?.answer || "";

          const result = await generateOnboardingInsight(answer1, answer2, answer3);
          if (result.data) {
            setInsight(result.data.insight);
          }
        } catch (error) {
          console.error("Onboarding insight generation failed:", error);
        } finally {
          setIsLoadingInsight(false);
          setHasShownInsight(true);
        }
      };

      generateInsight();
    }
  }, [answersArray, hasShownInsight, isLoadingInsight]);

  return (
    <View style={styles.container}>
      {/* RESİM İÇİN BİR SARMALAYICI (WRAPPER) EKLİYORUZ */}
      <View style={styles.imageWrapper}>
        <Image
          source={require("../../assets/therapy-illustration.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        {isLoadingInsight ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#5D9FE7" />
            <Text style={styles.loadingText}>Senin için mini analiz hazırlıyorum...</Text>
          </View>
        ) : insight ? (
          <>
            <Text style={styles.title}>Hoş Geldin! 🎉</Text>
            <Text style={styles.insight}>{insight}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Zihnine İyi Bak</Text>
            <Text style={styles.subtitle}>
              Yapay zekâ destekli kör noktalarını keşfetmeyi deneyimle
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: '100%',
  },
  // YENİ STİLLER BURADA
  imageWrapper: {
    height: 150, // Resmin görünür alanının yüksekliğini tahmin ediyoruz.
                 // Bu değeri değiştirerek ne kadar boşluk kırpılacağını ayarla.
    overflow: 'hidden', // Bu View'in dışına taşan her şeyi gizle.
    marginBottom: 20, // Wrapper ile text arasına düzgün boşluğu geri koyduk.
  },
  illustration: {
    width: 180, // Artık maxWidth değil, sabit genişlik veriyoruz.
    height: 180, // Resmin dosya boyutuna eşit yükseklik.
    // RESMİ YUKARI KAYDIRAN HİLE
    marginTop: -15, // Resmin üstündeki şeffaf boşluğu kırmak için
                    // negatif margin veriyoruz. Bu değeri değiştirerek ayarla.
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 8, // Düzgün boşluğu geri koyduk.
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 20, // Düzgün satır yüksekliğini geri koyduk.
    letterSpacing: -0.2,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#5D9FE7",
    textAlign: "center",
    fontWeight: "500",
  },
  insight: {
    fontSize: 16,
    color: "#1A1F36",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: "400",
    paddingHorizontal: 20,
  },
});