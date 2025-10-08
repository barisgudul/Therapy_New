// app/(auth)/__tests__/analysis.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import Analysis from '../analysis';

// Mock'lar
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));
jest.mock('../../../utils/i18n', () => ({
  __esModule: true,
  default: {
    language: 'tr',
  },
  language: 'tr',
}));
jest.mock('../../../utils/pdfGenerator', () => ({
  generatePdf: jest.fn(),
}));
jest.mock('../../../context/Auth');
jest.mock('../../../store/onboardingStore');
jest.mock('../../../components/ProcessingScreen', () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => {
    const { Text } = require('react-native');
    return <Text>{text}</Text>;
  },
}));
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
      softText: '#999',
    },
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
  },
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Animated = { View };
  return {
    __esModule: true,
    default: Animated,
    FadeInUp: {
      delay: () => ({
        duration: () => ({
          springify: () => ({
            damping: () => ({}),
          }),
        }),
      }),
    },
  };
});

describe('Analysis', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockUseOnboardingStore = jest.mocked(require('../../../store/onboardingStore').useOnboardingStore);
  const mockGeneratePdf = jest.mocked(require('../../../utils/pdfGenerator').generatePdf);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);
  const mockToast = jest.mocked(require('react-native-toast-message').default);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        user_metadata: {
          nickname: 'Test User',
        },
      },
    });

    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: {
          pattern: 'Test pattern',
          reframe: 'Test reframe',
          potential: 'Test potential',
          first_step: 'Test first step',
          micro_habit: 'Test micro habit',
          success_metric: 'Test success metric',
          affirmation: 'Test affirmation',
          plan_7d: 'Test plan 7d',
        },
        setOnboardingInsight: jest.fn(),
        answersArray: [
          { answer: 'Answer 1' },
          { answer: 'Answer 2' },
          { answer: 'Answer 3' },
        ],
        nickname: 'Test User',
        analysisUnlocked: true,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    mockGeneratePdf.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('component render edilmelidir', () => {
    render(<Analysis />);
    
    expect(screen.getByText('analysis.title_emphasis')).toBeTruthy();
  });

  it('analysisUnlocked false ise ProcessingScreen gösterilmelidir', () => {
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: null,
        setOnboardingInsight: jest.fn(),
        answersArray: [],
        nickname: '',
        analysisUnlocked: false,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    render(<Analysis />);
    
    expect(screen.getByText('analysis.processing_text')).toBeTruthy();
  });

  it('insight kartları gösterilmelidir', () => {
    render(<Analysis />);
    
    expect(screen.getByText('analysis.sections.pattern')).toBeTruthy();
    expect(screen.getByText('analysis.sections.potential')).toBeTruthy();
    expect(screen.getByText('analysis.sections.first_step')).toBeTruthy();
  });

  it('devam butonuna tıklandığında onboarding sıfırlanmalıdır', () => {
    const mockReset = jest.fn();
    
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: {
          pattern: 'Test',
          potential: 'Test',
          first_step: 'Test',
        },
        setOnboardingInsight: jest.fn(),
        answersArray: [],
        nickname: '',
        analysisUnlocked: true,
        setAnalysisUnlocked: jest.fn(),
        reset: mockReset,
      };
      return selector(state);
    });

    render(<Analysis />);
    
    const continueButton = screen.getByText('analysis.cta.continue');
    fireEvent.press(continueButton);

    expect(mockReset).toHaveBeenCalled();
  });

  it('devam butonuna tıklandığında ana sayfaya yönlendirilmelidir', () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    });

    render(<Analysis />);
    
    const continueButton = screen.getByText('analysis.cta.continue');
    fireEvent.press(continueButton);

    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  it('PDF export butonuna tıklandığında generatePdf çağrılmalıdır', async () => {
    mockGeneratePdf.mockResolvedValue(undefined);

    render(<Analysis />);
    
    const exportButton = screen.getByText('analysis.cta.export_pdf');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(mockGeneratePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: 'Test pattern',
          potential: 'Test potential',
        }),
        'Test User'
      );
    });
  });

  it('PDF oluşturulurken butonlar disabled olmalıdır', async () => {
    mockGeneratePdf.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    render(<Analysis />);
    
    const exportButton = screen.getByText('analysis.cta.export_pdf');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Rapor Hazırlanıyor...')).toBeTruthy();
    });
  });

  it('insight yoksa gerekli veriler eksik mesajı gösterilmelidir', () => {
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: null,
        setOnboardingInsight: jest.fn(),
        answersArray: [],
        nickname: '',
        analysisUnlocked: true,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    render(<Analysis />);
    
    expect(screen.getByText('analysis.not_found')).toBeTruthy();
  });

  it('minimum 2 saniye bekletilmelidir', () => {
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: {
          pattern: 'Test',
        },
        setOnboardingInsight: jest.fn(),
        answersArray: [],
        nickname: '',
        analysisUnlocked: false,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    render(<Analysis />);
    
    // 2 saniye geçmeden önce ProcessingScreen gösterilmeli
    expect(screen.getByText('analysis.processing_text')).toBeTruthy();
    
    // 2 saniye sonra ve insight varsa normal ekran gösterilmeli
    jest.advanceTimersByTime(2000);
  });

  it('insight oluşturulduğunda supabase function invoke çağrılmalıdır', async () => {
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: null,
        setOnboardingInsight: jest.fn(),
        answersArray: [
          { answer: 'Answer 1' },
          { answer: 'Answer 2' },
          { answer: 'Answer 3' },
        ],
        nickname: 'Test User',
        analysisUnlocked: false,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        pattern: 'Generated pattern',
        potential: 'Generated potential',
      },
      error: null,
    });

    render(<Analysis />);

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'generate-onboarding-insight',
        {
          body: {
            answer1: 'Answer 1',
            answer2: 'Answer 2',
            answer3: 'Answer 3',
            language: 'tr',
            nickname: 'Test User',
          },
        }
      );
    });
  });

  it('insight oluşturma başarısız olduğunda toast gösterilmelidir', async () => {
    mockUseOnboardingStore.mockImplementation((selector) => {
      const state = {
        onboardingInsight: null,
        setOnboardingInsight: jest.fn(),
        answersArray: [
          { answer: 'A1' },
          { answer: 'A2' },
          { answer: 'A3' },
        ],
        nickname: 'Test',
        analysisUnlocked: false,
        setAnalysisUnlocked: jest.fn(),
        reset: jest.fn(),
      };
      return selector(state);
    });

    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Function error' },
    });

    render(<Analysis />);

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Analiz oluşturulamadı.',
        text2: 'Lütfen tekrar dene.',
      });
    });
  });

  it('PDF export başarısız olduğunda hata loglanmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGeneratePdf.mockRejectedValue(new Error('PDF generation failed'));

    render(<Analysis />);
    
    const exportButton = screen.getByText('analysis.cta.export_pdf');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'handleExportPdf içinde hata:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<Analysis />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<Analysis />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
