// components/ProcessingScreen.tsx
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from "react-native-reanimated";

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

  useEffect(() => {
    // Component'in ne kadar süre "işlem yapıyor" gibi görüneceğini belirle
    const processingDuration = 2000; // 2 saniye
    const animationDuration = 1500;  // 1.5 saniye

    const timer = setTimeout(() => {
      // Renk geçişini başlat
      transitionProgress.value = withTiming(1, { duration: animationDuration });

      // Animasyon bittikten sonra onComplete fonksiyonunu çağır
      setTimeout(onComplete, animationDuration);

    }, processingDuration);

    return () => clearTimeout(timer); // Ekrandan ayrılırsa temizle
  }, [onComplete, transitionProgress]);

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
