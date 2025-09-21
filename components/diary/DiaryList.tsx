// components/diary/DiaryList.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiaryContext } from "../../context/DiaryContext";
import { useRouter } from "expo-router/";
import { useTranslation } from "react-i18next";

export const DiaryList: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { state, handlers } = useDiaryContext();
  const router = useRouter(); // Geri butonu için eklendi
  const { t, i18n } = useTranslation();

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container} // Arka plan artık tüm ekranı kaplıyor
    >
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
            <Text style={styles.logo}>
                Gisbel<Text style={styles.dot}>.</Text>
            </Text>
            <Text style={styles.title}>{t('diary.list.title')}</Text>
        </View>

        {/* Bu boş view, başlığın tam ortada kalmasını sağlar */}
        <View style={styles.headerPlaceholder} />
      </View>

      <Text style={styles.subtitle}>
        {t('diary.list.subtitle')}
      </Text>

      <View style={styles.content}>
        <View style={styles.diaryContainer}>
          {state.isLoadingDiaries ? (
            <View style={styles.loadingContainer}>
              <View style={styles.skeletonPlaceholder}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonContent} />
              </View>
              <View style={styles.skeletonPlaceholder}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonContent} />
              </View>
              <View style={styles.skeletonPlaceholder}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonContent} />
              </View>
            </View>
          ) : state.diaryEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconContainer}>
                  <LinearGradient
                    colors={[Colors.light.tint, "rgba(255,255,255,0.9)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyStateIconGradient}
                  >
                    <Ionicons
                      name="journal-outline"
                      size={48}
                      color={Colors.light.tint}
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyStateText}>{t('diary.list.empty_title')}</Text>
                <Text style={styles.emptyStateSubtext}>{t('diary.list.empty_subtext')}</Text>
              </View>
            ) : (
              <FlatList
                data={state.diaryEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item: event }) => (
                  <TouchableOpacity style={styles.diaryCard} onPress={() => handlers.viewDiary(event)}>
                    <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.diaryCardGradient}>
                      <View style={styles.diaryCardHeader}>
                        <View style={styles.diaryCardDateContainer}>
                          <Ionicons name="calendar" size={20} color={Colors.light.tint} />
                          <Text style={styles.diaryDate}>
                            {new Date(event.timestamp).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'tr' ? 'tr-TR' : 'en-US', { year: "numeric", month: "long", day: "numeric" })}
                          </Text>
                        </View>
                        <Text style={styles.diaryTime}>
                          {new Date(event.timestamp).toLocaleTimeString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'tr' ? 'tr-TR' : 'en-US', { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={styles.diaryPreview}>
                        <Text style={styles.diaryPreviewText} numberOfLines={2}>
                          {event.data?.messages?.[0]?.text || ''}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
              />
            )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.newDiaryButton, { bottom: insets.bottom > 0 ? insets.bottom : 20 }]}
        onPress={handlers.startNewDiary}
      >
        <LinearGradient
          colors={["#F8FAFF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.newDiaryButtonGradient}
        >
          <View style={styles.newDiaryButtonContent}>
            <View style={styles.newDiaryButtonIconCircle}>
              <Ionicons name="add" size={28} color={Colors.light.tint} />
            </View>
            <Text style={styles.newDiaryButtonText}>{t('diary.list.button_new')}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // YENİ VE GÜNCELLENMİŞ STİLLER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 44, // Geri butonunun genişliği kadar boşluk
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.95,
    textAlign: "center",
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: "900",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A5568",
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 16, // Başlık sonrası boşluk
  },
  scrollView: {
    flex: 1,
  },
  diaryContainer: {
    flex: 1,
    paddingVertical: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "transparent",
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  emptyStateIconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    padding: 2.5,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1F36",
    marginTop: 24,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#4A5568",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  diaryCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
  },
  diaryCardGradient: {
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  diaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  diaryCardDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  diaryDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  diaryTime: {
    fontSize: 15,
    color: "#4A5568",
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  diaryPreview: {
    backgroundColor: "rgba(248,250,255,0.9)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  diaryPreviewText: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  newDiaryButton: {
    position: "absolute",
    right: 24,
    width: 180,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
    transform: [{ scale: 1.05 }],
  },
  newDiaryButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  newDiaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  newDiaryButtonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.4)",
  },
  newDiaryButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  skeletonPlaceholder: {
    height: 120,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    marginBottom: 20,
    padding: 24,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 20,
    width: "60%",
  },
  skeletonContent: {
    height: 16,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    width: "100%",
  },
});

export default DiaryList;


