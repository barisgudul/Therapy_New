// app/daily_reflection.tsx

import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { GradientHeader } from "../../components/daily_reflection/GradientHeader";
import { GradientMoodImage } from "../../components/daily_reflection/GradientMoodImage";
import { GradientMoodLabel } from "../../components/daily_reflection/GradientMoodLabel";
import InputModal from "../../components/daily_reflection/InputModal";
import FeedbackModal from "../../components/daily_reflection/FeedbackModal";
import { MOOD_LEVELS} from "../../constants/dailyWrite.constants";
import { useDailyReflection } from "../../hooks/useDailyReflection";
import { styles } from "../../styles/dailyWrite.styles";
import { interpolateColor } from "../../utils/color.utils";



export default function DailyReflectionScreen() {
  const { state, handlers } = useDailyReflection();

  if (state.freemium.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (!state.freemium.can_use) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#F6F8FA", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
        <View style={styles.premiumPrompt}>
          <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.premiumCard}>
            <View style={styles.premiumHeader}>
              <Ionicons name="diamond" size={32} color="white" />
              <Text style={styles.premiumTitle}>Günlük Limit Doldu</Text>
            </View>
            <Text style={styles.premiumDescription}>
              Günde 1 duygu günlüğü yazabilirsiniz. Premium planla sınırsız günlük yazabilirsiniz.
            </Text>
            <Text style={styles.premiumUsage}>
              Kullanım: {state.freemium.used_count}/{state.freemium.limit_count}
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={() => handlers.router.push("/subscription")}>
              <Text style={styles.premiumButtonText}>Premium&apos;a Geç</Text>
              <Ionicons name="arrow-forward" size={20} color="#6366F1" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  const startIndex = Math.floor(state.moodValue);
  const endIndex = Math.min(startIndex + 1, MOOD_LEVELS.length - 1);
  const factor = state.moodValue - startIndex;
  const dynamicColor = interpolateColor(
    MOOD_LEVELS[startIndex].color,
    MOOD_LEVELS[endIndex].color,
    factor,
  );
  const currentMood = MOOD_LEVELS[Math.round(state.moodValue)];
  const gradientColors: [string, string] = ["#E0ECFD", "#F4E6FF"];

  const handleNavigateToTherapy = () => {
   
    if (!state.pendingSessionId) {
      return; // Güvenlik kontrolü
    }

   
    handlers.router.push({
      pathname: '/sessions/text_session',
      params: { pendingSessionId: state.pendingSessionId }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#F6F8FA", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.light, styles.light1, { transform: state.light1.getTranslateTransform() }]} />
      <Animated.View style={[styles.light, styles.light2, { transform: state.light2.getTranslateTransform() }]} />

      <GradientHeader text="Duygu Günlüğü" colors={gradientColors} />

      <Animated.View style={[styles.container, state.fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, { borderColor: dynamicColor }]}>
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <View style={styles.moodBlock}>
              <GradientMoodImage colors={gradientColors} moodValue={state.moodValue} />
              <GradientMoodLabel text={currentMood.label} colors={gradientColors} />
            </View>
          </BlurView>
          <View style={{ marginTop: -16, marginBottom: 16, paddingHorizontal: 10 }}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={6} // 7 seviye için (0-6 arası)
              step={0.01}
              value={state.moodValue}
              onValueChange={handlers.setMoodValue}
              onSlidingComplete={handlers.onSlidingComplete}
              minimumTrackTintColor={dynamicColor}
              maximumTrackTintColor="rgba(93,161,217,0.15)"
              thumbTintColor={dynamicColor}
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              handlers.animatePress();
              handlers.setInputVisible(true);
            }}
            activeOpacity={0.8}
          >
            <BlurView intensity={50} tint="light" style={[styles.card, styles.promptCard]}>
              <Ionicons name="create-outline" size={24} color={dynamicColor} />
              <Text numberOfLines={1} style={[styles.promptText, state.note && styles.promptFilled]}>
                {state.note || "Bugün'ün duygularını ve düşüncelerini buraya yaz..."}
              </Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <Animated.View style={[{ transform: [{ scale: state.scaleAnim }] }]}>
          <TouchableOpacity
            disabled={!state.note || state.saving}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handlers.saveSession();
            }}
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={gradientColors} style={[styles.saveBtn, (!state.note || state.saving) && { opacity: 0.5 }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.saveText}>{state.saving ? "Kaydediliyor..." : "Günlüğü Tamamla"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <InputModal
        isVisible={state.inputVisible}
        onClose={() => handlers.setInputVisible(false)}
        onSubmit={() => handlers.setInputVisible(false)} // Sadece kapat
        note={state.note}
        onNoteChange={handlers.setNote}
        dynamicColor={dynamicColor}
        gradientColors={gradientColors}
      />

      <FeedbackModal
        isVisible={state.feedbackVisible}
        onClose={handlers.closeFeedback}
        aiMessage={state.aiMessage}
        gradientColors={gradientColors}
        dynamicColor={dynamicColor}
        satisfactionScore={state.satisfactionScore}
        onSatisfaction={handlers.handleSatisfaction}
        onNavigateToTherapy={handleNavigateToTherapy}
      />
    </SafeAreaView>
  );
}


