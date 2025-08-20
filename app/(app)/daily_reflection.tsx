// app/daily_reflection.tsx

import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { GradientHeader } from "../../components/daily_write/GradientHeader";
import { GradientMoodImage } from "../../components/daily_write/GradientMoodImage";
import { GradientMoodLabel } from "../../components/daily_write/GradientMoodLabel";
import { MOOD_LEVELS, tokens } from "../../constants/dailyWrite.constants";
import { useDailyReflection } from "../../hooks/useDailyReflection";
import { styles } from "../../styles/dailyWrite.styles";
import { interpolateColor } from "../../utils/color.utils";

const renderMarkdownText = (text: string, accentColor: string) => {
  if (!text) return null;
  const paragraphs = text.trim().split(/\n\s*\n/);
  return (
    <View>
      {paragraphs.map((paragraph, paragraphIndex) => {
        if (!paragraph.trim()) return null;
        if (paragraph.includes("💭")) {
          const parts = paragraph.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
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
              <Text
                style={{
                  fontSize: 14,
                  color: "#4A5568",
                  lineHeight: 22,
                  fontStyle: "italic",
                }}
              >
                {parts.map((part, index) => {
                  if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                    return (
                      <Text key={index} style={{ fontWeight: "700", color: "#2D3748", fontStyle: "normal" }}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
                    return (
                      <Text key={index} style={{ fontStyle: "italic" }}>
                        {part.slice(1, -1)}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
          );
        }
        if (paragraph.startsWith("###")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 18, color: "#1A202C", lineHeight: 28, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>
              {paragraph.slice(4)}
            </Text>
          );
        }
        if (paragraph.startsWith("##")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 20, color: "#1A202C", lineHeight: 30, fontWeight: "700", marginTop: 15, marginBottom: 8 }}>
              {paragraph.slice(3)}
            </Text>
          );
        }
        if (paragraph.startsWith("- ")) {
          return (
            <View key={paragraphIndex} style={{ flexDirection: "row", marginVertical: 4, paddingLeft: 10 }}>
              <Text style={{ fontSize: 16, color: accentColor, marginRight: 8, marginTop: 2 }}>•</Text>
              <Text style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, flex: 1 }}>{paragraph.slice(2)}</Text>
            </View>
          );
        }
        const parts = paragraph.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
        return (
          <Text key={paragraphIndex} style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, letterSpacing: -0.3, marginVertical: 4 }}>
            {parts.map((part, index) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                return (
                  <Text key={index} style={{ fontWeight: "700", color: "#1A202C" }}>{part.slice(2, -2)}</Text>
                );
              }
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
                return (
                  <Text key={index} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Text>
                );
              }
              return part;
            })}
          </Text>
        );
      })}
    </View>
  );
};

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
              <Text style={styles.premiumButtonText}>Premium'a Geç</Text>
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
  const gradientColors: [string, string] = [dynamicColor, tokens.tintMain];

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
              <GradientMoodImage colors={gradientColors} />
              <GradientMoodLabel text={currentMood.label} colors={gradientColors} />
            </View>
          </BlurView>
          <View style={{ marginTop: -16, marginBottom: 16, paddingHorizontal: 10 }}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={MOOD_LEVELS.length - 1}
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

      <Modal visible={state.inputVisible} transparent animationType="fade" onRequestClose={() => handlers.setInputVisible(false)}>
        <TouchableWithoutFeedback onPress={() => handlers.setInputVisible(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ backgroundColor: "white", margin: 20, borderRadius: 20, padding: 0, maxHeight: "85%", minHeight: "60%", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, width: "90%" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                  <TouchableOpacity onPress={() => handlers.setInputVisible(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={22} color="#666" />
                  </TouchableOpacity>
                  <View style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                    <LinearGradient colors={gradientColors} style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="create" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={{ width: 40, height: 40 }} />
                </View>
                <View style={{ paddingHorizontal: 20, paddingBottom: 15 }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: "#1A202C", textAlign: "center", letterSpacing: -0.5 }}>Bugün Nasılsın?</Text>
                  <Text style={{ fontSize: 14, color: "#718096", textAlign: "center", marginTop: 5, letterSpacing: -0.2 }}>
                    Duygularını ve düşüncelerini güvenle paylaş
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginHorizontal: 20 }} />
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25, paddingVertical: 20, paddingBottom: 30 }}>
                  <TextInput
                    maxLength={1000}
                    style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, letterSpacing: -0.3, textAlignVertical: "top", minHeight: 200, flex: 1 }}
                    value={state.note}
                    onChangeText={handlers.setNote}
                    placeholder="İçinden geçenleri anlatmak ister misin?"
                    placeholderTextColor="#A0AEC0"
                    multiline
                    autoFocus
                    selectionColor={dynamicColor}
                  />
                  <Text style={{ fontSize: 12, color: "#A0AEC0", textAlign: "right", marginTop: 15, marginBottom: 20 }}>
                    {state.note.length} / 1000
                  </Text>
                  <TouchableOpacity onPress={() => handlers.setInputVisible(false)} activeOpacity={0.8} style={{ borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}>
                    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 15, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>Tamam</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={state.feedbackVisible} transparent animationType="fade" onRequestClose={handlers.closeFeedback}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <TouchableWithoutFeedback onPress={handlers.closeFeedback} style={StyleSheet.absoluteFill}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={{ backgroundColor: "white", margin: 20, borderRadius: 20, padding: 0, maxHeight: "85%", minHeight: "60%", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
              <TouchableOpacity onPress={handlers.closeFeedback} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
              <View style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                <LinearGradient colors={gradientColors} style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={24} color="white" />
                </LinearGradient>
              </View>
              <View style={{ width: 40, height: 40 }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 15 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#1A202C", textAlign: "center", letterSpacing: -0.5 }}>Günlük Yansıman</Text>
              <Text style={{ fontSize: 14, color: "#718096", textAlign: "center", marginTop: 5, letterSpacing: -0.2 }}>
                Bugünkü duygularına dair düşüncelerim
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginHorizontal: 20 }} />
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25, paddingVertical: 20, paddingBottom: 30 }}>
              {renderMarkdownText(state.aiMessage, dynamicColor)}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}


