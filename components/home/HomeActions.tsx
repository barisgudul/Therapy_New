// components/home/HomeActions.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router/";
import { Ionicons } from '@expo/vector-icons'; // Ionicons'u import et
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

  // Array'in tipini doğru şekilde tanımla
  const actions: { key: string; icon: IconName; text: string; onPress: () => void; }[] = [
    { key: 'daily', icon: 'sparkles-outline', text: 'Bugün Nasıl Hissediyorsun?', onPress: onDailyPress },
    { key: 'diary', icon: 'book-outline', text: 'Günlük', onPress: () => router.push("/diary") },
    { key: 'dream', icon: 'cloudy-night-outline', text: 'Rüya Analizi', onPress: () => router.push("/dream") },
    { key: 'ai_summary', icon: 'analytics-outline', text: 'Kişisel Rapor', onPress: () => router.push("/ai_summary") },
    { key: 'therapy', icon: 'chatbubble-outline', text: 'Sohbet ', onPress: () => router.push("/therapy/therapy_options") },
    { key: 'transcripts', icon: 'time-outline', text: 'Geçmiş Sohbetlerim', onPress: () => router.push("/transcripts") },
  ];

  return (
    <View style={styles.buttonContainer}>
      {/* Özel haftalık rapor butonu */}
      {latestReport && !latestReport.read_at && (
        <ActionButton
          onPress={onReportPress}
          icon="sparkles-sharp"
          text="Haftalık İçgörü Keşfin Hazır!"
          isSpecial
        />
      )}

      {/* === YENİ BUTON BAŞLANGIÇ === */}
      {/* Sadece onOnboardingInsightPress fonksiyonu varsa bu butonu göster */}
      {onOnboardingInsightPress && (
        <ActionButton
          onPress={onOnboardingInsightPress}
          icon="bulb-outline"
          text="İlk Analizin Hazır!"
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
        <Text style={styles.linkText}>Terapiler nasıl işler?</Text>
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
