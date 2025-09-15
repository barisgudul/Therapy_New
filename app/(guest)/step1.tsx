// app/(guest)/step1.tsx
import { useRouter } from "expo-router";
import React from "react";
import OnboardingStep from "../../components/OnboardingStep";
import { useOnboardingStore } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Step1() {
  const router = useRouter();
  const setAnswerArray = useOnboardingStore((s) => s.setAnswerArray);
  const QUESTION = "Bugün zihinsel enerjin nasıl geçti? Kısaca yaz.";

  const next = (answer: string) => {
    setAnswerArray(1, QUESTION, answer);
    logEvent({ type: "chip_select", data: { step: 1 } });
    router.push("/(guest)/step2");
  };

  return (
    <OnboardingStep
      step={1}
      totalSteps={3}
      question={QUESTION}
      questionDetails="2–3 kelime yeter."
      icon="flash-outline"
      onNextPress={next}
      minChars={6}
    />
  );
}
