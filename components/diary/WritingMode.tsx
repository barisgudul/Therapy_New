// components/diary/WritingMode.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

export interface Message { text: string; isUser: boolean; timestamp: number; isQuestionContext?: boolean }

interface WritingModeProps {
  messages: Message[];
  isLoading: boolean;
  currentQuestions: string[];
  isConversationDone: boolean;
  isModalVisible: boolean;
  currentInput: string;
  activeQuestion: string | null;
  userName: string;
  onSelectQuestion: (question: string) => void;
  onSaveDiary: () => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onChangeInput: (v: string) => void;
  onSubmit: () => void;
}

export const WritingMode: React.FC<WritingModeProps> = ({
  messages,
  isLoading,
  currentQuestions,
  isConversationDone,
  isModalVisible,
  currentInput,
  activeQuestion,
  userName,
  onSelectQuestion,
  onSaveDiary,
  onOpenModal,
  onCloseModal,
  onChangeInput,
  onSubmit,
}) => {
  return (
    <LinearGradient colors={["#F4F6FF", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <View style={styles.topBar}></View>

      <Text style={styles.headerTitle}>Yeni Günlük</Text>

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.diaryContainer}>
            <View style={styles.writingPageSection}>
              <View style={styles.writingPageHeader}>
                <View style={styles.writingPageInfo}>
                  <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                  <Text style={styles.writingPageTitle}>Günlük Sayfası</Text>
                </View>
                <Text style={styles.writingPageDate}>{new Date().toLocaleDateString("tr-TR")}</Text>
              </View>
              <View style={styles.writingPageContent}>
                {messages.map((message, index) => (
                  <View key={index} style={styles.writingMessageBlock}>
                    <View style={styles.writingMessageHeader}>
                      <Ionicons name={message.isUser ? "person-circle" : "sparkles"} size={20} color={Colors.light.tint} />
                      <Text style={styles.writingMessageTitle}>{message.isUser ? userName : "AI Asistan"}</Text>
                      <Text style={styles.writingMessageTime}>
                        {new Date(message.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.writingMessageText,
                        !message.isUser && styles.writingAiMessageText,
                        message.isQuestionContext && styles.writingQuestionContextText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                ))}

                {isLoading && (
                  <View style={styles.writingAnalyzingContainer}>
                    <ActivityIndicator color={Colors.light.tint} />
                    <Text style={styles.writingAnalyzingText}>Düşüncelerin analiz ediliyor...</Text>
                  </View>
                )}

                {messages.length === 0 && (
                  <TouchableOpacity style={styles.writingDiaryInputPlaceholder} onPress={onOpenModal}>
                    <Text style={styles.writingDiaryInputPlaceholderText}>Düşüncelerini yazmaya başla...</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {messages.length > 0 && isConversationDone && (
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={onSaveDiary} activeOpacity={0.85}>
                <LinearGradient colors={["#F8FAFF", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButtonGradient}>
                  <View style={styles.saveButtonContent}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={Colors.light.tint} />
                    <Text style={styles.saveButtonText}>Günlüğü Tamamla ve Kaydet</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.diaryContainer}>
            {currentQuestions.length > 0 && !isConversationDone && (
              <View style={styles.writingQuestionsContainer}>
                <View style={styles.writingQuestionsHeader}>
                  <Ionicons name="sparkles-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.writingQuestionsTitle}>Nasıl devam edelim?</Text>
                </View>
                {currentQuestions.map((question, index) => (
                  <TouchableOpacity key={index} style={styles.writingQuestionButton} onPress={() => onSelectQuestion(question)}>
                    <Text style={styles.writingQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} animationType="fade" transparent onRequestClose={onCloseModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                  <Text style={styles.modalTitle}>Yeni Günlük</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={onCloseModal}>
                  <Ionicons name="close" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
              </View>

              {activeQuestion && (
                <View style={styles.modalQuestionContainer}>
                  <Text style={styles.modalQuestionText}>{activeQuestion}</Text>
                </View>
              )}

              <View style={styles.modalBody}>
                <TextInput
                  style={[styles.modalInput]}
                  placeholder={activeQuestion ? "Cevabını buraya yaz..." : "Düşüncelerini yazmaya başla..."}
                  value={currentInput}
                  onChangeText={onChangeInput}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                  returnKeyType="done"
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalButton, (!currentInput.trim() || isConversationDone) && styles.buttonDisabled]} onPress={onSubmit} disabled={!currentInput.trim() || isConversationDone} activeOpacity={0.85}>
                  <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonText}>{messages.length === 0 ? "Günlüğü Başlat" : "Cevabı Gönder"}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontSize: 24, fontWeight: "600", color: Colors.light.tint, letterSpacing: -0.5, zIndex: 20, paddingVertical: 8, backgroundColor: "rgba(249,250,251,0.95)" },
  content: { flex: 1, paddingHorizontal: 24, marginTop: 30 },
  scrollView: { flex: 1 },
  diaryContainer: { paddingVertical: 24 },
  writingPageSection: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 12, marginBottom: 8, shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: "rgba(93,161,217,0.15)" },
  writingPageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottomWidth: 1, borderBottomColor: "rgba(93,161,217,0.1)", paddingBottom: 20 },
  writingPageInfo: { flexDirection: "row", alignItems: "center" },
  writingPageTitle: { fontSize: 20, fontWeight: "600", color: Colors.light.tint, marginLeft: 12, letterSpacing: -0.3 },
  writingPageDate: { fontSize: 14, color: "#5D6D7E", fontWeight: "500", letterSpacing: -0.2 },
  writingPageContent: { backgroundColor: "rgba(248,250,255,0.8)", borderRadius: 20, padding: 24, minHeight: 300, borderWidth: 1, borderColor: "rgba(93,161,217,0.1)" },
  writingMessageBlock: { marginBottom: 28, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: "rgba(93,161,217,0.1)" },
  writingMessageHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  writingMessageTitle: { fontSize: 16, fontWeight: "600", color: Colors.light.tint, marginLeft: 12, letterSpacing: -0.3 },
  writingMessageTime: { fontSize: 14, color: "#5D6D7E", marginLeft: "auto", fontWeight: "500", letterSpacing: -0.2 },
  writingMessageText: { fontSize: 16, lineHeight: 26, color: "#2C3E50", letterSpacing: -0.2 },
  writingQuestionContextText: { fontStyle: 'italic', color: '#5D6D7E', backgroundColor: 'rgba(93, 161, 217, 0.05)', padding: 12, borderRadius: 8, overflow: 'hidden' },
  writingAiMessageText: { color: "#5D6D7E", fontStyle: "italic" },
  writingAnalyzingContainer: { alignItems: "center", padding: 24 },
  writingAnalyzingText: { marginTop: 16, color: "#5D6D7E", fontSize: 14, fontWeight: "500", letterSpacing: -0.2 },
  writingDiaryInputPlaceholder: { minHeight: 100, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(93,161,217,0.2)", borderRadius: 16, borderStyle: "dashed", backgroundColor: "rgba(255,255,255,0.5)" },
  writingDiaryInputPlaceholderText: { color: "#9CA3AF", fontSize: 16, letterSpacing: -0.2 },
  saveButtonContainer: { paddingHorizontal: 24, marginVertical: 8 },
  saveButton: { width: "100%", height: 56, borderRadius: 28, overflow: "hidden", shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16, borderWidth: 1.5, borderColor: "rgba(93,161,217,0.3)" },
  saveButtonGradient: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  saveButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveButtonText: { color: Colors.light.tint, fontSize: 18, fontWeight: "600", letterSpacing: -0.3 },
  writingQuestionsContainer: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 12, marginTop: 8, shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: "rgba(93,161,217,0.15)" },
  writingQuestionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(93,161,217,0.1)' },
  writingQuestionsTitle: { fontSize: 18, fontWeight: "600", color: Colors.light.tint, marginLeft: 10, letterSpacing: -0.3 },
  writingQuestionButton: { backgroundColor: "rgba(248,250,255,0.8)", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(93,161,217,0.1)" },
  writingQuestionText: { fontSize: 15, color: "#2C3E50", fontWeight: "500", lineHeight: 22, letterSpacing: -0.2 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxWidth: 500, borderRadius: 24, overflow: "hidden", shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  modalGradient: { padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "rgba(93,161,217,0.1)" },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center" },
  modalTitle: { fontSize: 24, fontWeight: "600", color: Colors.light.tint, marginLeft: 12, letterSpacing: -0.5 },
  modalQuestionContainer: { padding: 16, backgroundColor: 'rgba(93, 161, 217, 0.05)', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(93, 161, 217, 0.1)' },
  modalQuestionText: { fontSize: 15, color: '#2C3E50', fontWeight: '500', lineHeight: 22, fontStyle: 'italic' },
  modalCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: "rgba(93,161,217,0.2)" },
  modalBody: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 16, padding: 20, minHeight: 300, borderWidth: 1, borderColor: "rgba(93,161,217,0.15)", shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  modalInput: { flex: 1, fontSize: 16, color: "#2C3E50", lineHeight: 24, textAlignVertical: "top", minHeight: 260 },
  modalFooter: { flexDirection: "row", justifyContent: "center", marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(93,161,217,0.1)" },
  modalButton: { width: 180, height: 56, borderRadius: 28, overflow: "hidden", shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16, borderWidth: 1.5, borderColor: "rgba(93,161,217,0.3)", transform: [{ scale: 1.05 }] },
  modalButtonGradient: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  modalButtonText: { color: Colors.light.tint, fontSize: 18, fontWeight: "600", letterSpacing: -0.3 },
  buttonDisabled: { opacity: 0.5 },
});

export default WritingMode;


