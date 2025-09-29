// hooks/__tests__/useSubscription.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSubscription,
  useSubscriptionPlans,
  useUsageStats,
  useFeatureAccess,
  useUpdateSubscription,
} from '../useSubscription';
import {
  getAllPlans,
  getCurrentSubscription,
  getUsageStats,
  updateUserPlan,
  type SubscriptionPlan,
  type UsageStats,
} from '../../services/subscription.service';

//----- MOCKS -----
jest.mock('../../services/subscription.service', () => ({
  getAllPlans: jest.fn(),
  getCurrentSubscription: jest.fn(),
  getUsageStats: jest.fn(),
  updateUserPlan: jest.fn(),
}));

//----- TEST KURULUMU -----
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockedGetAllPlans = getAllPlans as jest.Mock;
const mockedGetCurrentSubscription = getCurrentSubscription as jest.Mock;
const mockedGetUsageStats = getUsageStats as jest.Mock;
const mockedUpdateUserPlan = updateUserPlan as jest.Mock;

// Shared mock data
const mockUsageStats: UsageStats = {
  text_sessions: {
    can_use: true,
    used_count: 1,
    limit_count: 10,
    period: 'month',
  },
  voice_minutes: {
    can_use: true,
    used_count: 5,
    limit_count: 60,
    period: 'month',
  },
  dream_analysis: {
    can_use: false,
    used_count: 0,
    limit_count: 3,
    period: 'month',
  },
  ai_reports: {
    can_use: true,
    used_count: 2,
    limit_count: 5,
    period: 'month',
  },
  diary_write: {
    can_use: false,
    used_count: 10,
    limit_count: 10,
    period: 'month',
  },
  daily_reflection: {
    can_use: true,
    used_count: 2,
    limit_count: 5,
    period: 'month',
  },
};

describe('useSubscription Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentSubscription.mockReset();
    mockedGetUsageStats.mockReset();
    mockedGetAllPlans.mockReset();
    mockedUpdateUserPlan.mockReset();
    // QueryClient cache'ini temizle
    queryClient.clear();
  });

  it('should return free plan when no subscription', async () => {
    mockedGetCurrentSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBe(null);
    expect(result.current.planName).toBe('Free');
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should return premium plan correctly', async () => {
    const mockSubscription = {
      id: 'sub-1',
      name: 'Premium',
      status: 'active',
    };

    mockedGetCurrentSubscription.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.planName).toBe('Premium');
    expect(result.current.isPremium).toBe(true);
  });

  it('should handle subscription fetch error', async () => {
    const mockError = new Error('Fetch failed');
    mockedGetCurrentSubscription.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBeUndefined();
    expect(result.current.planName).toBe('Free');
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('should handle loading state', () => {
    mockedGetCurrentSubscription.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.planName).toBe('Free');
    expect(result.current.isPremium).toBe(false);
  });
});

describe('useSubscriptionPlans Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAllPlans.mockReset();
    mockedGetCurrentSubscription.mockReset();
    mockedGetUsageStats.mockReset();
    mockedUpdateUserPlan.mockReset();
    queryClient.clear();
  });

  it('should fetch all plans successfully', async () => {
    const mockPlans: SubscriptionPlan[] = [
      {
        id: 'plan-1',
        name: 'Free',
        price: 0,
      },
      {
        id: 'plan-2',
        name: 'Premium',
        price: 9.99,
      },
    ];

    mockedGetAllPlans.mockResolvedValue(mockPlans);

    const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPlans);
    expect(result.current.error).toBe(null);
  });

  it('should handle plans fetch error', async () => {
    const mockError = new Error('Plans fetch failed');
    mockedGetAllPlans.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(mockError);
  });
});

