// app/(guest)/step1.tsx
import { useRouter } from "expo-router/";
import React from "react";
import { useTranslation } from "react-i18next"; // Import et
import OnboardingStep from "../../components/OnboardingStep";
import { useOnboardingStore } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Step1() {
  const router = useRouter();
  const { t } = useTranslation(); // Hook'u kullan
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  // SABİT METİN YERİNE, ÇEVİRİDEN GELEN SORUYU AL
  const QUESTION = t("onboarding_step1.question");

  const next = (answer: string) => {
    // Soru metnini loglama ve state için t'den al
    setAnswer(1, QUESTION, answer);
    logEvent({ type: "chip_select", data: { step: 1 } });
    router.push("/(guest)/step2");
  };

  return (
    <OnboardingStep
      step={1}
      totalSteps={3}
      questionKey="onboarding_step1" // Artık sadece anahtarı gönderiyoruz
      icon="flash-outline"
      onNextPress={next}
      minChars={6}
    />
  );
}
