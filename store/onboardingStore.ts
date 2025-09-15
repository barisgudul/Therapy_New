// store/onboardingStore.ts

import { create } from "zustand";

export enum AppMode {
  Primer = "Primer",
  GuestFlow = "GuestFlow",
  InstantReport = "InstantReport",
  SoftWall = "SoftWall",
  Register = "Register",
  Summary = "Summary",
  Home = "Home",
  Recall = "Recall",
}

export type Answer = { step: number; question: string; answer: string };

interface OnboardingState {
  nickname: string;
  currentStep: number;
  setNickname: (nickname: string) => void;
  resetOnboarding: () => void;

  // yeni alanlar ve aksiyonlar
  isGuest: boolean;
  mode: AppMode;
  firstLaunchSeen: boolean;
  trialExpiresAt: number | null; // ms
  recallEligibleAt: number | null; // ms
  answersArray: Answer[]; // GERÇEĞİN TEK KAYNAĞI BU

  setMode: (m: AppMode) => void;
  setGuest: (g: boolean) => void;
  setFirstLaunchSeen: () => void;
  setTrial: (msFromNow: number) => void;
  setRecallAt: (msFromNow: number) => void;
  setAnswer: (step: number, q: string, a: string) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  nickname: "",
  currentStep: 1,

  // yeni defaults
  isGuest: true,
  mode: AppMode.Primer,
  firstLaunchSeen: false,
  trialExpiresAt: null,
  recallEligibleAt: null,
  answersArray: [],

  setNickname: (nickname) => set({ nickname }),
  resetOnboarding: () =>
    set({
      nickname: "",
      currentStep: 1,
      isGuest: true,
      mode: AppMode.Primer,
      trialExpiresAt: null,
      recallEligibleAt: null,
      answersArray: [],
    }),

  // yeni aksiyonlar
  setMode: (m) => set({ mode: m }),
  setGuest: (g) => set({ isGuest: g }),
  setFirstLaunchSeen: () => set({ firstLaunchSeen: true }),
  setTrial: (ms) => set({ trialExpiresAt: Date.now() + ms }),
  setRecallAt: (ms) => set({ recallEligibleAt: Date.now() + ms }),
  setAnswer: (step, question, answer) => {
    set((state) => {
      const existingAnswerIndex = state.answersArray.findIndex((x) =>
        x.step === step
      );
      const newAnswers = [...state.answersArray];
      if (existingAnswerIndex > -1) {
        newAnswers[existingAnswerIndex] = { step, question, answer };
      } else {
        newAnswers.push({ step, question, answer });
      }
      return {
        answersArray: newAnswers.sort((a, b) => a.step - b.step),
      };
    });
  },
}));

// Eğer bir yerde obje formatına ihtiyaç duyarsan, bu selector'ı kullan.
export const useOnboardingAnswersObject = () => {
  return useOnboardingStore((state) =>
    state.answersArray.reduce((acc, curr) => {
      acc[curr.question] = curr.answer;
      return acc;
    }, {} as Record<string, string>)
  );
};
