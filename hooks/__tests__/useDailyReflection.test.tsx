// hooks/__tests__/useDailyReflection.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import Toast from 'react-native-toast-message';
import { useDailyReflection } from '../useDailyReflection';
import { supabase } from '../../utils/supabase';
import * as Haptics from 'expo-haptics';

// Jest'e zamanı kontrol etme yetkisi ver
jest.useFakeTimers();

//----- MOCKS -----
// 1. Dış Dünya Servisleri
jest.mock('../../utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

// Native modüller mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'tr' }],
  getCalendars: () => ['gregory'],
}));

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Animated: {
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => 0),
    })),
    ValueXY: jest.fn(() => ({
      x: 0,
      y: 0,
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
    })),
    Easing: {
      inOut: jest.fn((easing) => easing),
      out: jest.fn((easing) => easing),
      exp: jest.fn((easing) => easing),
      ease: jest.fn(() => 'ease'),
    },
  },
}));

// 2. Navigasyon
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// 3. Context'ler ve Diğer Hook'lar
jest.mock('../../context/Auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));
const mockRefresh = jest.fn();
jest.mock('../useSubscription', () => ({
  useFeatureAccess: jest.fn(() => ({
    can_use: true,
    isLoading: false,
    used_count: 0,
    limit_count: 5,
    refetch: mockRefresh, // Hook'ta refetch olarak kullanılıyor ama refresh olarak yeniden adlandırılıyor
  })),
}));

// useVault ve useUpdateVault'u mock'luyoruz.
const mockUpdateVault = jest.fn();
jest.mock('../useVault', () => ({
  useVault: () => ({ data: { id: 'vault-1', metadata: {} }, isLoading: false }),
  useUpdateVault: () => ({ mutate: mockUpdateVault }),
}));

//----- TEST KURULUMU -----
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Mock'lanmış fonksiyonları daha kolay erişim için değişkene ata
const mockedSupabaseInvoke = supabase.functions.invoke as jest.Mock;
const mockedToastShow = Toast.show as jest.Mock;

describe('useDailyReflection Hook', () => {
  beforeEach(() => {
    // Her testten önce tüm mock'ları temizle ki testler birbirini etkilemesin
    jest.clearAllMocks();
    queryClient.clear(); // HER TESTTEN ÖNCE CACHE'İ TEMİZLE!
    mockRefresh.mockClear();
  });

  it('should initialize with default state values', () => {
    // useEffect'i mock'layarak animation'ı devre dışı bırak
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    expect(result.current.state.moodValue).toBe(3);
    expect(result.current.state.note).toBe('');
    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.feedbackVisible).toBe(false);
    expect(result.current.state.inputVisible).toBe(false);
    expect(result.current.state.aiMessage).toBe('');
    expect(result.current.state.decisionLogId).toBe('');
    expect(result.current.state.satisfactionScore).toBe(null);
    expect(result.current.state.conversationTheme).toBe(null);
    expect(result.current.state.pendingSessionId).toBe(null);

    useEffectSpy.mockRestore();
  });

  it('should update note state when setNote is called', () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setNote('Bugün harika bir gündü.');
    });

    expect(result.current.state.note).toBe('Bugün harika bir gündü.');

    useEffectSpy.mockRestore();
  });

  it('should update mood value state when setMoodValue is called', () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setMoodValue(5);
    });

    expect(result.current.state.moodValue).toBe(5);

    useEffectSpy.mockRestore();
  });

  it('should handle onSlidingComplete and trigger haptics', () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.onSlidingComplete(4.7);
    });

    expect(result.current.state.moodValue).toBe(5); // Rounded value
    expect(Haptics.selectionAsync).toHaveBeenCalled();

    useEffectSpy.mockRestore();
  });

  //----- ASIL İŞ: ASENKRON MANTIK TESTİ -----

  it('should successfully save a session and display AI feedback on happy path', async () => {
    // useEffect'i mock'layarak animation'ı devre dışı bırak
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    // Arrange: API'dan başarılı cevap döneceğini simüle et
    const mockApiResponse = {
      aiResponse: 'Bu harika bir yansıma.',
      decisionLogId: 'log-123',
      conversationTheme: 'pozitiflik',
      pendingSessionId: 'session-abc',
    };
    mockedSupabaseInvoke.mockResolvedValue({ data: mockApiResponse, error: null });

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act: Kullanıcının not yazıp kaydetmesini simüle et
    act(() => {
      result.current.handlers.setNote('Test notu');
      result.current.handlers.setMoodValue(4);
    });

    // Asenkron fonksiyonu 'act' içinde çağır
    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Assert: Sonuçları kontrol et
    expect(result.current.state.saving).toBe(false); // İşlem bitince saving false olmalı
    expect(result.current.state.feedbackVisible).toBe(true); // Feedback modalı görünür olmalı

    // API'dan dönen verilerin state'e doğru set edildiğini kontrol et
    await waitFor(() => {
      expect(result.current.state.aiMessage).toBe(mockApiResponse.aiResponse);
    });
    expect(result.current.state.decisionLogId).toBe(mockApiResponse.decisionLogId);
    expect(result.current.state.conversationTheme).toBe(mockApiResponse.conversationTheme);
    expect(result.current.state.pendingSessionId).toBe(mockApiResponse.pendingSessionId);
    expect(mockedToastShow).not.toHaveBeenCalled(); // Hata olmamalı

    useEffectSpy.mockRestore();
  });

  it('should handle API validation errors correctly', async () => {
    // Bu testin başında console.error'u sustur
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const validationError = { message: JSON.stringify({ error: 'Not boş olamaz', code: 'VALIDATION_ERROR' }) };
    mockedSupabaseInvoke.mockResolvedValue({ data: null, error: validationError });

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setNote('bu not hata verecek');
    });

    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Toast'un çağrıldığını bekle
    await waitFor(() => {
      expect(mockedToastShow).toHaveBeenCalledWith({
        type: 'error',
        text1: expect.any(String),
        text2: 'Not boş olamaz',
      });
    });
    
    // Mock'u geri yükle
    errorSpy.mockRestore();
  });

  it('should handle API errors and show an error toast', async () => {
    // Testin başında console.error'u sustur
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    // Arrange: API'dan genel hata döneceğini simüle et
    const apiError = {
      message: JSON.stringify({ error: 'Sunucu hatası', code: 'API_ERROR' })
    };
    mockedSupabaseInvoke.mockResolvedValue({ data: null, error: apiError });

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act
    act(() => {
      result.current.handlers.setNote('Bu not hata verecek');
    });

    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Assert
    expect(result.current.state.saving).toBe(false);
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'error',
      text1: expect.any(String),
      text2: 'Sunucu hatası',
    });
    // Hata sonrası modalın kapanmasını bekle
    await waitFor(() => {
      expect(result.current.state.feedbackVisible).toBe(false);
    }, { timeout: 3000 });

    useEffectSpy.mockRestore();
    // Testin sonunda mock'u geri yükle
    errorSpy.mockRestore();
  });

  it('should handle network/unexpected errors', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    // Arrange: Beklenmedik hata simüle et
    mockedSupabaseInvoke.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act
    act(() => {
      result.current.handlers.setNote('Network error test');
    });

    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Assert
    expect(result.current.state.saving).toBe(false);
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'error',
      text1: expect.any(String),
      text2: expect.any(String),
    });

    useEffectSpy.mockRestore();
    
    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should not save when note is empty', async () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act: Boş not ile kaydetmeye çalış
    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Assert: API çağrılmadı, saving false kaldı
    expect(mockedSupabaseInvoke).not.toHaveBeenCalled();
    expect(result.current.state.saving).toBe(false);

    useEffectSpy.mockRestore();
  });

  it('should not save when already saving', async () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    useEffectSpy.mockImplementation(() => {});

    // Arrange: İlk çağrı pending'de kalsın
    mockedSupabaseInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act: İlk kaydetme çağrısı
    act(() => {
      result.current.handlers.setNote('Test');
    });

    await act(async () => {
      result.current.handlers.saveSession();
    });

    expect(result.current.state.saving).toBe(true);

    // İkinci çağrı - aynı anda olmamalı
    await act(async () => {
      await result.current.handlers.saveSession();
    });

    // Assert: Sadece bir API çağrısı yapıldı
    expect(mockedSupabaseInvoke).toHaveBeenCalledTimes(1);

    useEffectSpy.mockRestore();
  });

  it('should handle satisfaction score submission successfully', async () => {
    // Arrange
    const mockSatisfactionResponse = { error: null };
    mockedSupabaseInvoke.mockResolvedValue(mockSatisfactionResponse);

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Önce decisionLogId'yi set et
    act(() => {
      result.current.handlers.setDecisionLogId('log-123');
    });

    // Act
    await act(async () => {
      await result.current.handlers.handleSatisfaction(4);
    });

    // Assert
    expect(result.current.state.satisfactionScore).toBe(4);
    expect(mockedSupabaseInvoke).toHaveBeenCalledWith(
      'update-satisfaction-score',
      expect.objectContaining({
        body: { log_id: 'log-123', score: 4 }
      })
    );
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'success',
      text1: expect.any(String),
      text2: expect.any(String),
      position: 'bottom',
    });
  });

  it('should handle satisfaction score submission errors', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Arrange
    const satisfactionError = { message: 'Database error' };
    mockedSupabaseInvoke.mockResolvedValue({ error: satisfactionError });

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setDecisionLogId('log-123');
    });

    // Act
    await act(async () => {
      await result.current.handlers.handleSatisfaction(3);
    });

    // Assert
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'error',
      text1: expect.any(String),
      text2: 'Database error',
      position: 'bottom',
    });

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should not submit satisfaction when no decisionLogId', async () => {
    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Act - decisionLogId olmadan dene
    await act(async () => {
      await result.current.handlers.handleSatisfaction(4);
    });

    // Assert: API çağrılmadı
    expect(mockedSupabaseInvoke).not.toHaveBeenCalled();
  });

  it('should reset state and navigate on closeFeedback', async () => {
    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Önce state'i dolduralım
    act(() => {
      result.current.handlers.setNote('Bir not');
      result.current.handlers.setAiMessage('Bir cevap');
      result.current.handlers.setDecisionLogId('123');
      result.current.handlers.setSatisfactionScore(4);
      result.current.handlers.setConversationTheme('pozitif');
      result.current.handlers.setPendingSessionId('session-123');
    });

    // Act
    act(() => {
      result.current.handlers.closeFeedback();
    });

    // Assert
    expect(result.current.state.note).toBe('');
    expect(result.current.state.aiMessage).toBe('');
    expect(result.current.state.decisionLogId).toBe('');
    expect(result.current.state.satisfactionScore).toBe(null);
    expect(result.current.state.conversationTheme).toBe(null);
    expect(result.current.state.pendingSessionId).toBe(null);
    expect(result.current.state.feedbackVisible).toBe(false);
    expect(mockUpdateVault).toHaveBeenCalled(); // Vault güncellenmesi çağrıldı mı?
    expect(mockRouterPush).toHaveBeenCalledWith('/'); // Ana sayfaya yönlendirildi mi?
  });

  it('should handle closeFeedback errors gracefully', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Arrange: Vault update hata versin
    mockUpdateVault.mockImplementation(() => {
      throw new Error('Vault update failed');
    });

    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setNote('Test note');
    });

    // Act
    act(() => {
      result.current.handlers.closeFeedback();
    });

    // Assert: Hata toast'u gösterilmeli ama state resetlenmeli
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Bağlantı Hatası',
      text2: expect.any(String),
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/'); // Yine de yönlendirme olmalı

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should show input when setInputVisible is called', () => {
    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    act(() => {
      result.current.handlers.setInputVisible(true);
    });

    expect(result.current.state.inputVisible).toBe(true);
  });

  it('should animate press correctly', () => {
    const { result } = renderHook(() => useDailyReflection(), { wrapper });

    // Animation test'i için sadece çağrıldığını kontrol edebiliriz
    // Animated.sequence'i mock'lamak karmaşık olacağı için
    expect(() => {
      act(() => {
        result.current.handlers.animatePress();
      });
    }).not.toThrow();
  });
});
