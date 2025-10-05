// components/ProcessingScreen.tsx
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from "react-native-reanimated";

// RENKLER AYNI
const START_BG: readonly [string, string] = ["#0D1B2A", "#1B263B"];
const END_BG: readonly [string, string] = ["#E0ECFD", "#F4E6FF"];

interface ProcessingScreenProps {
  text: string;
  onComplete: () => void;
}

// ARTIK İÇİNDE HİÇBİR API ÇAĞRISI VEYA MANTIK YOK!
export default function ProcessingScreen({ text, onComplete }: ProcessingScreenProps) {
  const transitionProgress = useSharedValue(0);

  useEffect(() => {
    // Sadece animasyonu tetikle ve bitince haber ver.
    const animationDuration = 1500;
    transitionProgress.value = withTiming(1, { duration: animationDuration });
    
    // Timer'ı değişkene atayarak cleanup için sakla
    const timer = setTimeout(onComplete, animationDuration);
    
    // Critical: cleanup function - component unmount edildiğinde timer'ı temizle
    return () => {
      clearTimeout(timer);
    };
  }, [onComplete, transitionProgress]);

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: transitionProgress.value,
  }));

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
