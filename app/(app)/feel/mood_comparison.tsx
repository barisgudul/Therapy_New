// app/feel/mood_comparison.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { logEvent } from "../../../services/api.service";
import { useOnboardingStore } from "../../../store/onboardingStore";

const { width, height } = Dimensions.get("window");
const LOTUS_SIZE = width * 0.7;

type MoodLevel = {
  id: number;
  label: string;
  color: string;
  bg: [string, string];
  particleColor: string;
};
type ThemeType = { bg: [string, string]; tint: string; particleColor: string };

interface ParticleProps {
  p: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    opacity: SharedValue<number>;
    size: number;
    duration: number;
  };
  color: string;
}

// Mood level'ları çeviri anahtarlarıyla tanımla
const getMoodLevels = (t: (key: string) => string): MoodLevel[] => [
  { id: 0, label: t("mood_reveal.very_bad"), color: "#0D1B2A", bg: ["#02040F", "#0D1B2A"], particleColor: "#415A77" },
  { id: 1, label: t("mood_reveal.bad"),     color: "#1B263B", bg: ["#0D1B2A", "#1B263B"], particleColor: "#778DA9" },
  { id: 2, label: t("mood_reveal.sad"),     color: "#415A77", bg: ["#1B263B", "#415A77"], particleColor: "#778DA9" },
  { id: 3, label: t("mood_reveal.neutral"), color: "#778DA9", bg: ["#415A77", "#778DA9"], particleColor: "#415A77" },
  { id: 4, label: t("mood_reveal.good"),    color: "#3B82F6", bg: ["#2B6CB0", "#3182CE"], particleColor: "#60A5FA" },
  { id: 5, label: t("mood_reveal.great"),   color: "#60A5FA", bg: ["#3182CE", "#63B3ED"], particleColor: "#3B82F6" },
  { id: 6, label: t("mood_reveal.perfect"), color: "#06B6D4", bg: ["#155E75", "#0891B2"], particleColor: "#22D3EE" },
];

function moodFromAnswers(text: string, t: (key: string) => string): MoodLevel {
  const POS = t('mood_reveal.pos_keywords').split(',');
  const NEG = t('mood_reveal.neg_keywords').split(',');

  // Aktif dili kullanarak lowercase yap
  const currentLanguage = t('mood_reveal.pos_keywords').includes('iyi') ? 'tr-TR' : 'en-US';
  const lowerCaseText = text.toLocaleLowerCase(currentLanguage);

  let pos = 0, neg = 0;
  for (const w of POS) if (lowerCaseText.includes(w.trim().toLowerCase())) pos++;
  for (const w of NEG) if (lowerCaseText.includes(w.trim().toLowerCase())) neg++;
  const score = pos - neg;
  let id: number;
  if (score <= -3) id = 0;
  else if (score === -2) id = 1;
  else if (score === -1) id = 2;
  else if (score === 0) id = 3;
  else if (score === 1) id = 4;
  else if (score === 2) id = 5;
  else id = 6;
  return getMoodLevels(t)[id];
}

const Particle = ({ p, color }: ParticleProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: p.opacity.value,
    transform: [
      { translateX: p.x.value },
      { translateY: p.y.value },
    ] as const,
  }));
  return <Animated.View style={[styles.particle, { backgroundColor: color, width: p.size, height: p.size, borderRadius: p.size/2 }, animatedStyle]} />;
};

