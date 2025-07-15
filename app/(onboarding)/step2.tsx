// app/(onboarding)/step2.tsx
import { useRouter } from 'expo-router/';
import React from 'react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingStep } from './_components/OnboardingStep';

export default function Step2Screen() {
    const router = useRouter();
    const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);
    
    const QUESTION = "Hayatında gerçekten neyi başarmak veya değiştirmek istersin? En büyük hayalin nedir?";

    const handleNext = (answer: string) => {
        setOnboardingAnswer(2, QUESTION, answer);
        router.push('/(onboarding)/step3');
    };

    return (
        <OnboardingStep 
            step={2} 
            totalSteps={4}
            question={QUESTION}
            icon="rocket-outline"
            onNextPress={handleNext}
        />
    );
} 