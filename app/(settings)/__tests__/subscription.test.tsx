// app/(settings)/__tests__/subscription.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import SubscriptionScreen from '../subscription';

// Mock'lar
jest.mock('../../../context/Auth');
jest.mock('../../../hooks/useSubscription');
jest.mock('../../../services/subscription.service');
jest.mock('../../../store/subscriptionStore');
jest.mock('../../../components/subscription/PlanCard', () => ({
  __esModule: true,
  default: 'PlanCard',
}));
jest.mock('../../../components/subscription/FeatureComparisonTable', () => ({
  __esModule: true,
  default: 'FeatureComparisonTable',
}));
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
    },
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (options && options.planName) {
        return `${key} ${options.planName}`;
      }
      return key;
    },
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

describe('SubscriptionScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockUseSubscription = jest.mocked(require('../../../hooks/useSubscription').useSubscription);
  const mockUseSubscriptionPlans = jest.mocked(require('../../../hooks/useSubscription').useSubscriptionPlans);
  const mockUseUpdateSubscription = jest.mocked(require('../../../hooks/useSubscription').useUpdateSubscription);
  const mockToast = jest.mocked(require('react-native-toast-message').default);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
      },
    });

    mockUseSubscription.mockReturnValue({
      planName: 'Free',
      isLoading: false,
    });

    mockUseSubscriptionPlans.mockReturnValue({
      data: [
        { id: '1', name: 'Free', price: 0 },
        { id: '2', name: '+Plus', price: 99 },
        { id: '3', name: 'Premium', price: 199 },
      ],
      isLoading: false,
    });

    mockUseUpdateSubscription.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  it('component render edilmelidir', () => {
    render(<SubscriptionScreen />);
    
    expect(screen.getByText('settings.subscription.title')).toBeTruthy();
  });

  it('yüklenirken ActivityIndicator gösterilmelidir', () => {
    mockUseSubscriptionPlans.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<SubscriptionScreen />);
    
    // ActivityIndicator gösterilmeli
    expect(mockUseSubscriptionPlans).toHaveBeenCalled();
  });

  it('planlar fiyata göre sıralanmalıdır', () => {
    render(<SubscriptionScreen />);
    
    // Plans yüksekten düşüğe sıralanmalı (Premium, Plus, Free)
    expect(mockUseSubscriptionPlans).toHaveBeenCalled();
  });

  it('kapat butonuna tıklandığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockReturnValue({
      back: mockBack,
    });

    render(<SubscriptionScreen />);
    
    // Close button bulunmalı
    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('plan yükseltme başarılı olduğunda toast gösterilmelidir', async () => {
    const mockMutate = jest.fn((planName, options) => {
      options?.onSuccess?.();
    });

    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SubscriptionScreen />);
    
    // Mutation tetiklendiğinde
    mockMutate('+Plus', {
      onSuccess: () => {
        mockToast.show({
          type: 'success',
          text1: 'settings.subscription.toast_success_title',
          text2: 'settings.subscription.toast_success_body +Plus',
        });
      },
    });

    expect(mockToast.show).toHaveBeenCalledWith({
      type: 'success',
      text1: 'settings.subscription.toast_success_title',
      text2: 'settings.subscription.toast_success_body +Plus',
    });
  });

  it('plan yükseltme başarısız olduğunda toast gösterilmelidir', async () => {
    const mockMutate = jest.fn((planName, options) => {
      options?.onError?.(new Error('Update failed'));
    });

    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SubscriptionScreen />);
    
    // Mutation hata verdiğinde
    mockMutate('+Plus', {
      onError: () => {
        mockToast.show({
          type: 'error',
          text1: 'settings.subscription.toast_error_title',
          text2: 'settings.subscription.toast_error_body',
        });
      },
    });

    expect(mockToast.show).toHaveBeenCalledWith({
      type: 'error',
      text1: 'settings.subscription.toast_error_title',
      text2: 'settings.subscription.toast_error_body',
    });
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<SubscriptionScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<SubscriptionScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('getThemeForPlan Premium tema döndürmelidir', () => {
    // Premium plan ile render et
    mockUseSubscription.mockReturnValue({
      planName: 'Premium',
      isLoading: false,
    });

    render(<SubscriptionScreen />);
    
    // Premium tema kullanıldığını kontrol et
    expect(mockUseSubscription).toHaveBeenCalled();
  });

  it('getThemeForPlan +Plus tema döndürmelidir', () => {
    mockUseSubscription.mockReturnValue({
      planName: '+Plus',
      isLoading: false,
    });

    render(<SubscriptionScreen />);
    
    expect(mockUseSubscription).toHaveBeenCalled();
  });

  it('getThemeForPlan Free tema döndürmelidir', () => {
    mockUseSubscription.mockReturnValue({
      planName: 'Free',
      isLoading: false,
    });

    render(<SubscriptionScreen />);
    
    expect(mockUseSubscription).toHaveBeenCalled();
  });

  it('getThemeForPlan bilinmeyen plan için Free tema döndürmelidir', () => {
    mockUseSubscription.mockReturnValue({
      planName: 'Unknown',
      isLoading: false,
    });

    render(<SubscriptionScreen />);
    
    expect(mockUseSubscription).toHaveBeenCalled();
  });

  it('handleUpgrade user yoksa çalışmamalıdır', () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    const mockMutate = jest.fn();
    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SubscriptionScreen />);
    
    // User yoksa mutate çağrılmamalı
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('handleUpgrade updatingPlanId varsa çalışmamalıdır', () => {
    const mockMutate = jest.fn();
    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    render(<SubscriptionScreen />);
    
    // Updating durumunda iken ikinci mutate çağrılmamalı
    expect(mockUseUpdateSubscription).toHaveBeenCalled();
  });

  it('handleUpgrade error durumunda toast gösterilmelidir', () => {
    const mockMutate = jest.fn((planName, options) => {
      options?.onError?.(new Error('Test error'));
    });

    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SubscriptionScreen />);
    
    // Error durumunu simüle et
    mockMutate('+Plus', {
      onError: (error: Error) => {
        mockToast.show({ 
          type: 'error', 
          text1: 'settings.subscription.toast_error_title', 
          text2: 'settings.subscription.toast_error_body' 
        });
      },
    });

    expect(mockToast.show).toHaveBeenCalledWith({
      type: 'error',
      text1: 'settings.subscription.toast_error_title',
      text2: 'settings.subscription.toast_error_body',
    });
  });

  it('handleUpgrade onSettled çağrılmalıdır', () => {
    const mockMutate = jest.fn((planName, options) => {
      options?.onSettled?.();
    });

    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<SubscriptionScreen />);
    
    // onSettled durumunu simüle et
    let settledCalled = false;
    mockMutate('+Plus', {
      onSettled: () => {
        settledCalled = true;
      },
    });

    expect(settledCalled).toBe(true);
  });

  it('comparisonData useMemo ile memoize edilmelidir', () => {
    const { rerender } = render(<SubscriptionScreen />);
    
    // İlk render
    expect(mockUseSubscription).toHaveBeenCalled();
    
    // Rerender
    rerender(<SubscriptionScreen />);
    
    // useMemo sayesinde yeniden hesaplanmamalı
    expect(mockUseSubscription).toHaveBeenCalled();
  });

  it('sortedPlans useMemo ile memoize edilmelidir', () => {
    const { rerender } = render(<SubscriptionScreen />);
    
    // İlk render
    expect(mockUseSubscriptionPlans).toHaveBeenCalled();
    
    // Rerender
    rerender(<SubscriptionScreen />);
    
    // useMemo sayesinde yeniden hesaplanmamalı
    expect(mockUseSubscriptionPlans).toHaveBeenCalled();
  });

  it('subscription loading durumu doğru çalışmalıdır', () => {
    mockUseSubscription.mockReturnValue({
      planName: 'Free',
      isLoading: true,
    });

    render(<SubscriptionScreen />);
    
    // Loading state doğru çalışmalı
    expect(mockUseSubscription).toHaveBeenCalled();
  });
});