const CosmicParticles = memo(({ color }: { color: string }) => {
  // Create particle configs once
  const particleConfigs = useRef(
    Array.from({ length: 12 }).map(() => ({
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20000 + 15000,
    }))
  ).current;

  // Create individual shared values at component level
  const p1 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p2 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p3 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p4 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p5 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p6 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p7 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p8 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p9 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p10 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p11 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };
  const p12 = { x: useSharedValue(Math.random() * width), y: useSharedValue(Math.random() * height), opacity: useSharedValue(Math.random() * 0.5 + 0.2) };

  const particles = [
    { ...p1, size: particleConfigs[0].size, duration: particleConfigs[0].duration },
    { ...p2, size: particleConfigs[1].size, duration: particleConfigs[1].duration },
    { ...p3, size: particleConfigs[2].size, duration: particleConfigs[2].duration },
    { ...p4, size: particleConfigs[3].size, duration: particleConfigs[3].duration },
    { ...p5, size: particleConfigs[4].size, duration: particleConfigs[4].duration },
    { ...p6, size: particleConfigs[5].size, duration: particleConfigs[5].duration },
    { ...p7, size: particleConfigs[6].size, duration: particleConfigs[6].duration },
    { ...p8, size: particleConfigs[7].size, duration: particleConfigs[7].duration },
    { ...p9, size: particleConfigs[8].size, duration: particleConfigs[8].duration },
    { ...p10, size: particleConfigs[9].size, duration: particleConfigs[9].duration },
    { ...p11, size: particleConfigs[10].size, duration: particleConfigs[10].duration },
    { ...p12, size: particleConfigs[11].size, duration: particleConfigs[11].duration },
  ];

  useEffect(() => {
    particles.forEach((p) => {
      p.y.value = withRepeat(withTiming(p.y.value - height * 1.2, { duration: p.duration }), -1, false);
      p.x.value = withRepeat(withTiming(p.x.value + (Math.random() - 0.5) * 100, { duration: p.duration }), -1, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => <Particle key={i} p={p} color={color} />)}
    </View>
  );
});
CosmicParticles.displayName = "CosmicParticles";

interface Props { onContinueToSoftWall?: () => void; }

export default function MoodComparisonScreen({ onContinueToSoftWall }: Props = {}) {
  const router = useRouter();
  const { t } = useTranslation();
  const answersArray = useOnboardingStore((s) => s.answersArray);

  const [theme, setTheme] = useState<{ initial: ThemeType; final: ThemeType } | null>(null);
  const [ready, setReady] = useState(false);

  const transitionProgress = useSharedValue(0);

  useEffect(() => {
    logEvent({ type: "mood_reveal_seen", data: {} }).catch(() => {});
    const text = (answersArray ?? []).map(a => a.answer).join(" ").trim();
    const final = text ? moodFromAnswers(text, t) : getMoodLevels(t)[4];
    const initial = getMoodLevels(t)[3]; // neutral mood
    setTheme({
      initial: { bg: initial.bg, tint: initial.color, particleColor: initial.particleColor },
      final:   { bg: final.bg,   tint: final.color,   particleColor: final.particleColor },
    });
    setReady(true);
    transitionProgress.value = withDelay(400, withTiming(1, { duration: 4000, easing: Easing.bezier(0.25, 1, 0.5, 1) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersArray, t]);

  const animatedBg = useAnimatedStyle(() => ({ opacity: transitionProgress.value }));
  const animatedTint = useAnimatedStyle(() => ({
    tintColor: theme ? interpolateColor(transitionProgress.value, [0, 1], [theme.initial.tint, theme.final.tint]) : getMoodLevels(t)[3].color,
  }));

  const handleTap = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logEvent({ type: "mood_reveal_continue", data: {} }).catch(() => {});
    if (onContinueToSoftWall) onContinueToSoftWall();
    else router.replace("/(guest)/softwall");
  };

  if (!ready || !theme) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#A0AEC0" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.initial.bg} style={StyleSheet.absoluteFill} />
      <CosmicParticles color={theme.initial.particleColor} />
      <Animated.View style={[StyleSheet.absoluteFill, animatedBg]}>
        <LinearGradient colors={theme.final.bg} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.lotusPositioner]}>
        <Animated.Image
          source={require("../../../assets/therapy.png")}
          style={[styles.lotusImage, animatedTint]}
        />
      </Animated.View>

      {/* Alt ipucu — buton değil */}
      <Pressable onPress={handleTap} style={styles.fullScreenPressable}>
        <BlurView intensity={20} tint="dark" style={styles.tapHint}>
          <Ionicons name="hand-left-outline" size={18} color="#E2E8F0" />
          <Text style={styles.tapHintText}>{t("mood_reveal.continue_hint")}</Text>
        </BlurView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A202C" },
  particle: { position: "absolute" },

  lotusPositioner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  lotusImage: { width: LOTUS_SIZE, height: LOTUS_SIZE, resizeMode: "contain" },

  fullScreenPressable: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 46 : 34,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(16, 52, 80, 0.35)", // Blur üstüne hafif tint
  },
  tapHintText: { marginLeft: 8, color: "#E2E8F0", fontWeight: "600" },
});