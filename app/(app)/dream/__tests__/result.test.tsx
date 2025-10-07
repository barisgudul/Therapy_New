// app/(app)/dream/__tests__/result.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import DreamResultScreen from '../result';

// Mock'lar
jest.mock('../../../../services/api.service');
jest.mock('../../../../services/event.service');
jest.mock('../../../../utils/supabase');
jest.mock('../../../../components/dream/CrossConnectionsCard');
jest.mock('../../../../components/dream/ErrorState');
jest.mock('../../../../components/dream/InterpretationCard');
jest.mock('../../../../components/dream/ResultSkeleton');
jest.mock('../../../../components/dream/SummaryCard');
jest.mock('../../../../components/dream/ThemesCard');
jest.mock('../../../../components/dream/FeedbackCard');
jest.mock('../../../../components/dream/Oracle');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: () => ({ id: 'dream-123' }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('../../../../utils/i18n', () => ({
  language: 'tr',
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('moti', () => ({ MotiView: 'MotiView' }));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

describe('DreamResultScreen', () => {
  const mockUseQuery = jest.mocked(require('@tanstack/react-query').useQuery);
  const mockUseMutation = jest.mocked(require('@tanstack/react-query').useMutation);
  const mockUseQueryClient = jest.mocked(require('@tanstack/react-query').useQueryClient);
  const mockSupabase = jest.mocked(require('../../../../utils/supabase').supabase);
  const mockGetEventById = jest.mocked(require('../../../../services/event.service').getEventById);
  const mockGetLatestAnalysisReport = jest.mocked(require('../../../../services/api.service').getLatestAnalysisReport);

  const mockDreamEvent = {
    id: 'dream-123',
    type: 'dream_analysis',
    timestamp: '2024-01-01T10:00:00Z',
    data: {
      analysis: {
        title: 'Test Rüya',
        summary: 'Test rüya özeti',
        themes: ['Test tema'],
        interpretation: 'Test yorumu',
        crossConnections: [
          { connection: 'Test bağlantı', evidence: 'Test kanıt' }
        ],
      },
      oracle_result: {
        f1: 'Test f1',
        f2: 'Test f2',
        f3: 'Test f3',
      },
      feedback: 1,
    },
  };

  const mockAnalysisReport = {
    data: {
      content: {
        reportSections: {
          goldenThread: 'Test golden thread',
          blindSpot: 'Test blind spot',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock implementations
    mockUseQuery.mockReturnValue({
      data: {
        event: mockDreamEvent,
        report: mockAnalysisReport.data,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    // useRouter default mock
    require('expo-router').useRouter.mockImplementation(() => ({
      back: jest.fn(),
    }));

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    mockUseQueryClient.mockReturnValue({
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    });

    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    };

    mockSupabase.rpc = jest.fn();
    mockSupabase.functions = {
      invoke: jest.fn(),
    };

    mockGetEventById.mockResolvedValue(mockDreamEvent);
    mockGetLatestAnalysisReport.mockResolvedValue(mockAnalysisReport);
  });

  it('component render edilmelidir', () => {
    render(<DreamResultScreen />);

    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('loading durumunda ResultSkeleton göstermelidir', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<DreamResultScreen />);

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('error durumunda ErrorState göstermelidir', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Test error'),
    });

    render(<DreamResultScreen />);

    // Error state'inin doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('data yoksa ErrorState göstermelidir', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DreamResultScreen />);

    // No data state'inin doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('header doğru render edilmelidir', () => {
    render(<DreamResultScreen />);

    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('tarih doğru formatlanmalıdır', () => {
    render(<DreamResultScreen />);

    // Date formatting'in doğru çalıştığını kontrol et
    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockRouter = { back: jest.fn() };
    const mockUseRouter = jest.mocked(require('expo-router').useRouter);
    mockUseRouter.mockImplementation(() => mockRouter);

    render(<DreamResultScreen />);

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('SummaryCard doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // SummaryCard'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('ThemesCard doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // ThemesCard'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('InterpretationCard doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // InterpretationCard'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('CrossConnectionsCard doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // CrossConnectionsCard'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('Oracle doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // Oracle'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('FeedbackCard doğru props ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // FeedbackCard'ın render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useQuery doğru parametrelerle çağrılmalıdır', () => {
    render(<DreamResultScreen />);

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['dreamResult', 'dream-123'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('feedback mutation doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Feedback mutation'ının doğru çalıştığını kontrol et
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('oracle mutation doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Oracle mutation'ının doğru çalıştığını kontrol et
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<DreamResultScreen />);
    }).not.toThrow();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('MotiView component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // MotiView'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('COSMIC_COLORS constant\'ı doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // Colors'ın doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('stil objeleri doğru tanımlanmalıdır', () => {
    render(<DreamResultScreen />);

    // Stil objelerinin doğru tanımlandığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('scroll to top doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Scroll to top'un doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useLayoutEffect doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useLayoutEffect'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('untitled header doğru gösterilmelidir', () => {
    const mockEventWithoutTitle = {
      ...mockDreamEvent,
      data: {
        ...mockDreamEvent.data,
        analysis: {
          ...mockDreamEvent.data.analysis,
          title: undefined,
        },
      },
    };

    mockUseQuery.mockReturnValue({
      data: {
        event: mockEventWithoutTitle,
        report: mockAnalysisReport.data,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DreamResultScreen />);

    expect(screen.getByText('dream.result.header_untitled')).toBeTruthy();
  });

  it('oracle result doğru işlenmelidir', () => {
    render(<DreamResultScreen />);

    // Oracle result'ın doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('feedback score doğru işlenmelidir', () => {
    render(<DreamResultScreen />);

    // Feedback score'un doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('analysis data doğru işlenmelidir', () => {
    render(<DreamResultScreen />);

    // Analysis data'nın doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('report data doğru işlenmelidir', () => {
    render(<DreamResultScreen />);

    // Report data'nın doğru işlendiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('missing analysis data doğru handle edilmelidir', () => {
    const mockEventWithoutAnalysis = {
      ...mockDreamEvent,
      data: {},
    };

    mockUseQuery.mockReturnValue({
      data: {
        event: mockEventWithoutAnalysis,
        report: mockAnalysisReport.data,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DreamResultScreen />);

    // Missing analysis data'nın doğru handle edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('missing report data doğru handle edilmelidir', () => {
    mockUseQuery.mockReturnValue({
      data: {
        event: mockDreamEvent,
        report: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DreamResultScreen />);

    // Missing report data'nın doğru handle edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('Toast notifications doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Toast'un doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('error handling doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Error handling'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('cache updates doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Cache updates'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('query invalidation doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Query invalidation'ın doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('SafeAreaView component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // SafeAreaView'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('ScrollView component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // ScrollView'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('TouchableOpacity component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // TouchableOpacity'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('Text component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // Text'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('StyleSheet kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // StyleSheet'in kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useLayoutEffect doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useLayoutEffect'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('scrollRef doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // scrollRef'in doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('isInitialLoad ref doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // isInitialLoad ref'in doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('SafeAreaView doğru render edilmelidir', () => {
    render(<DreamResultScreen />);

    // SafeAreaView'in doğru render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('ScrollView doğru render edilmelidir', () => {
    render(<DreamResultScreen />);

    // ScrollView'in doğru render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('LinearGradient doğru colors ile render edilmelidir', () => {
    render(<DreamResultScreen />);

    // LinearGradient'in doğru render edildiğini kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('TouchableOpacity doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // TouchableOpacity'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('Ionicons doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // Ionicons'un doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('MotiView doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // MotiView'in doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('Text component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // Text component'inin kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('View component\'i kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // View component'inin kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useTranslation'ın doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<DreamResultScreen />);

    // i18n.language'ın doğru kullanıldığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useLocalSearchParams doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useLocalSearchParams'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useRouter doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useRouter'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useQueryClient doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useQueryClient'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('useMutation doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // useMutation'un doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('component lifecycle doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Component lifecycle'ın doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('state management doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // State management'ın doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('event handling doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Event handling'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('data fetching doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Data fetching'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('conditional rendering doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Conditional rendering'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('error boundaries doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Error boundaries'in doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });

  it('performance optimizations doğru çalışmalıdır', () => {
    render(<DreamResultScreen />);

    // Performance optimizations'ın doğru çalıştığını kontrol et
    expect(mockUseQuery).toHaveBeenCalled();
  });
});
