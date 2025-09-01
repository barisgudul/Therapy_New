// context/DiaryContext.tsx
import React, { createContext, useContext } from 'react';
import { useDiary } from '../hooks/useDiary';
import type { DiaryAppEvent } from '../services/event.service';

interface DiaryContextType {
  state: {
    mode: 'list' | 'view' | 'write';
    isLoadingDiaries: boolean;
    diaryEvents: DiaryAppEvent[];
    selectedDiary: any;
    userName: string;
    messages: any[];
    isSubmitting: boolean;
    currentQuestions: string[];
    isModalVisible: boolean;
    currentInput: string;
    activeQuestion: string | null;
    isConversationDone: boolean;
  };
  handlers: {
    startNewDiary: () => void;
    viewDiary: (event: DiaryAppEvent) => void;
    exitView: () => void;
    openModal: () => void;
    closeModal: () => void;
    changeInput: (text: string) => void;
    selectQuestion: (question: string) => void;
    submitAnswer: () => void;
    saveDiary: () => void;
    deleteDiary: (id: string) => void;
  };
}

const DiaryContext = createContext<DiaryContextType | null>(null);

export const useDiaryContext = () => {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiaryContext must be used within a DiaryProvider');
  }
  return context;
};

interface DiaryProviderProps {
  children: React.ReactNode;
}

export const DiaryProvider: React.FC<DiaryProviderProps> = ({ children }) => {
  const diaryLogic = useDiary();

  return (
    <DiaryContext.Provider value={diaryLogic}>
      {children}
    </DiaryContext.Provider>
  );
};
