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

type Answer = { step: number; question: string; answer: string };

interface OnboardingState {
  // mevcut alanlar
  answers: Record<string, string>;
  nickname: string; // Kullanıcının register'da girdiği nickname
  currentStep: number;
  setAnswer: (step: number, question: string, answer: string) => void;
  setNickname: (nickname: string) => void;
  resetOnboarding: () => void;

  // yeni alanlar ve aksiyonlar
  isGuest: boolean;
  mode: AppMode;
  firstLaunchSeen: boolean;
  trialExpiresAt: number | null; // ms
  recallEligibleAt: number | null; // ms
  answersArray: Answer[];

  setMode: (m: AppMode) => void;
  setGuest: (g: boolean) => void;
  setFirstLaunchSeen: () => void;
  setTrial: (msFromNow: number) => void;
  setRecallAt: (msFromNow: number) => void;
  setAnswerArray: (step: number, q: string, a: string) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  // mevcut defaults
  answers: {},
  nickname: "",
  currentStep: 1,

  // yeni defaults
  isGuest: true,
  mode: AppMode.Primer,
  firstLaunchSeen: false,
  trialExpiresAt: null,
  recallEligibleAt: null,
  answersArray: [],

  // mevcut aksiyonlar
  setAnswer: (step, question, answer) =>
    set((state) => ({
      answers: { ...state.answers, [question]: answer },
      currentStep: step,
    })),
  setNickname: (nickname) => set({ nickname }),
  resetOnboarding: () =>
    set({
      answers: {},
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
  setAnswerArray: (step, question, answer) => {
    const others = get().answersArray.filter((x) => x.step !== step);
    set({
      answersArray: [...others, { step, question, answer }].sort((a, b) =>
        a.step - b.step
      ),
    });
  },
}));
