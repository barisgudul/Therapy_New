// hooks/__tests__/useHomeScreen.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeScreen } from '../useHomeScreen';

// Mock'lar
jest.mock('../useVault');
jest.mock('expo-router/');
jest.mock('@tanstack/react-query');
jest.mock('expo-notifications');
jest.mock('../../utils/supabase');
jest.mock('../../store/onboardingStore');

describe('useHomeScreen - Motor Testi', () => {
  const mockUseVault = jest.mocked(require('../useVault').useVault);
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseQueryClient = jest.mocked(require('@tanstack/react-query').useQueryClient);
  const mockNotifications = jest.mocked(require('expo-notifications'));
  const mockSupabase = jest.mocked(require('../../utils/supabase').supabase);
  const mockUseOnboardingStore = jest.mocked(require('../../store/onboardingStore').useOnboardingStore);

  let mockRouter: any;
  let mockQueryClient: any;
  let mockStoreState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      push: jest.fn(),
    };

    mockQueryClient = {
      invalidateQueries: jest.fn(),
    };

    mockStoreState = {
      onboardingInsight: null,
      setOnboardingInsight: jest.fn(),
    };

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseQueryClient.mockReturnValue(mockQueryClient);
    mockUseOnboardingStore.mockImplementation((selector) => selector(mockStoreState));

    // Notifications mock
    mockNotifications.cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
    mockNotifications.scheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');

    // Supabase mock
    mockSupabase.functions = {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any;

    // Default vault mock
    mockUseVault.mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
  });

  describe('1. Initial State', () => {
    it('hook başlangıç değerleriyle render edilir', () => {
      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.activeModal).toBeNull();
      expect(result.current.isVaultLoading).toBe(false);
      expect(result.current.onboardingInsight).toBeFalsy();
      expect(result.current.dailyMessage).toBe('Bugün için mesajın burada görünecek.');
      expect(result.current.dailyTheme).toBeFalsy();
      expect(result.current.decisionLogId).toBeFalsy();
    });

    it('scaleAnim Animated.Value olarak döner', () => {
      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.scaleAnim).toBeDefined();
      expect(typeof result.current.scaleAnim).toBe('object');
    });
  });

  describe('2. Vault Integration', () => {
    it('vault loading durumunda isVaultLoading true döner', () => {
      mockUseVault.mockReturnValue({
        data: null,
        isLoading: true,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.isVaultLoading).toBe(true);
    });

    it('vault metadata varsa dailyMessage döner', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageContent: 'Test daily message',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.dailyMessage).toBe('Test daily message');
    });

    it('vault onboardingInsight varsa profileInsight\'a set edilir', async () => {
      const mockInsight = { theme: 'test', summary: 'test summary' };

      mockUseVault.mockReturnValue({
        data: {
          onboardingInsight: mockInsight,
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      await waitFor(() => {
        expect(mockStoreState.setOnboardingInsight).toHaveBeenCalledWith(mockInsight);
      });

      expect(result.current.onboardingInsight).toEqual(mockInsight);
    });

    it('store\'da insight varsa vault\'tan yüklenmez', async () => {
      const storeInsight = { theme: 'store', summary: 'from store' };
      const vaultInsight = { theme: 'vault', summary: 'from vault' };

      mockStoreState.onboardingInsight = storeInsight;

      mockUseVault.mockReturnValue({
        data: {
          onboardingInsight: vaultInsight,
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      // Store'daki kullanılmalı
      expect(result.current.onboardingInsight).toEqual(storeInsight);
      expect(mockStoreState.setOnboardingInsight).not.toHaveBeenCalled();
    });
  });

  describe('3. Notification Scheduling', () => {
    it('vault yüklendiğinde bildirimler zamanlanır', async () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {},
        },
        isLoading: false,
      } as any);

      renderHook(() => useHomeScreen());

      await waitFor(() => {
        expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      });

      // Sabah 8 bildirimi
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Günaydın!',
          body: 'Bugün kendine iyi bakmayı unutma.',
          data: { route: '/daily_reflection' },
        },
        trigger: {
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });

      // Akşam 20 bildirimi
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Bugün nasılsın?',
          body: '1 cümleyle kendini ifade etmek ister misin?',
          data: { route: '/daily_reflection' },
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });
    });

    it('vault loading iken bildirimler zamanlanmaz', () => {
      mockUseVault.mockReturnValue({
        data: null,
        isLoading: true,
      } as any);

      renderHook(() => useHomeScreen());

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });
  });

  describe('4. handleDailyPress - Kritik İş Mantığı', () => {
    it('bugün zaten yapılmışsa dailyMessage modalı açar', () => {
      const today = new Date().toISOString().split('T')[0];

      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            lastDailyReflectionDate: today,
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleDailyPress();
      });

      expect(result.current.activeModal).toBe('dailyMessage');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('bugün yapılmamışsa daily_reflection sayfasına yönlendirir', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            lastDailyReflectionDate: yesterday,
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleDailyPress();
      });

      expect(result.current.activeModal).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/daily_reflection');
    });

    it('hiç yapılmamışsa (metadata yok) daily_reflection sayfasına yönlendirir', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {},
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleDailyPress();
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/daily_reflection');
    });
  });

  describe('5. Modal Yönetimi', () => {
    it('handleReportPress report modalını açar', () => {
      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleReportPress();
      });

      expect(result.current.activeModal).toBe('report');
    });

    it('handleOnboardingInsightPress onboardingInsight modalını açar', () => {
      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleOnboardingInsightPress();
      });

      expect(result.current.activeModal).toBe('onboardingInsight');
    });

    it('handleModalClose tüm modalları kapatır', () => {
      const { result } = renderHook(() => useHomeScreen());

      // Önce bir modal aç
      act(() => {
        result.current.handleReportPress();
      });

      expect(result.current.activeModal).toBe('report');

      // Şimdi kapat
      act(() => {
        result.current.handleModalClose();
      });

      expect(result.current.activeModal).toBeNull();
    });
  });

  describe('6. Navigation Actions', () => {
    it('handleSettingsPress settings sayfasına gider', () => {
      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleSettingsPress();
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/settings');
    });

    it('handleNavigateToTherapy dailyTheme ile therapy sayfasına gider', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageTheme: 'anxiety',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      // Önce modal aç
      act(() => {
        result.current.handleReportPress();
      });

      expect(result.current.activeModal).toBe('report');

      // Therapy'ye git
      act(() => {
        result.current.handleNavigateToTherapy();
      });

      expect(result.current.activeModal).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/therapy/therapy_options',
        params: { startConversationWith: 'anxiety' },
      });
    });

    it('dailyTheme yoksa handleNavigateToTherapy hiçbir şey yapmaz', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {},
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.handleNavigateToTherapy();
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('7. handleSatisfaction - Async İşlem', () => {
    it('başarılı satisfaction score güncellemesi', async () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageDecisionLogId: 'log-123',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      await act(async () => {
        await result.current.handleSatisfaction(5);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('update-satisfaction-score', {
        body: { log_id: 'log-123', score: 5 },
      });
    });

    it('decisionLogId yoksa handleSatisfaction hiçbir şey yapmaz', async () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {},
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      await act(async () => {
        await result.current.handleSatisfaction(5);
      });

      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('hata durumunda console.error çağrılır', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageDecisionLogId: 'log-123',
          },
        },
        isLoading: false,
      } as any);

      const testError = { message: 'Network error' };
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: null,
        error: testError,
      });

      const { result } = renderHook(() => useHomeScreen());

      await act(async () => {
        await result.current.handleSatisfaction(3);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Satisfaction] Skor güncelleme hatası:',
        testError
      );

      consoleErrorSpy.mockRestore();
    });

    it('farklı satisfaction skorları gönderilebilir', async () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageDecisionLogId: 'log-456',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      // Skor 1
      await act(async () => {
        await result.current.handleSatisfaction(1);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('update-satisfaction-score', {
        body: { log_id: 'log-456', score: 1 },
      });

      // Skor 10
      await act(async () => {
        await result.current.handleSatisfaction(10);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('update-satisfaction-score', {
        body: { log_id: 'log-456', score: 10 },
      });
    });
  });

  describe('8. Query Invalidation', () => {
    it('invalidateLatestReport query\'yi invalidate eder', () => {
      const { result } = renderHook(() => useHomeScreen());

      act(() => {
        result.current.invalidateLatestReport();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['latestReport'],
      });
    });
  });

  describe('9. Vault Metadata Türevleri', () => {
    it('dailyTheme vault metadata\'dan gelir', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageTheme: 'stress',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.dailyTheme).toBe('stress');
    });

    it('decisionLogId vault metadata\'dan gelir', () => {
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageDecisionLogId: 'decision-789',
          },
        },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.decisionLogId).toBe('decision-789');
    });

    it('vault null ise default değerler döner', () => {
      mockUseVault.mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useHomeScreen());

      expect(result.current.dailyMessage).toBe('Bugün için mesajın burada görünecek.');
      expect(result.current.dailyTheme).toBeFalsy();
      expect(result.current.decisionLogId).toBeFalsy();
    });
  });

  describe('10. Edge Cases ve Boundary Conditions', () => {
    it('vault metadata undefined olsa bile crash olmaz', () => {
      mockUseVault.mockReturnValue({
        data: {},
        isLoading: false,
      } as any);

      expect(() => {
        renderHook(() => useHomeScreen());
      }).not.toThrow();
    });

    it('multiple modal açma/kapama senaryosu', () => {
      const { result } = renderHook(() => useHomeScreen());

      // Report aç
      act(() => {
        result.current.handleReportPress();
      });
      expect(result.current.activeModal).toBe('report');

      // Kapat
      act(() => {
        result.current.handleModalClose();
      });
      expect(result.current.activeModal).toBeNull();

      // Onboarding insight aç
      act(() => {
        result.current.handleOnboardingInsightPress();
      });
      expect(result.current.activeModal).toBe('onboardingInsight');

      // Kapat
      act(() => {
        result.current.handleModalClose();
      });
      expect(result.current.activeModal).toBeNull();
    });

    it('vault data değiştiğinde hook re-render olur', () => {
      const { result, rerender } = renderHook(() => useHomeScreen());

      // İlk durum
      expect(result.current.dailyMessage).toBe('Bugün için mesajın burada görünecek.');

      // Vault data değişti
      mockUseVault.mockReturnValue({
        data: {
          metadata: {
            dailyMessageContent: 'Yeni mesaj',
          },
        },
        isLoading: false,
      } as any);

      rerender();

      // Yeni mesaj görünmeli
      expect(result.current.dailyMessage).toBe('Yeni mesaj');
    });
  });
});

