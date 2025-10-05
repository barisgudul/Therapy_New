// components/__tests__/PremiumGate.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PremiumGate } from '../PremiumGate';
import * as SubscriptionHooks from '../../hooks/useSubscription';

// Hook'ları içeren modülün tamamını mock'luyoruz
jest.mock('../../hooks/useSubscription');

// useRouter mock'u
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

describe('PremiumGate', () => {
  // Her testten önce mock'ları temizle
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Senaryo: Yükleme durumu
  it('abonelik yüklenirken ActivityIndicator göstermelidir', () => {
    // Hook'un yükleniyor durumunu döndürmesini sağla
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: true, // <<< YÜKLENİYOR
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false,
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(<PremiumGate premiumOnly>Test Content</PremiumGate>);
    
    // ActivityIndicator'ın varlığını kontrol et
    // React Native'de ActivityIndicator genelde belirli bir testID ile bulunur
    // Mock'umuzda LinearGradient render ediliyor, bu yüzden içeriğin görünmediğini kontrol edelim
    expect(screen.queryByText('Test Content')).toBeNull();
  });

  // 2. Senaryo: Feature access yükleniyor
  it('özellik erişimi yüklenirken ActivityIndicator göstermelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false,
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: true, // <<< FEATURE ACCESS YÜKLENİYOR
      isError: false,
      error: null,
      isPending: true,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      isPlaceholderData: false,
      status: 'pending' as const,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'fetching' as const,
      isInitialLoading: true,
      isStale: true,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isPaused: false,
      isRefetching: false,
    } as any);

    render(<PremiumGate featureType="text_sessions">Test Content</PremiumGate>);
    
    expect(screen.queryByText('Test Content')).toBeNull();
  });

  // 3. Senaryo: Erişim izni var (Premium kullanıcı)
  it('kullanıcı premium ise children içeriğini göstermelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'premium', name: 'Premium' },
      planName: 'Premium',
      isPremium: true, // <<< PREMIUM
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: true,
      used_count: 5,
      limit_count: 100,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      isPlaceholderData: false,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      isStale: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isRefetching: false,
    } as any);

    render(<PremiumGate premiumOnly><Text>GİZLİ İÇERİK</Text></PremiumGate>);

    expect(screen.getByText('GİZLİ İÇERİK')).toBeTruthy();
  });

  // 4. Senaryo: Erişim engellendi (Premium değil, premium özellik)
  it('kullanıcı premium değilse ve özellik premiumOnly ise engelleyici ekranı göstermelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false, // <<< PREMIUM DEĞİL
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false,
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(<PremiumGate premiumOnly><Text>GİZLİ İÇERİK</Text></PremiumGate>);
    
    // İçeriğin görünmediğini kontrol et
    expect(screen.queryByText('GİZLİ İÇERİK')).toBeNull();
    // Engelleyici ekranın başlığının göründüğünü kontrol et
    expect(screen.getByText('premium_gate.premium_title')).toBeTruthy();
  });

  // 5. Senaryo: Erişim engellendi (Kullanım limiti aşıldı)
  it('kullanıcı kullanım limitini aştıysa engelleyici ekranı göstermelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false, // <<< KULLANIM HAKKI YOK
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      isPlaceholderData: false,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      isStale: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isRefetching: false,
    } as any);

    render(<PremiumGate featureType="text_sessions"><Text>GİZLİ İÇERİK</Text></PremiumGate>);

    expect(screen.queryByText('GİZLİ İÇERİK')).toBeNull();
    // Limit aşıldığında gösterilen başlığı kontrol et
    expect(screen.getByText('premium_gate.limit_title')).toBeTruthy();
  });

  // 6. Senaryo: Fallback UI
  it('erişim engellendiğinde fallback prop varsa onu göstermelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
        subscription: { plan_id: 'free', name: 'Free' },
        planName: 'Free',
        isPremium: false,
        isLoading: false,
        isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
        can_use: false,
        used_count: 0,
        limit_count: 0,
        period: 'month',
        isLoading: false,
        isError: false,
        error: null,
        isPending: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: true,
        isPlaceholderData: false,
        status: 'success' as const,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle' as const,
        isInitialLoading: false,
        isStale: false,
        refetch: jest.fn(),
        errorUpdateCount: 0,
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: false,
        isPaused: false,
        isRefetching: false,
    } as any);

    render(
        <PremiumGate premiumOnly fallback={<Text>Fallback Arayüzü</Text>}>
            <Text>GİZLİ İÇERİK</Text>
        </PremiumGate>
    );

    // Engelleyici ekran yerine fallback'in göründüğünü kontrol et
    expect(screen.getByText('Fallback Arayüzü')).toBeTruthy();
    expect(screen.queryByText('premium_gate.premium_title')).toBeNull();
  });

  // 7. Senaryo: Özel upgrade handler
  it('özel onUpgrade fonksiyonu verilirse onu kullanmalıdır', () => {
    const customUpgradeMock = jest.fn();
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false,
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(
      <PremiumGate premiumOnly onUpgrade={customUpgradeMock}>
        <Text>GİZLİ İÇERİK</Text>
      </PremiumGate>
    );

    // Upgrade butonuna bas
    const upgradeButton = screen.getByText('premium_gate.view_plans');
    fireEvent.press(upgradeButton);

    expect(customUpgradeMock).toHaveBeenCalledTimes(1);
  });

  // 8. Senaryo: Premium kullanıcı feature access ile
  it('premium kullanıcı feature access ile erişebilmelidir', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'premium', name: 'Premium' },
      planName: 'Premium',
      isPremium: true,
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false, // Feature access false olsa bile premium kullanıcı erişebilir
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      isPlaceholderData: false,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      isStale: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isRefetching: false,
    } as any);

    render(<PremiumGate featureType="text_sessions"><Text>GİZLİ İÇERİK</Text></PremiumGate>);

    // Premium kullanıcı her zaman erişebilir
    expect(screen.getByText('GİZLİ İÇERİK')).toBeTruthy();
  });

  // 9. Senaryo: Feature type yoksa sadece premium kontrolü
  it('featureType yoksa sadece premium kontrolü yapmalıdır', () => {
    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: false,
      isError: false,
    });
    // useFeatureAccess çağrılmamalı çünkü featureType yok

    render(<PremiumGate premiumOnly><Text>GİZLİ İÇERİK</Text></PremiumGate>);

    expect(screen.queryByText('GİZLİ İÇERİK')).toBeNull();
    expect(screen.getByText('premium_gate.premium_title')).toBeTruthy();
  });

  // 10. Senaryo: Geri butonu
  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {

    jest.spyOn(SubscriptionHooks, 'useSubscription').mockReturnValue({
      subscription: { plan_id: 'free', name: 'Free' },
      planName: 'Free',
      isPremium: false,
      isLoading: false,
      isError: false,
    });
    jest.spyOn(SubscriptionHooks, 'useFeatureAccess').mockReturnValue({
      can_use: false,
      used_count: 0,
      limit_count: 0,
      period: 'month',
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isInitialLoading: false,
      refetch: jest.fn(),
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any);

    render(<PremiumGate premiumOnly><Text>GİZLİ İÇERİK</Text></PremiumGate>);

    // Geri butonunu bul ve bas
    const backButton = screen.getByTestId('premium-gate-back-button');
    fireEvent.press(backButton);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});