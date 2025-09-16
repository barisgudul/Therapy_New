// app/(auth)/analysis.tsx
import { useRouter } from "expo-router/";
import React from "react";
import ProcessingScreen from "../../components/ProcessingScreen";

export default function Analysis() {
  const router = useRouter();

  // Animasyon bitince ne olacağını tanımla
  const handleAnalysisComplete = () => {
    router.replace("/"); // Artık HomeScreen'e gidiyor
  };

  return (
    <ProcessingScreen
      text="Hesabın oluşturuluyor ve ilk raporun hazırlanıyor..."
      onComplete={handleAnalysisComplete}
    />
  );
}
