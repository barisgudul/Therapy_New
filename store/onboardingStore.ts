// store/onboardingStore.ts

import { create } from 'zustand';

interface OnboardingState {
  answers: Record<string, string>;
  nickname: string; // Kullanıcının register'da girdiği nickname
  currentStep: number;
  setAnswer: (step: number, question: string, answer: string) => void;
  setNickname: (nickname: string) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: {},
  nickname: '',
  currentStep: 1,
  setAnswer: (step, question, answer) =>
    set((state) => ({
      answers: { ...state.answers, [question]: answer },
      currentStep: step,
    })),
  setNickname: (nickname) => set({ nickname }),
  resetOnboarding: () => set({ answers: {}, nickname: '', currentStep: 1 }),
})); 