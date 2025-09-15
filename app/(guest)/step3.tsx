// app/(guest)/step3.tsx
import { useRouter } from "expo-router/";
import React from "react";
import OnboardingStep from "../../components/OnboardingStep";
import { useOnboardingStore, AppMode } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Step3() {
  const router = useRouter();
  const setAnswerArray = useOnboardingStore((s) => s.setAnswerArray);
  const setMode = useOnboardingStore((s) => s.setMode);
  const setTrial = useOnboardingStore((s) => s.setTrial);

  const QUESTION = "Bu hafta küçük ama iyi hissettirecek bir adım ne olurdu?";

  const finish = (answer: string) => {
    setAnswerArray(3, QUESTION, answer);
    logEvent({ type: "guest_start", data: {} }).catch(() => {});
    setTrial(90_000);
    setMode(AppMode.InstantReport); // mod etiketi kalabilir, yönlendirme farklı
    router.replace("/mood-reveal");
  };

  return (
    <OnboardingStep
      step={3}
      totalSteps={3}
      question={QUESTION}
      questionDetails="Hemen şimdi yapabileceğin kadar küçük."
      icon="star-outline"
      onNextPress={finish}
      isLastStep
      minChars={6}
    />
  );
}
