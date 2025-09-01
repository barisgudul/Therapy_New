// app/(app)/diary.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { DiaryList } from "../../components/diary/DiaryList";
import { DiaryView } from "../../components/diary/DiaryView";
import { WritingMode } from "../../components/diary/WritingMode";
import ErrorBoundary from 'react-native-error-boundary';
import { ErrorFallbackUI } from '../../components/shared/ErrorFallbackUI';
import { DiaryProvider, useDiaryContext } from '../../context/DiaryContext';

// Asıl işi yapacak olan component
function DiaryFlowController() {
  const { state } = useDiaryContext();

  if (state.mode === "view") {
    return <DiaryView />;
  }

  if (state.mode === "write") {
    return <WritingMode />;
  }

  return <DiaryList />;
}

export default function DiaryScreen() {
  const errorHandler = (error: Error, stackTrace: string) => {
    console.error("ErrorBoundary yakaladı:", error, stackTrace);
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallbackUI} onError={errorHandler}>
      <DiaryProvider>
        {/*
          BU ALAN DEĞİŞTİ:
          Container'dan paddingTop ve header kaldırıldı.
          Artık DiaryFlowController içindeki bileşenler (örn. DiaryList) tüm ekranı kaplayabilir.
        */}
        <View style={styles.container}>
          <DiaryFlowController />
        </View>
      </DiaryProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FF", // Arka plan rengini buraya taşıdık
  },
});
