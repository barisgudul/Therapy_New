// app/(guest)/step2.tsx
import { useRouter } from "expo-router";
import React from "react";
import OnboardingStep from "../../components/OnboardingStep";
import { useOnboardingStore } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Step2() {
  const router = useRouter();
  const setAnswerArray = useOnboardingStore((s) => s.setAnswerArray);
  const QUESTION = "Son günlerde seni en çok yoran şey neydi?";

  const next = (answer: string) => {
    setAnswerArray(2, QUESTION, answer);
    logEvent({ type: "chip_select", data: { step: 2 } });
    router.push("/(guest)/step3");
  };

  return (
    <OnboardingStep
      step={2}
      totalSteps={3}
      question={QUESTION}
      questionDetails="İki cümle yazman yeterli."
      icon="cloud-outline"
      onNextPress={next}
      minChars={6}
    />
  );
}