describe('useUsageStats Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUsageStats.mockReset();
    mockedGetCurrentSubscription.mockReset();
    mockedGetAllPlans.mockReset();
    mockedUpdateUserPlan.mockReset();
    queryClient.clear();
  });

  it('should fetch usage stats successfully', async () => {
    mockedGetUsageStats.mockResolvedValue(mockUsageStats);

    const { result } = renderHook(() => useUsageStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsageStats);
    expect(result.current.error).toBe(null);
  });

  it('should handle usage stats fetch error', async () => {
    const mockError = new Error('Usage stats fetch failed');
    mockedGetUsageStats.mockRejectedValue(mockError);

    const { result } = renderHook(() => useUsageStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(mockError);
  });

  it('should return null when no usage stats', async () => {
    mockedGetUsageStats.mockResolvedValue(null);

    const { result } = renderHook(() => useUsageStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useFeatureAccess Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUsageStats.mockReset();
    mockedGetCurrentSubscription.mockReset();
    mockedGetAllPlans.mockReset();
    mockedUpdateUserPlan.mockReset();
    queryClient.clear();
  });

  it('should return feature access from usage stats', async () => {
    mockedGetUsageStats.mockResolvedValue(mockUsageStats);

    const { result } = renderHook(() => useFeatureAccess('daily_reflection'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.can_use).toBe(true);
    expect(result.current.used_count).toBe(2);
    expect(result.current.limit_count).toBe(5);
    expect(result.current.period).toBe('month');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return default values when no usage stats', async () => {
    mockedGetUsageStats.mockResolvedValue(null);

    const { result } = renderHook(() => useFeatureAccess('daily_reflection'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.can_use).toBe(false);
    expect(result.current.used_count).toBe(0);
    expect(result.current.limit_count).toBe(0);
    expect(result.current.period).toBe('month');
  });

  it('should return default values for non-existent feature', async () => {
    mockedGetUsageStats.mockResolvedValue(mockUsageStats);

    // mockUsageStats içinde olmayan bir özellik kullan
    const { result } = renderHook(() => useFeatureAccess('non_existent_feature' as any), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Şimdi doğru çalışacak
    expect(result.current.can_use).toBe(false);
    expect(result.current.used_count).toBe(0);
    expect(result.current.limit_count).toBe(0);
  });

  it('should handle loading state', () => {
    mockedGetUsageStats.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFeatureAccess('daily_reflection'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.can_use).toBe(false);
  });
});

describe('useUpdateSubscription Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateUserPlan.mockReset();
    mockedGetCurrentSubscription.mockReset();
    mockedGetUsageStats.mockReset();
    mockedGetAllPlans.mockReset();
    queryClient.clear();
  });

  it('should update subscription successfully', async () => {
    const newPlan = 'Premium';
    mockedUpdateUserPlan.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateSubscription(), { wrapper });

    await act(async () => {
      result.current.mutate(newPlan);
    });

    expect(mockedUpdateUserPlan).toHaveBeenCalledWith(newPlan);

    // Mutation başarılı olmalı
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle update subscription error', async () => {
    const mockError = new Error('Update failed');
    mockedUpdateUserPlan.mockRejectedValue(mockError);

    const { result } = renderHook(() => useUpdateSubscription(), { wrapper });

    await act(async () => {
      result.current.mutate('Premium');
    });

    expect(mockedUpdateUserPlan).toHaveBeenCalledWith('Premium');

    // Mutation hata vermeli
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle multiple plan updates', async () => {
    mockedUpdateUserPlan.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateSubscription(), { wrapper });

    // İlk update
    await act(async () => {
      result.current.mutate('Premium');
    });

    expect(mockedUpdateUserPlan).toHaveBeenCalledTimes(1);
    expect(mockedUpdateUserPlan).toHaveBeenCalledWith('Premium');

    // İkinci update
    await act(async () => {
      result.current.mutate('Free');
    });

    expect(mockedUpdateUserPlan).toHaveBeenCalledTimes(2);
    expect(mockedUpdateUserPlan).toHaveBeenLastCalledWith('Free');
  });
});
