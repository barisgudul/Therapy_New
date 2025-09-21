// components/diary/DiaryView.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiaryContext } from "../../context/DiaryContext";
import { useTranslation } from "react-i18next";

export const DiaryView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { state, handlers } = useDiaryContext();
  const { t, i18n } = useTranslation();

  if (!state.selectedDiary) {
    return (
      <View style={styles.diaryViewContainer}>
        <Text>{t('diary.view.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.diaryViewContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handlers.exitView()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.diaryViewTitle}>{t('diary.view.title')}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handlers.deleteDiary(state.selectedDiary!.id)}>
          <Ionicons name="trash-outline" size={24} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.diaryViewScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.diaryContainer}>
          <View style={styles.writingPageSection}>
            <View style={styles.writingPageHeader}>
              <View style={styles.writingPageInfo}>
                <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                <Text style={styles.writingPageTitle}>{t('diary.view.page_title')}</Text>
              </View>
              <Text style={styles.writingPageDate}>
                {state.selectedDiary ? new Date(state.selectedDiary.timestamp).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'tr' ? 'tr-TR' : 'en-US') : ""}
              </Text>
            </View>
            <View style={styles.writingPageContent}>
              {state.selectedDiary?.data?.messages && Array.isArray(state.selectedDiary.data.messages) && (
                (state.selectedDiary.data.messages).map(
                  (message, index) => (
                    <View key={index} style={styles.writingMessageBlock}>
                      <View style={styles.writingMessageHeader}>
                        <Ionicons
                          name={message.isUser ? "person-circle" : "sparkles"}
                          size={20}
                          color={Colors.light.tint}
                        />
                        <Text style={styles.writingMessageTitle}>
                          {message.isUser ? t('diary.messages.user_label') : t('diary.messages.ai_label')}
                        </Text>
                        <Text style={styles.writingMessageTime}>
                          {new Date(message.timestamp).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.writingMessageText,
                          !message.isUser && styles.writingAiMessageText,
                        ]}
                      >
                        {message.text}
                      </Text>
                    </View>
                  ),
                )
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  diaryViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
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
  deleteButton: {
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
  diaryViewTitle: {
    fontSize: 27,
    fontWeight: "600",
    color: Colors.light.tint,
    letterSpacing: -0.5,
  },
  diaryViewScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  diaryContainer: {
    paddingVertical: 24,
  },
  writingPageSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  writingPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.1)",
    paddingBottom: 20,
  },
  writingPageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  writingPageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingPageDate: {
    fontSize: 14,
    color: "#5D6D7E",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  writingPageContent: {
    backgroundColor: "rgba(248,250,255,0.8)",
    borderRadius: 20,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
  },
  writingMessageBlock: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.1)",
  },
  writingMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  writingMessageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingMessageTime: {
    fontSize: 14,
    color: "#5D6D7E",
    marginLeft: "auto",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  writingMessageText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2C3E50",
    letterSpacing: -0.2,
  },
  writingAiMessageText: {
    color: "#5D6D7E",
    fontStyle: "italic",
  },
});

export default DiaryView;


