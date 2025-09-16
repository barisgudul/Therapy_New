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
  const setRecallAt = useOnboardingStore((s) => s.setRecallAt);

  // SABİT METİN YERİNE, ÇEVİRİDEN GELEN SORUYU AL
  const QUESTION = t("onboarding_step3.question");

  const finish = (answer: string) => {
    // Soru metnini loglama ve state için t'den al
    setAnswer(3, QUESTION, answer);
    logEvent({ type: "guest_start", data: {} }).catch(() => {});
    setTrial(90_000);
    // Kullanıcı onboarding'i tamamladığında, 24 saat sonra recall sayfası gösterilsin
    // setRecallAt(24 * 60 * 60 * 1000); // ESKİ SATIRI YORUMA AL - 24 saat
    setRecallAt(Date.now() + (5 * 1000)); // YENİ SATIR: Şimdiki zamandan 5 saniye sonrası
    setMode(AppMode.InstantReport); // mod etiketi kalabilir, yönlendirme farklı
    router.replace("/(guest)/softwall");
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
