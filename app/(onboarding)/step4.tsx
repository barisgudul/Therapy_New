// app/(onboarding)/step4.tsx
import { useRouter } from 'expo-router/';
import React from 'react';
import OnboardingStep from '../../components/OnboardingStep';
import { useAuth } from '../../context/Auth';
import { logEvent } from '../../services/api.service';
import { processUserMessage } from '../../services/orchestration.service';
import { useOnboardingStore } from '../../store/onboardingStore';

export default function Step4Screen() {
    const router = useRouter();
    const { user } = useAuth();
    const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);

    const QUESTION = "Kendinle ilgili en çok neyi takdir ediyorsun ve en çok neyi geliştirmek istersin?";

    const handleFinish = async (answer: string) => {
        setOnboardingAnswer(4, QUESTION, answer);
        const allAnswers = useOnboardingStore.getState().answers;

        try {
            // 1. Event'i kaydet
            await logEvent({
                type: 'onboarding_completed',
                data: { answers: allAnswers },
            });

            // 2. AI analizi için orchestration service'e gönder
            if (user?.id) {
                console.log('🧠 [ONBOARDING] AI analizi başlatılıyor...');
                await processUserMessage(user.id, {
                    type: 'onboarding_completed',
                    data: { answers: allAnswers },
                });
                console.log('✅ [ONBOARDING] AI analizi tamamlandı');
            }

            router.push('/(onboarding)/summary');
        } catch (error) {
            console.error('❌ [ONBOARDING] Analiz hatası:', error);
            // Hata durumunda yine de summary'e git
            router.push('/(onboarding)/summary');
        }
    };

    return (
        <OnboardingStep
            step={4}
            totalSteps={4}
            question={QUESTION}
            icon="person-circle-outline"
            onNextPress={handleFinish}
            isLastStep={true}
        />
    );
} 