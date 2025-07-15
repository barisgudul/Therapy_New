// app/(onboarding)/step3.tsx
import { useRouter } from 'expo-router/';
import React from 'react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingStep } from './_components/OnboardingStep';

export default function Step3Screen() {
    const router = useRouter();
    const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);
    
    const QUESTION = "Seni gerçekten ne mutlu eder? Tüm sorumluluklardan arındığın bir günde yapacağın ilk 3 şey ne olurdu?";

    const handleNext = (answer: string) => {
        setOnboardingAnswer(3, QUESTION, answer);
        router.push('/(onboarding)/step4');
    };
  
    return (
        <OnboardingStep 
            step={3} 
            totalSteps={4}
            question={QUESTION}
            icon="sparkles-outline"
            onNextPress={handleNext}
        />
    );
} 