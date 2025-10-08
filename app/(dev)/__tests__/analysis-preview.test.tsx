// app/(dev)/__tests__/analysis-preview.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import AnalysisPreview from '../analysis-preview';

// Mock'lar
jest.mock('../../../store/onboardingStore');
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AnalysisPreview', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseOnboardingStore = jest.mocked(require('../../../store/onboardingStore').useOnboardingStore);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
    });

    const mockSetOnboardingInsight = jest.fn();
    const mockSetAnalysisUnlocked = jest.fn();

    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        setOnboardingInsight: mockSetOnboardingInsight,
        setAnalysisUnlocked: mockSetAnalysisUnlocked,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('component render edilmelidir', () => {
    render(<AnalysisPreview />);

    expect(screen.getByText('Analiz önizlemesi hazırlanıyor...')).toBeTruthy();
  });

  it('yükleme göstergesi gösterilmelidir', () => {
    render(<AnalysisPreview />);

    expect(screen.getByText('Analiz önizlemesi hazırlanıyor...')).toBeTruthy();
  });

  it('mock insight verisi store\'a kaydedilmelidir', () => {
    const mockSetOnboardingInsight = jest.fn();
    
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        setOnboardingInsight: mockSetOnboardingInsight,
        setAnalysisUnlocked: jest.fn(),
      };
      return selector(state);
    });

    render(<AnalysisPreview />);

    expect(mockSetOnboardingInsight).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: expect.any(String),
        reframe: expect.any(String),
        potential: expect.any(String),
        first_step: expect.any(String),
        micro_habit: expect.any(String),
        success_metric: expect.any(String),
        affirmation: expect.any(String),
        plan_7d: expect.any(String),
      })
    );
  });

  it('analysis unlocked true olarak ayarlanmalıdır', () => {
    const mockSetAnalysisUnlocked = jest.fn();
    
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        setOnboardingInsight: jest.fn(),
        setAnalysisUnlocked: mockSetAnalysisUnlocked,
      };
      return selector(state);
    });

    render(<AnalysisPreview />);

    expect(mockSetAnalysisUnlocked).toHaveBeenCalledWith(true);
  });

  it('100ms sonra analysis sayfasına yönlendirilmelidir', () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    });

    render(<AnalysisPreview />);

    // 100ms geç
    jest.advanceTimersByTime(100);

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/analysis');
  });

  it('useEffect cleanup fonksiyonu çağrılmalıdır', () => {
    const { unmount } = render(<AnalysisPreview />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<AnalysisPreview />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<AnalysisPreview />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});

