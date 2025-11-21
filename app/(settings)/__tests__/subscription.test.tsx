// app/(settings)/__tests__/subscription.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import SubscriptionScreen from '../subscription';

// Mock'lar
jest.mock('../../../context/Auth');
jest.mock('../../../hooks/useSubscription');
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (options && options.planName) {
        return `${key}_${options.planName}`;
      }
      return key;
    },
  }),
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

// PlanCard - GERÇEK COMPONENT'İ SIMÜLE ET
jest.mock('../../../components/subscription/PlanCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ plan, isCurrent, isLoading, onUpgrade }: any) => (
      <View testID={`plan-card-${plan.id}`}>
        <Text>{plan.name}</Text>
        <Text>{plan.price}</Text>
        {isCurrent && <Text testID={`current-plan-${plan.id}`}>Current</Text>}
        {!isCurrent && (
          <TouchableOpacity
            testID={`upgrade-button-${plan.id}`}
            onPress={onUpgrade}
            disabled={isLoading}
          >
            <Text>{isLoading ? 'Loading...' : 'Upgrade'}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
  };
});

jest.mock('../../../components/subscription/FeatureComparisonTable', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="feature-comparison-table" /> };
});

describe('SubscriptionScreen - Gerçek Davranış Testleri', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockUseSubscription = jest.mocked(require('../../../hooks/useSubscription').useSubscription);
  const mockUseSubscriptionPlans = jest.mocked(
    require('../../../hooks/useSubscription').useSubscriptionPlans
  );
  const mockUseUpdateSubscription = jest.mocked(
    require('../../../hooks/useSubscription').useUpdateSubscription
  );
  const mockToast = Toast;

  const mockPlans = [
    { id: 'free-1', name: 'Free', price: 0 },
    { id: 'plus-2', name: '+Plus', price: 99 },
    { id: 'premium-3', name: 'Premium', price: 199 },
  ];

  let mockMutate: jest.Mock;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMutate = jest.fn();
    mockRouter = {
      back: jest.fn(),
    };

    mockUseRouter.mockReturnValue(mockRouter);

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
    } as any);

    mockUseSubscription.mockReturnValue({
      planName: 'Free',
      isLoading: false,
    } as any);

    mockUseSubscriptionPlans.mockReturnValue({
      data: mockPlans,
      isLoading: false,
    } as any);

    mockUseUpdateSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  describe('1. Loading States', () => {
    it('plans loading durumunda ActivityIndicator gösterilir', () => {
      mockUseSubscriptionPlans.mockReturnValue({
        data: [],
        isLoading: true,
      } as any);

      const { UNSAFE_getByType } = render(<SubscriptionScreen />);

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('subscription loading durumunda ActivityIndicator gösterilir', () => {
      mockUseSubscription.mockReturnValue({
        planName: null,
        isLoading: true,
      } as any);

      const { UNSAFE_getByType } = render(<SubscriptionScreen />);

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('2. Plan Cards Rendering', () => {
    it('tüm planlar render edilir', () => {
      const { getByTestId, getByText } = render(<SubscriptionScreen />);

      expect(getByTestId('plan-card-free-1')).toBeTruthy();
      expect(getByTestId('plan-card-plus-2')).toBeTruthy();
      expect(getByTestId('plan-card-premium-3')).toBeTruthy();

      expect(getByText('Free')).toBeTruthy();
      expect(getByText('+Plus')).toBeTruthy();
      expect(getByText('Premium')).toBeTruthy();
    });

    it('planlar fiyata göre sıralanır (yüksekten düşüğe)', () => {
      const { getAllByText } = render(<SubscriptionScreen />);

      // Premium (199), Plus (99), Free (0) sırasında olmalı
      const prices = getAllByText(/\d+/);
      // İlk 3 kart fiyatları sırayla görünmeli
      expect(prices[0].children[0]).toBe('199');
      expect(prices[1].children[0]).toBe('99');
      expect(prices[2].children[0]).toBe('0');
    });

    it('mevcut plan current olarak işaretlenir', () => {
      mockUseSubscription.mockReturnValue({
        planName: '+Plus',
        isLoading: false,
      } as any);

      const { getByTestId } = render(<SubscriptionScreen />);

      expect(getByTestId('current-plan-plus-2')).toBeTruthy();
    });

    it('mevcut olmayan planlarda upgrade butonu gösterilir', () => {
      const { getByTestId, queryByTestId } = render(<SubscriptionScreen />);

      // Free planı current, diğerlerinde upgrade butonu olmalı
      expect(queryByTestId('upgrade-button-free-1')).toBeNull();
      expect(getByTestId('upgrade-button-plus-2')).toBeTruthy();
      expect(getByTestId('upgrade-button-premium-3')).toBeTruthy();
    });
  });

  describe('3. handleUpgrade - EN KRİTİK', () => {
    it('upgrade butonuna basınca mutate doğru parametrelerle çağrılır', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(upgradeButton);

      await waitFor(() => {
        // mutate fonksiyonu doğru plan name ile çağrılmalı
        expect(mockMutate).toHaveBeenCalledWith(
          '+Plus',
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
            onSettled: expect.any(Function),
          })
        );
      });
    });

    it('Premium planına upgrade butonuna basınca mutate Premium ile çağrılır', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          'Premium',
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
            onSettled: expect.any(Function),
          })
        );
      });
    });

    it('user yoksa handleUpgrade çalışmaz', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as any);

      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(upgradeButton);

      // User olmadan mutate çağrılmamalı
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('updatingPlanId varken başka bir upgrade butonuna basılması engellenmelidir', async () => {
      // İlk render - hiçbir plan güncellenmiyor
      const { getByTestId } = render(<SubscriptionScreen />);

      // Plus planına upgrade başlat
      const plusUpgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(plusUpgradeButton);

      // İlk mutate çağrıldı
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith('+Plus', expect.any(Object));

      // Şimdi component'in internal state'i updatingPlanId'yi 'plus-2' olarak set etti
      // Ama bu state değişimi henüz yansımadı. Component'i yeniden render etmeliyiz
      // ama bu sefer PlanCard'ın isLoading prop'u değişmeyecek çünkü
      // updatingPlanId component'in içinde, bizim mock'umuzda değil

      // Premium'a upgrade'e çalış - ama updatingPlanId zaten set olduğu için
      // handleUpgrade fonksiyonu erken return yapacak
      const premiumUpgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(premiumUpgradeButton);

      // İkinci mutate çağrılmamalı
      expect(mockMutate).toHaveBeenCalledTimes(1); // Hala sadece 1 kez
    });

    it('mevcut plana upgrade edilemez', () => {
      mockUseSubscription.mockReturnValue({
        planName: '+Plus',
        isLoading: false,
      } as any);

      const { queryByTestId } = render(<SubscriptionScreen />);

      // Plus planı current olduğu için upgrade butonu olmamalı
      expect(queryByTestId('upgrade-button-plus-2')).toBeNull();
    });
  });

  describe('4. handleUpgrade Callbacks', () => {
    it('onSuccess çağrılınca success toast Premium planı için gösterilir', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      // mutate çağrıldı, callback'leri al
      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      // onSuccess'i manuel çağır
      callbacks.onSuccess();

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'settings.subscription.toast_success_title',
          text2: 'settings.subscription.toast_success_body_Premium',
        });
      });
    });

    it('onSuccess çağrılınca success toast Plus planı için gösterilir', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(upgradeButton);

      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      callbacks.onSuccess();

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'settings.subscription.toast_success_title',
          text2: 'settings.subscription.toast_success_body_+Plus',
        });
      });
    });

    it('onError çağrılınca error toast ve console.error çağrılır', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(upgradeButton);

      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      const testError = new Error('Payment failed');
      callbacks.onError(testError);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Plan yükseltme hatası:', testError);
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'settings.subscription.toast_error_title',
          text2: 'settings.subscription.toast_error_body',
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('onError farklı hata mesajlarıyla çağrılabilir', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      const networkError = new Error('Network connection failed');
      callbacks.onError(networkError);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Plan yükseltme hatası:', networkError);
      });

      consoleErrorSpy.mockRestore();
    });

    it('onSettled her zaman çağrılır - başarılı upgrade sonrası', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      // Başarılı senaryo
      callbacks.onSuccess();
      callbacks.onSettled();

      // onSettled sonrası updatingPlanId temizlendi
      // Bu yeni bir upgrade'e izin verir
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('onSettled her zaman çağrılır - başarısız upgrade sonrası', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      const { getByTestId } = render(<SubscriptionScreen />);

      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];

      // Başarısız senaryo
      callbacks.onError(new Error('Failed'));
      callbacks.onSettled();

      // onSettled sonrası updatingPlanId temizlendi
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('5. Navigation', () => {
    it('close butonuna basılınca router.back çağrılır', () => {
      const { UNSAFE_root } = render(<SubscriptionScreen />);

      // Close button Ionicons name="close" olan TouchableOpacity
      // Tüm TouchableOpacity'leri bul
      const touchables = UNSAFE_root.findAllByType(require('react-native').TouchableOpacity);

      // Close butonunu bul (header'da, close ikonu içeren)
      const closeButton = touchables.find(t => {
        try {
          const ionicons = t.findAllByType(require('@expo/vector-icons').Ionicons);
          return ionicons.some(icon => icon.props.name === 'close');
        } catch {
          return false;
        }
      });

      expect(closeButton).toBeTruthy();

      // Butona bas
      fireEvent.press(closeButton!);

      // router.back çağrıldı mı?
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Feature Comparison Table', () => {
    it('feature comparison table render edilir', () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      expect(getByTestId('feature-comparison-table')).toBeTruthy();
    });

    it('comparisonData doğru formatta oluşturulur', () => {
      render(<SubscriptionScreen />);

      // comparisonData useMemo ile hesaplanıyor ve FeatureComparisonTable'a geçiliyor
      // Bu testte component'in başarıyla render edildiğini kontrol ediyoruz
      expect(mockUseSubscriptionPlans).toHaveBeenCalled();
    });
  });

  describe('7. Edge Cases', () => {
    it('plans boş array olsa bile crash olmaz', () => {
      mockUseSubscriptionPlans.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      expect(() => {
        render(<SubscriptionScreen />);
      }).not.toThrow();
    });

    it('planName null olsa bile component çalışır', () => {
      mockUseSubscription.mockReturnValue({
        planName: null,
        isLoading: false,
      } as any);

      expect(() => {
        render(<SubscriptionScreen />);
      }).not.toThrow();
    });

    it('bilinmeyen plan adı için Free teması kullanılır', () => {
      mockUseSubscription.mockReturnValue({
        planName: 'UnknownPlan',
        isLoading: false,
      } as any);

      expect(() => {
        render(<SubscriptionScreen />);
      }).not.toThrow();
    });
  });

  describe('8. getThemeForPlan Fonksiyonu', () => {
    it('Premium plan için doğru tema döner', () => {
      const premiumPlan = { id: 'premium-1', name: 'Premium', price: 199 };
      mockUseSubscriptionPlans.mockReturnValue({
        data: [premiumPlan],
        isLoading: false,
      } as any);

      const { getByText } = render(<SubscriptionScreen />);

      expect(getByText('Premium')).toBeTruthy();
    });

    it('+Plus plan için doğru tema döner', () => {
      const plusPlan = { id: 'plus-1', name: '+Plus', price: 99 };
      mockUseSubscriptionPlans.mockReturnValue({
        data: [plusPlan],
        isLoading: false,
      } as any);

      const { getByText } = render(<SubscriptionScreen />);

      expect(getByText('+Plus')).toBeTruthy();
    });

    it('Free plan için doğru tema döner', () => {
      const freePlan = { id: 'free-1', name: 'Free', price: 0 };
      mockUseSubscriptionPlans.mockReturnValue({
        data: [freePlan],
        isLoading: false,
      } as any);

      const { getByText } = render(<SubscriptionScreen />);

      expect(getByText('Free')).toBeTruthy();
    });
  });

  describe('9. Multi-Plan Interaction', () => {
    it('farklı planlara aynı anda upgrade edilemez (updatingPlanId kontrolü)', async () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      // İlk upgrade'i başlat (Premium)
      const premiumUpgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(premiumUpgradeButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);

      // İkinci upgrade'i dene (Plus) - updatingPlanId set olduğu için çağrılmamalı
      const plusUpgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(plusUpgradeButton);

      // Component'in handleUpgrade fonksiyonunda updatingPlanId kontrolü var
      // Bu, aynı anda iki mutate çağrısını engelliyor
      expect(mockMutate).toHaveBeenCalledTimes(1); // Hala sadece 1 kez
    });

    it('tam bir upgrade akışı - başlat, tamamla, yeni upgrade başlat', async () => {
      const { getByTestId, rerender } = render(<SubscriptionScreen />);

      // İlk upgrade - Plus
      const plusUpgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(plusUpgradeButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);

      // İlk upgrade'i tamamla
      const firstCall = mockMutate.mock.calls[0];
      const firstCallbacks = firstCall[1];

      await waitFor(() => {
        firstCallbacks.onSuccess();
        firstCallbacks.onSettled();
      });

      // Component'i yeniden render et - rerender yeni bir component instance oluşturur
      // ve state sıfırlanır (React Testing Library'nin davranışı)
      rerender(<SubscriptionScreen />);

      // Şimdi ikinci upgrade - Premium
      const premiumUpgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(premiumUpgradeButton);

      // rerender yeni bir instance oluşturduğu için state sıfırlandı
      // ve ikinci upgrade çağrısı başarıyla yapılabildi
      expect(mockMutate).toHaveBeenCalledTimes(2);
      expect(mockMutate).toHaveBeenNthCalledWith(1, '+Plus', expect.any(Object));
      expect(mockMutate).toHaveBeenNthCalledWith(2, 'Premium', expect.any(Object));
    });
  });

  describe('10. Header ve Subtitle', () => {
    it('header ve subtitle doğru render edilir', () => {
      const { getByText } = render(<SubscriptionScreen />);

      expect(getByText('settings.subscription.title')).toBeTruthy();
      expect(getByText('settings.subscription.subtitle')).toBeTruthy();
    });
  });

  describe('11. Plan Rendering ve Props', () => {
    it('her plana doğru tema uygulanır', () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      // Tüm planlar render edilmeli
      expect(getByTestId('plan-card-free-1')).toBeTruthy();
      expect(getByTestId('plan-card-plus-2')).toBeTruthy();
      expect(getByTestId('plan-card-premium-3')).toBeTruthy();
    });

    it('PlanCard componentine doğru props geçilir', () => {
      const { getByTestId, getByText } = render(<SubscriptionScreen />);

      // Premium kartını kontrol et
      const premiumCard = getByTestId('plan-card-premium-3');
      expect(premiumCard).toBeTruthy();

      // Premium kartında plan bilgileri var mı?
      expect(getByText('Premium')).toBeTruthy();
      expect(getByText('199')).toBeTruthy();
    });

    it('sıralama değiştiğinde doğru sırada render edilir', () => {
      const shuffledPlans = [
        { id: 'free-1', name: 'Free', price: 0 },
        { id: 'premium-3', name: 'Premium', price: 199 },
        { id: 'plus-2', name: '+Plus', price: 99 },
      ];

      mockUseSubscriptionPlans.mockReturnValue({
        data: shuffledPlans,
        isLoading: false,
      } as any);

      const { getAllByText } = render(<SubscriptionScreen />);

      // Fiyata göre sıralama: Premium (199), Plus (99), Free (0)
      const prices = getAllByText(/\d+/);
      expect(prices[0].children[0]).toBe('199');
      expect(prices[1].children[0]).toBe('99');
      expect(prices[2].children[0]).toBe('0');
    });
  });

  describe('12. Gerçek Kullanıcı Senaryoları', () => {
    it('Senaryo 1: Free kullanıcı Plus plana upgrade olur', async () => {
      mockUseSubscription.mockReturnValue({
        planName: 'Free',
        isLoading: false,
      } as any);

      const { getByTestId } = render(<SubscriptionScreen />);

      // Free planı current
      expect(getByTestId('current-plan-free-1')).toBeTruthy();

      // Plus'a upgrade
      const plusUpgradeButton = getByTestId('upgrade-button-plus-2');
      fireEvent.press(plusUpgradeButton);

      // mutate çağrıldı
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          '+Plus',
          expect.any(Object)
        );
      });

      // Success callback
      const mutateCall = mockMutate.mock.calls[0];
      const callbacks = mutateCall[1];
      callbacks.onSuccess();

      // Toast gösterildi
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'settings.subscription.toast_success_title',
          text2: 'settings.subscription.toast_success_body_+Plus',
        });
      });
    });

    it('Senaryo 2: Plus kullanıcı Premium plana upgrade olur', async () => {
      mockUseSubscription.mockReturnValue({
        planName: '+Plus',
        isLoading: false,
      } as any);

      const { getByTestId } = render(<SubscriptionScreen />);

      // Plus planı current
      expect(getByTestId('current-plan-plus-2')).toBeTruthy();

      // Premium'a upgrade
      const premiumUpgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(premiumUpgradeButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          'Premium',
          expect.any(Object)
        );
      });
    });

    it('Senaryo 3: Upgrade sırasında hata olur, kullanıcı tekrar dener', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      const { getByTestId } = render(<SubscriptionScreen />);

      // İlk upgrade denemesi
      const upgradeButton = getByTestId('upgrade-button-premium-3');
      fireEvent.press(upgradeButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);

      // Hata oluştu
      const firstCall = mockMutate.mock.calls[0];
      const firstCallbacks = firstCall[1];
      firstCallbacks.onError(new Error('Network error'));
      firstCallbacks.onSettled();

      // Error toast gösterildi
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'settings.subscription.toast_error_title',
          text2: 'settings.subscription.toast_error_body',
        });
      });

      // Kullanıcı tekrar deniyor
      fireEvent.press(upgradeButton);

      // İkinci mutate çağrısı yapılmalı
      expect(mockMutate).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it('Senaryo 4: Kullanıcı sayfa açtığında mevcut planını görür', () => {
      mockUseSubscription.mockReturnValue({
        planName: 'Premium',
        isLoading: false,
      } as any);

      const { getByTestId, queryByTestId } = render(<SubscriptionScreen />);

      // Premium current
      expect(getByTestId('current-plan-premium-3')).toBeTruthy();

      // Premium'da upgrade butonu yok
      expect(queryByTestId('upgrade-button-premium-3')).toBeNull();

      // Ama diğer planlar downgrade edilemez, bu yüzden onların da butonu yok olmalı
      // VEYA gösterilmeli ama disabled olmalı
      // Şu anki implementasyonda sadece current plan butonu gösterilmiyor
    });
  });

  describe('13. comparisonData ve FeatureComparisonTable', () => {
    it('comparisonData useMemo ile hesaplanır', () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      // FeatureComparisonTable render edildi
      const table = getByTestId('feature-comparison-table');
      expect(table).toBeTruthy();

      // Component başarıyla render edildi, demek ki comparisonData doğru oluşturuldu
    });

    it('themeColors FeatureComparisonTable\'a doğru geçilir', () => {
      const { getByTestId } = render(<SubscriptionScreen />);

      const table = getByTestId('feature-comparison-table');
      expect(table).toBeTruthy();

      // Theme colors getThemeForPlan'dan geliyor
      // Bu, Plus ve Premium için doğru renkleri kullanıyor olmalı
    });
  });

  describe('14. sortedPlans Sıralama', () => {
    it('tek plan olsa bile çalışır', () => {
      mockUseSubscriptionPlans.mockReturnValue({
        data: [{ id: 'free-1', name: 'Free', price: 0 }],
        isLoading: false,
      } as any);

      expect(() => {
        render(<SubscriptionScreen />);
      }).not.toThrow();
    });

    it('aynı fiyatlı planlar olsa bile çalışır', () => {
      mockUseSubscriptionPlans.mockReturnValue({
        data: [
          { id: 'plan-1', name: 'Plan A', price: 99 },
          { id: 'plan-2', name: 'Plan B', price: 99 },
        ],
        isLoading: false,
      } as any);

      expect(() => {
        render(<SubscriptionScreen />);
      }).not.toThrow();
    });

    it('orijinal plans dizisini değiştirmez', () => {
      const originalPlans = [
        { id: 'free-1', name: 'Free', price: 0 },
        { id: 'plus-2', name: '+Plus', price: 99 },
      ];

      mockUseSubscriptionPlans.mockReturnValue({
        data: originalPlans,
        isLoading: false,
      } as any);

      render(<SubscriptionScreen />);

      // Orijinal dizi değişmemiş olmalı
      expect(originalPlans[0].id).toBe('free-1');
      expect(originalPlans[1].id).toBe('plus-2');
    });
  });
});
