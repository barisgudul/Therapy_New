// app/(onboarding)/step4.tsx
import { useRouter } from 'expo-router/';
import React from 'react';
import { logEvent } from '../../services/api.service';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingStep } from './_components/OnboardingStep';

export default function Step4Screen() {
    const router = useRouter();
    const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);

    const QUESTION = "Kendinle ilgili en çok neyi takdir ediyorsun ve en çok neyi geliştirmek istersin?";

    const handleFinish = async (answer: string) => {
        setOnboardingAnswer(4, QUESTION, answer);
        const allAnswers = useOnboardingStore.getState().answers;

        await logEvent({
            type: 'onboarding_completed',
            data: { answers: allAnswers },
        });

        router.push('/(onboarding)/summary');
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