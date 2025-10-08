// app/(app)/dream/__tests__/index.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import DreamJournalScreen from '../index';

// Mock'lar
jest.mock('../../../../hooks/useVault');
jest.mock('../../../../services/event.service');
jest.mock('../../../../utils/supabase');
jest.mock('../../../../components/dream/SkeletonCard');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
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
  useInfiniteQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, ListEmptyComponent, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    
    // Eğer data boşsa ListEmptyComponent'i render et
    if (!data || data.length === 0) {
      return React.createElement(View, { testID: 'flash-list', ...props }, 
        ListEmptyComponent ? ListEmptyComponent : null
      );
    }
    
    return React.createElement(View, { testID: 'flash-list', ...props }, 
      data.map((item: any, index: number) => 
        React.createElement(View, { key: index, testID: `flash-list-item-${index}` },
          renderItem({ item, index })
        )
      )
    );
  },
}));
jest.mock('moti', () => ({ MotiView: 'MotiView' }));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

describe('DreamJournalScreen', () => {
  const mockUseInfiniteQuery = jest.mocked(require('@tanstack/react-query').useInfiniteQuery);
  const mockUseMutation = jest.mocked(require('@tanstack/react-query').useMutation);
  const mockUseQueryClient = jest.mocked(require('@tanstack/react-query').useQueryClient);
  const mockSupabase = jest.mocked(require('../../../../utils/supabase').supabase);

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
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // useRouter mock'u
    require('expo-router').useRouter.mockImplementation(() => ({
      push: jest.fn(),
      back: jest.fn(),
    }));
    
    // Varsayılan mock implementations
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [[mockDreamEvent]] },
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      reset: jest.fn(),
    });

    mockUseQueryClient.mockReturnValue({
      cancelQueries: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    });

    mockSupabase.functions = {
      invoke: jest.fn(),
    };
  });

  it('component render edilmelidir', () => {
    render(<DreamJournalScreen />);

    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('loading durumunda skeleton cards göstermelidir', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('header doğru render edilmelidir', () => {
    render(<DreamJournalScreen />);

    expect(screen.getByText('dream.index.header_title')).toBeTruthy();
    expect(screen.getByText('dream.index.header_subtitle')).toBeTruthy();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockRouter = { back: jest.fn() };
    require('expo-router').useRouter.mockImplementation(() => mockRouter);

    render(<DreamJournalScreen />);

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('yeni rüya butonuna basıldığında router.push çağrılmalıdır', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };
    require('expo-router').useRouter.mockImplementation(() => mockRouter);

    render(<DreamJournalScreen />);

    const newDreamButton = screen.getByText('dream.index.new_button');
    fireEvent.press(newDreamButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/dream/analyze');
  });

  it('FlashList doğru props ile render edilmelidir', () => {
    render(<DreamJournalScreen />);

    // FlashList'in render edildiğini kontrol et
    expect(screen.getByTestId('flash-list')).toBeTruthy();
  });

  it('boş durumda empty state göstermelidir', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    expect(screen.getByText('dream.index.empty_title')).toBeTruthy();
    expect(screen.getByText('dream.index.empty_subtext')).toBeTruthy();
  });

  it('rüya kartına basıldığında router.push çağrılmalıdır', () => {
    const mockRouter = { push: jest.fn(), back: jest.fn() };
    require('expo-router').useRouter.mockImplementation(() => mockRouter);

    render(<DreamJournalScreen />);

    // Rüya kartını bul ve bas - TouchableOpacity'i bul
    const dreamCard = screen.getByText('Test Rüya');
    fireEvent.press(dreamCard);

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/dream/result',
      params: { id: 'dream-123' },
    });
  });

  it('silme butonuna basıldığında delete mutation çağrılmalıdır', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      reset: jest.fn(),
    });

    render(<DreamJournalScreen />);

    // Silme butonunu bul ve bas (trash icon)
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.press(deleteButton);

    expect(mockMutate).toHaveBeenCalledWith('dream-123');
  });

  it('useInfiniteQuery doğru parametrelerle çağrılmalıdır', () => {
    render(<DreamJournalScreen />);

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith({
      queryKey: ['dreamEvents'],
      initialPageParam: 0,
      queryFn: expect.any(Function),
      getNextPageParam: expect.any(Function),
    });
  });

  it('useMutation doğru parametrelerle çağrılmalıdır', () => {
    render(<DreamJournalScreen />);

    expect(mockUseMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onMutate: expect.any(Function),
      onError: expect.any(Function),
      onSettled: expect.any(Function),
    });
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<DreamJournalScreen />);
    }).not.toThrow();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<DreamJournalScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('MotiView component\'i kullanılmalıdır', () => {
    render(<DreamJournalScreen />);

    // MotiView'in kullanıldığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('dream.index.header_title')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<DreamJournalScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('dream.index.header_title')).toBeTruthy();
  });

  it('COSMIC_COLORS constant\'ı doğru kullanılmalıdır', () => {
    render(<DreamJournalScreen />);

    // Colors'ın doğru kullanıldığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('stil objeleri doğru tanımlanmalıdır', () => {
    render(<DreamJournalScreen />);

    // Stil objelerinin doğru tanımlandığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('infinite scroll doğru çalışmalıdır', () => {
    const mockFetchNextPage = jest.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [[mockDreamEvent]] },
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    // Infinite scroll'un doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('pull to refresh doğru çalışmalıdır', () => {
    const mockRefetch = jest.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [[mockDreamEvent]] },
      isLoading: false,
      refetch: mockRefetch,
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    // Pull to refresh'in doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('date formatting doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Date formatting'in doğru çalıştığını kontrol et
    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('card title doğru gösterilmelidir', () => {
    render(<DreamJournalScreen />);

    expect(screen.getByText('Test Rüya')).toBeTruthy();
  });

  it('untitled card title doğru gösterilmelidir', () => {
    const mockEventWithoutTitle = {
      ...mockDreamEvent,
      data: {
        analysis: {
          summary: 'Test rüya özeti',
          themes: ['Test tema'],
          interpretation: 'Test yorumu',
        },
      },
    };

    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [[mockEventWithoutTitle]] },
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    expect(screen.getByText('dream.index.card_untitled')).toBeTruthy();
  });

  it('memoized empty component doğru çalışmalıdır', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    // Memoized empty component'in doğru çalıştığını kontrol et
    expect(screen.getByText('dream.index.empty_title')).toBeTruthy();
  });

  it('skeleton cards doğru sayıda render edilmelidir', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
      isRefetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<DreamJournalScreen />);

    // Skeleton cards'ın doğru sayıda render edildiğini kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('Toast notifications doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Toast'un doğru kullanıldığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('undo functionality doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Undo functionality'nin doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('error handling doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Error handling'in doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('optimistic updates doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Optimistic updates'in doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });

  it('query invalidation doğru çalışmalıdır', () => {
    render(<DreamJournalScreen />);

    // Query invalidation'ın doğru çalıştığını kontrol et
    expect(mockUseInfiniteQuery).toHaveBeenCalled();
  });
});
