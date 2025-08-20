// app/(app)/diary.tsx - NİHAİ TEMİZ HALİ
import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { useDiary } from "../../hooks/useDiary";
import { DiaryList } from "../../components/diary/DiaryList";
import { DiaryView } from "../../components/diary/DiaryView";
import { WritingMode } from "../../components/diary/WritingMode";
import ErrorBoundary from 'react-native-error-boundary';
import { ErrorFallbackUI } from '../../components/shared/ErrorFallbackUI';
import { useAuth } from "../../context/Auth";

export default function DiaryScreen() {
  const router = useRouter();
  const { state, handlers } = useDiary();
  const { user } = useAuth();
  const userName = user?.user_metadata?.nickname ?? "Sen";

  const errorHandler = (error: Error, stackTrace: string) => {
    console.error("ErrorBoundary yakaladı:", error, stackTrace);
    // Sentry.captureException(error);
  };

  const renderContent = () => {
    if (state.mode === "view") {
      return (
        <DiaryView
          selectedDiary={state.selectedDiary}
          onBack={handlers.exitView}
          onDelete={handlers.deleteDiary}
        />
      );
    }

    if (state.mode === "write") {
      return (
        <WritingMode
          messages={state.messages}
          isLoading={state.isSubmitting}
          currentQuestions={state.currentQuestions}
          isConversationDone={state.isConversationDone}
          isModalVisible={state.isModalVisible}
          currentInput={state.currentInput}
          activeQuestion={state.activeQuestion}
          userName={userName}
          onSelectQuestion={handlers.selectQuestion}
          onSaveDiary={handlers.saveDiary}
          onOpenModal={handlers.openModal}
          onCloseModal={handlers.closeModal}
          onChangeInput={handlers.changeInput}
          onSubmit={handlers.submitAnswer}
        />
      );
    }

    return (
      <View style={styles.container}>
        <DiaryList
          isLoading={state.isLoadingDiaries}
          diaryEvents={state.diaryEvents}
          onViewDiary={handlers.viewDiary}
          onNewDiary={handlers.startNewDiary}
        />
      </View>
    );
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallbackUI} onError={errorHandler}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
        {renderContent()}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
