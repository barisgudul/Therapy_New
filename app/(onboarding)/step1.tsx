// app/(onboarding)/step1.tsx
import { useRouter } from 'expo-router/';
import React from 'react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingStep } from './_components/OnboardingStep';

export default function Step1Screen() {
    const router = useRouter();
    const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);

    const QUESTION = "Geçmişte üstesinden geldiğin ve seni daha güçlü yaptığına inandığın bir zorluk neydi?";
    
    const handleNext = (answer: string) => {
        setOnboardingAnswer(1, QUESTION, answer);
        router.push('/(onboarding)/step2');
    };

    return (
        <OnboardingStep 
            step={1} 
            totalSteps={4}
            question={QUESTION}
            icon="medal-outline"
            onNextPress={handleNext}
        />
    );
} 