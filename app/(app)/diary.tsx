// app/(app)/diary.tsx - NİHAİ TEMİZ HALİ
import React from "react";
import { StyleSheet, View } from "react-native";
import { useDiary } from "../../hooks/useDiary";
import { DiaryList } from "../../components/diary/DiaryList";
import { DiaryView } from "../../components/diary/DiaryView";
import { WritingMode } from "../../components/diary/WritingMode";
import ErrorBoundary from 'react-native-error-boundary';
import { ErrorFallbackUI } from '../../components/shared/ErrorFallbackUI';
import { useAuth } from "../../context/Auth";

export default function DiaryScreen() {
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
      {renderContent()}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
