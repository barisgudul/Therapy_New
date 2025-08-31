// components/diary/DiaryList.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import type { DiaryAppEvent } from "../../services/event.service";

interface DiaryListProps {
  isLoading: boolean;
  diaryEvents: DiaryAppEvent[];
  onViewDiary: (event: DiaryAppEvent) => void;
  onNewDiary: () => void;
  onBack?: () => void;
}

export const DiaryList: React.FC<DiaryListProps> = ({ isLoading, diaryEvents, onViewDiary, onNewDiary, onBack }) => {

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.logo}>
          therapy<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.title}>Günlüklerim</Text>
        <Text style={styles.subtitle}>
          Duygularını ve düşüncelerini kaydet.
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.diaryContainer}>
          {isLoading ? (
              <View>
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
            ) : diaryEvents.length === 0 ? (
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
                <Text style={styles.emptyStateText}>Henüz günlük yazmamışsın</Text>
                <Text style={styles.emptyStateSubtext}>Yeni bir günlük yazarak başla</Text>
              </View>
            ) : (
              <FlatList
                data={diaryEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item: event }) => (
                  <TouchableOpacity style={styles.diaryCard} onPress={() => onViewDiary(event)}>
                    <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.diaryCardGradient}>
                      <View style={styles.diaryCardHeader}>
                        <View style={styles.diaryCardDateContainer}>
                          <Ionicons name="calendar" size={20} color={Colors.light.tint} />
                          <Text style={styles.diaryDate}>
                            {new Date(event.timestamp).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
                          </Text>
                        </View>
                        <Text style={styles.diaryTime}>
                          {new Date(event.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={styles.diaryPreview}>
                        <Text style={styles.diaryPreviewText} numberOfLines={2}>
                          {event.data?.messages?.[0]?.text || "Boş günlük"}
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

      <TouchableOpacity style={styles.newDiaryButton} onPress={onNewDiary}>
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
            <Text style={styles.newDiaryButtonText}>Yeni Günlük</Text>
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
  header: {
    alignItems: "center",
    paddingTop: 120,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 30,
  },
  back: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 30,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(227,232,240,0.4)",
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
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  diaryContainer: {
    paddingVertical: 24,
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
    bottom: 80,
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


