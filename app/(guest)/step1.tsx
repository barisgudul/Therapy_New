// app/(guest)/step1.tsx
import { useRouter } from "expo-router/";
import React from "react";
import OnboardingStep from "../../components/OnboardingStep"; // Component'i doğru yerden al
import { useOnboardingStore } from "../../store/onboardingStore";
import { useTranslation } from "react-i18next";

export default function Step1() {
  const router = useRouter();
  const { t } = useTranslation();
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const next = (answer: string) => {
    // Soru metnini loglama ve state için t'den al
    const question = t("onboarding_step1.question");
    setAnswer(1, question, answer);
    router.push("/(guest)/step2");
  };

  return (
    <OnboardingStep
      step={1}
      totalSteps={3}
      questionKey="onboarding_step1" // Artık sadece anahtar yeterli
      icon="flash-outline"
      onNextPress={next}
      minChars={3} // Minimum karakter kontrolü ekleyebiliriz
    />
  );
}
