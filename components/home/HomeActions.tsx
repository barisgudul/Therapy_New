// components/home/HomeActions.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router/";
import { Ionicons } from '@expo/vector-icons'; // Ionicons'u import et
import { useTranslation } from "react-i18next";
import { ActionButton } from './ActionButton';
import { UserReport } from "../../services/report.service";

// Icon isimlerinin tipini Ionicons'tan türet
type IconName = keyof typeof Ionicons.glyphMap;

interface HomeActionsProps {
  onDailyPress: () => void;
  onReportPress: () => void;
  onOnboardingInsightPress?: () => void; // YENİ: Opsiyonel press handler
  latestReport?: UserReport | null;
}

export const HomeActions: React.FC<HomeActionsProps> = ({
  onDailyPress,
  onReportPress,
  onOnboardingInsightPress, // YENİ
  latestReport,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Array'in tipini doğru şekilde tanımla
  const actions: { key: string; icon: IconName; text: string; onPress: () => void; }[] = [
    { key: 'daily', icon: 'sparkles-outline', text: t('home.actions.daily_mood'), onPress: onDailyPress },
    { key: 'diary', icon: 'book-outline', text: t('home.actions.diary'), onPress: () => router.push("/diary") },
    { key: 'dream', icon: 'cloudy-night-outline', text: t('home.actions.dream_analysis'), onPress: () => router.push("/dream") },
    { key: 'ai_summary', icon: 'analytics-outline', text: t('home.actions.personal_report'), onPress: () => router.push("/ai_summary") },
    { key: 'therapy', icon: 'chatbubble-outline', text: t('home.actions.chat'), onPress: () => router.push("/therapy/therapy_options") },
    { key: 'transcripts', icon: 'time-outline', text: t('home.actions.past_chats'), onPress: () => router.push("/transcripts") },
  ];

  return (
    <View style={styles.buttonContainer}>
      {/* Özel haftalık rapor butonu */}
      {latestReport && !latestReport.read_at && (
        <ActionButton
          onPress={onReportPress}
          icon="sparkles-sharp"
          text={t('home.actions.weekly_insight_ready')}
          isSpecial
        />
      )}

      {/* === YENİ BUTON BAŞLANGIÇ === */}
      {/* Sadece onOnboardingInsightPress fonksiyonu varsa bu butonu göster */}
      {onOnboardingInsightPress && (
        <ActionButton
          onPress={onOnboardingInsightPress}
          icon="bulb-outline"
          text={t('home.actions.first_analysis_ready')}
          isSpecial // Diğer özel buton gibi dikkat çekici olsun
        />
      )}
      {/* === YENİ BUTON BİTİŞ === */}

      {/* Tüm normal butonlar */}
      {actions.map(action => (
        <ActionButton
          key={action.key}
          onPress={action.onPress}
          // Artık 'as any' paçavrasına gerek yok!
          icon={action.icon}
          text={action.text}
        />
      ))}

      {/* Link butonu */}
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push("/how_it_works")}
      >
        <Text style={styles.linkText}>{t('home.actions.what_is_gisbel')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  linkButton: {
    alignItems: "center",
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "underline",
    letterSpacing: -0.2,
  },
});
