// store/onboardingStore.ts

import { create } from 'zustand';

interface OnboardingState {
  answers: Record<string, string>;
  currentStep: number;
  setAnswer: (step: number, question: string, answer: string) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: {},
  currentStep: 1,
  setAnswer: (step, question, answer) =>
    set((state) => ({
      answers: { ...state.answers, [question]: answer },
      currentStep: step,
    })),
  resetOnboarding: () => set({ answers: {}, currentStep: 1 }),
})); 