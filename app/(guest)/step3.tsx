// app/(guest)/step3.tsx
import { useRouter } from "expo-router/";
import React from "react";
import { useTranslation } from "react-i18next"; // Import et
import OnboardingStep from "../../components/OnboardingStep";
import { useOnboardingStore, AppMode } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Step3() {
  const router = useRouter();
  const { t } = useTranslation(); // Hook'u kullan
  const setAnswer = useOnboardingStore((s) => s.setAnswer);
  const setMode = useOnboardingStore((s) => s.setMode);
  const setTrial = useOnboardingStore((s) => s.setTrial);

  // SABİT METİN YERİNE, ÇEVİRİDEN GELEN SORUYU AL
  const QUESTION = t("onboarding_step3.question");

  const finish = (answer: string) => {
    // Soru metnini loglama ve state için t'den al
    setAnswer(3, QUESTION, answer);
    logEvent({ type: "guest_start", data: {} }).catch(() => {});
    setTrial(90_000);
    setMode(AppMode.InstantReport); // mod etiketi kalabilir, yönlendirme farklı
    router.replace("/mood-reveal");
  };

  return (
    <OnboardingStep
      step={3}
      totalSteps={3}
      questionKey="onboarding_step3" // Artık sadece anahtarı gönderiyoruz
      icon="star-outline"
      onNextPress={finish}
      isLastStep
      minChars={6}
    />
  );
}
