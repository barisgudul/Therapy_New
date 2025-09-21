// app/daily_reflection.tsx

import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react"; // useState'i ekle
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
import { useTranslation } from "react-i18next";



export default function DailyReflectionScreen() {
  const { state, handlers } = useDailyReflection();
  const [sliderWidth, setSliderWidth] = useState(0); // Slider genişliği için state
  const { t } = useTranslation();

  if (state.freemium.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{t('daily_reflection.loading')}</Text>
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
              <Text style={styles.premiumTitle}>{t('daily_reflection.premium.title')}</Text>
            </View>
            <Text style={styles.premiumDescription}>
              {t('daily_reflection.premium.description')}
            </Text>
            <Text style={styles.premiumUsage}>
              {t('daily_reflection.premium.usage_label', { used: state.freemium.used_count, limit: state.freemium.limit_count })}
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={() => handlers.router.push("/subscription")}>
              <Text style={styles.premiumButtonText}>{t('daily_reflection.premium.button')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#6366F1" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  // --- RENK HESAPLAMALARINI GÜNCELLE ---
  const startIndex = Math.floor(state.moodValue);
  const endIndex = Math.min(startIndex + 1, MOOD_LEVELS.length - 1);
  const factor = state.moodValue - startIndex;

  // Başlangıç rengini hesapla
  const dynamicStartColor = interpolateColor(
    MOOD_LEVELS[startIndex].startColor,
    MOOD_LEVELS[endIndex].startColor,
    factor,
  );

  // Bitiş rengini hesapla
  const dynamicEndColor = interpolateColor(
    MOOD_LEVELS[startIndex].endColor,
    MOOD_LEVELS[endIndex].endColor,
    factor,
  );

  // Dinamik degrade dizisi oluştur
  const dynamicGradient: [string, string] = [dynamicStartColor, dynamicEndColor];

  // Tek renk gereken yerler için (thumb, border vs.) başlangıç rengini kullanabiliriz
  const singleDynamicColor = dynamicStartColor;

  const currentMoodLabel = t(`daily_reflection.moods.${Math.round(state.moodValue)}`);

  // --- PİKSEL MÜKEMMELLİĞİ İÇİN SLIDER HESAPLAMASI ---
  // Bu değerler, slider thumb'ının görsel boyutuna ve component'in iç padding'ine göre ayarlandı.
  const THUMB_SIZE = 28; // Thumb'ın görsel çapı (biraz büyüttük daha iyi kontrol için)

  // BU EN ÖNEMLİSİ: Slider component'inin sol ve sağda bıraktığı görünmez boşluk.
  // Bu değeri test ederek bulduk. Her iki tarafta yaklaşık 8px'lik bir boşluk var.
  const SLIDER_INTERNAL_PADDING = 8;

  // Slider'ın ilerleme yüzdesini hesapla
  const percentage = state.moodValue / (MOOD_LEVELS.length - 1);

  // Thumb'ın merkezi tarafından kat edilen gerçek yolu hesapla.
  // Bu, tam genişlikten hem thumb'ın kendi boyutunu hem de görünmez padding'leri çıkarmakla olur.
  const effectiveTrackWidth = sliderWidth > 0 ? sliderWidth - (SLIDER_INTERNAL_PADDING * 2) - THUMB_SIZE : 0;

  // Degrade'nin genişliği: Başlangıçtaki thumb'ın yarıçapı + ilerleme mesafesi.
  // Bu, degrade'nin her zaman thumb'ın tam ortasında bitmesini garantiler.
  const gradientWidth = (THUMB_SIZE / 2) + (percentage * effectiveTrackWidth);

  // Degrade'nin soldan başlaması gereken yer. Container'ın padding'i + slider'ın iç padding'i.
  const gradientLeftOffset = 10 + SLIDER_INTERNAL_PADDING;

  const handleNavigateToTherapy = () => {

    if (!state.pendingSessionId) {
      return; // Güvenlik kontrolü
    }

    // Modal'ı kapat
    handlers.closeFeedback();

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

      <GradientHeader text={t('daily_reflection.header_title')} colors={dynamicGradient} />

      <Animated.View style={[styles.container, state.fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, { borderColor: singleDynamicColor }]}>
            <Text style={styles.title}>{t('daily_reflection.slider.question')}</Text>
            <View style={styles.moodBlock}>
              <GradientMoodImage colors={dynamicGradient} moodValue={state.moodValue} />
              <GradientMoodLabel text={currentMoodLabel} colors={dynamicGradient} />
            </View>
          </BlurView>
          {/* --- SLIDER DEĞİŞİKLİĞİ --- */}
          <View
            style={{ marginTop: -16, marginBottom: 16, paddingHorizontal: 10 }}
            onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} // Slider'ın kapsayıcısının genişliğini al
          >
            {/* Degrade Arka Plan */}
            <LinearGradient
                colors={dynamicGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                    position: 'absolute',
                    top: 18,
                    left: gradientLeftOffset, // DİNAMİK BAŞLANGIÇ NOKTASI
                    height: 4,
                    width: gradientWidth, // KESİN HESAPLANMIŞ GENİŞLİK
                    borderRadius: 2,
                }}
            />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={MOOD_LEVELS.length - 1} // Dinamik olarak ayarla
              step={0.01}
              value={state.moodValue}
              onValueChange={handlers.setMoodValue}
              onSlidingComplete={handlers.onSlidingComplete}
              minimumTrackTintColor="transparent" // Orijinal track'i gizle
              maximumTrackTintColor="rgba(0,0,0,0.1)" // Arka plan track'i
              thumbTintColor={singleDynamicColor} // Thumb rengi dinamik olsun
            />
          </View>
          {/* --- SLIDER DEĞİŞİKLİĞİ BİTTİ --- */}
          <TouchableOpacity
            onPress={() => {
              handlers.animatePress();
              handlers.setInputVisible(true);
            }}
            activeOpacity={0.8}
          >
            <BlurView intensity={50} tint="light" style={[styles.card, styles.promptCard]}>
              <Ionicons name="create-outline" size={24} color={singleDynamicColor} />
              <Text numberOfLines={1} style={[styles.promptText, state.note && styles.promptFilled]}>
                {state.note || t('daily_reflection.prompt.placeholder')}
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
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={dynamicGradient} style={[styles.saveBtn, (!state.note || state.saving) && { opacity: 0.5 }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.saveText}>{state.saving ? t('daily_reflection.save.saving') : t('daily_reflection.save.button')}</Text>
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
        dynamicColor={singleDynamicColor}
        gradientColors={dynamicGradient}
      />

      <FeedbackModal
        isVisible={state.feedbackVisible}
        onClose={handlers.closeFeedback}
        aiMessage={state.aiMessage ?? ""}
        gradientColors={dynamicGradient}
        dynamicColor={singleDynamicColor}
        satisfactionScore={state.satisfactionScore}
        onSatisfaction={handlers.handleSatisfaction}
        onNavigateToTherapy={handleNavigateToTherapy}
      />
    </SafeAreaView>
  );
}


