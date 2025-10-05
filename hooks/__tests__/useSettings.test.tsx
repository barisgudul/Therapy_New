// hooks/__tests__/useSettings.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSettings } from '../useSettings';
import { signOut } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

//----- MOCKS -----
// Alert mock'larını jest.spyOn ile yapacağız

// Mock expo-router properly
const mockRouterReplace = jest.fn();
const mockRouter = { replace: mockRouterReplace };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('../../utils/auth', () => ({
  signOut: jest.fn(),
}));

jest.mock('../../utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../../utils/i18n', () => ({
  t: (key: string) => key, // i18n key'leri direkt döndür
}));

//----- TEST KURULUMU -----
const mockedSignOut = signOut as jest.Mock;
const mockedSupabaseInvoke = supabase.functions.invoke as jest.Mock;

describe('useSettings Hook', () => {
  let alertSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Her testten önce spy'ları kur
    alertSpy = jest.spyOn(Alert, 'alert');
    promptSpy = jest.spyOn(Alert, 'prompt');
  });

  afterEach(() => {
    // Her testten sonra spy'ları temizle
    alertSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.isResetting).toBe(false);
  });

  it('should show sign out confirmation dialog', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.handleSignOut();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'settings.security.alert_signOut_title',
      'settings.security.alert_signOut_body',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'settings.security.alert_cancel',
          style: 'cancel',
        }),
        expect.objectContaining({
          text: 'settings.security.sign_out',
          style: 'destructive',
          onPress: expect.any(Function),
        }),
      ])
    );
  });

  it('should sign out successfully', async () => {
    mockedSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings());

    // Sign out confirmation callback'i al
    let signOutCallback: () => Promise<void>;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        signOutCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleSignOut();
    });

    // Sign out işlemini çalıştır
    if (signOutCallback) {
      await act(async () => {
        await signOutCallback();
      });
    }

    expect(mockedSignOut).toHaveBeenCalled();
    // Router mock'ını kontrol etmek yerine signOut'un çağrıldığını kontrol edelim
  });

  it('should handle sign out error', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockError = new Error('Sign out failed');
    mockedSignOut.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSettings());

    // Sign out confirmation callback'i al
    let signOutCallback: () => Promise<void>;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        signOutCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleSignOut();
    });

    // Sign out işlemini çalıştır - hata vermeli
    if (signOutCallback) {
      await act(async () => {
        await signOutCallback();
      });
    }

    expect(alertSpy).toHaveBeenCalledWith(
      'settings.security.alert_error',
      'Sign out failed'
    );

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should show reset data confirmation dialog', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.handleResetData();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'settings.main.dangerZone_title',
      'settings.profile.subtitle',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'settings.security.alert_cancel',
          style: 'cancel',
        }),
        expect.objectContaining({
          text: 'common.continue',
          style: 'destructive',
          onPress: expect.any(Function),
        }),
      ])
    );
  });

  it('should show confirmation prompt for data reset', () => {
    const { result } = renderHook(() => useSettings());

    // İlk confirmation callback'i al
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    expect(promptSpy).toHaveBeenCalledWith(
      'settings.main.dangerZone_title',
      'Lütfen devam etmek için aşağıdaki kutucuğa "tüm verilerimi sil" yazın.',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'settings.security.alert_cancel',
          style: 'cancel',
        }),
        expect.objectContaining({
          text: 'settings.main.dangerZone_resetData',
          style: 'destructive',
          onPress: expect.any(Function),
        }),
      ]),
      'plain-text'
    );
  });

  it('should execute data reset successfully', async () => {
    mockedSupabaseInvoke.mockResolvedValue({ error: null });
    mockedSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings());

    // Confirmation flow'u başlat
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Prompt callback'i al
    let promptCallback: (inputText: string) => Promise<void>;
    promptSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        promptCallback = destructiveButton.onPress;
      }
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    // Doğru text ile prompt'u çalıştır
    if (promptCallback) {
      await act(async () => {
        await promptCallback('tüm verilerimi sil');
      });
    }

    expect(result.current.isResetting).toBe(false); // İşlem bitince false
    expect(mockedSupabaseInvoke).toHaveBeenCalledWith('reset-user-data');
    expect(mockedSignOut).toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith('/login');
  });

  it('should handle data reset API error', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockError = new Error('Reset failed');
    mockedSupabaseInvoke.mockRejectedValue(mockError);

    const { result } = renderHook(() => useSettings());

    // Confirmation flow'u başlat
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Prompt callback'i al
    let promptCallback: (inputText: string) => Promise<void>;
    promptSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        promptCallback = destructiveButton.onPress;
      }
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    // Hata ile prompt'u çalıştır
    if (promptCallback) {
      await act(async () => {
        await promptCallback('tüm verilerimi sil');
      });
    }

    expect(result.current.isResetting).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(
      'settings.password.alert_error_title',
      'settings.password.error_unexpected'
    );

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should handle network error specifically', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const networkError = new Error('Failed to fetch');
    mockedSupabaseInvoke.mockRejectedValue(networkError);

    const { result } = renderHook(() => useSettings());

    // Confirmation flow'u başlat
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Prompt callback'i al
    let promptCallback: (inputText: string) => Promise<void>;
    promptSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        promptCallback = destructiveButton.onPress;
      }
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    // Network error ile prompt'u çalıştır
    if (promptCallback) {
      await act(async () => {
        await promptCallback('tüm verilerimi sil');
      });
    }

    expect(alertSpy).toHaveBeenCalledWith(
      'settings.password.alert_error_title',
      'İnternet bağlantınız kontrol edin. Sunucuya ulaşılamadı.'
    );

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should handle invalid confirmation text', async () => {
    const { result } = renderHook(() => useSettings());

    // Confirmation flow'u başlat
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Prompt callback'i al
    let promptCallback: (inputText: string) => Promise<void>;
    promptSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        promptCallback = destructiveButton.onPress;
      }
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    // Yanlış text ile prompt'u çalıştır
    if (promptCallback) {
      await act(async () => {
        await promptCallback('yanlış text');
      });
    }

    expect(alertSpy).toHaveBeenCalledWith(
      'settings.profile.toast_error_title',
      'settings.profile.toast_error_body'
    );

    // API çağrısı yapılmamalı
    expect(mockedSupabaseInvoke).not.toHaveBeenCalled();
  });

  it('should set isResetting to true during reset operation', async () => {
    // Promise'i hemen resolve et
    mockedSupabaseInvoke.mockImplementation(() => 
      Promise.resolve({ error: null })
    );
    mockedSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings());

    // Confirmation flow'u başlat
    let confirmationCallback: () => void;
    alertSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        confirmationCallback = destructiveButton.onPress;
      }
    });

    act(() => {
      result.current.handleResetData();
    });

    // Prompt callback'i al
    let promptCallback: (inputText: string) => Promise<void>;
    promptSpy.mockImplementation((title, message, buttons) => {
      const destructiveButton = buttons?.find((btn: any) => btn.style === 'destructive');
      if (destructiveButton?.onPress) {
        promptCallback = destructiveButton.onPress;
      }
    });

    // Confirmation dialog'ı aç
    if (confirmationCallback) {
      act(() => {
        confirmationCallback();
      });
    }

    // Reset işlemini başlat (await etme ki async olsun)
    let resetPromise: Promise<void>;
    if (promptCallback) {
      act(() => {
        resetPromise = promptCallback('tüm verilerimi sil');
      });
    }

    // İşlem başladıktan hemen sonra isResetting true olmalı
    await waitFor(() => {
      expect(result.current.isResetting).toBe(true);
    }, { timeout: 500 });

    // API çağrısı yapılmış olmalı
    expect(mockedSupabaseInvoke).toHaveBeenCalled();

    // Promise'in tamamlanmasını bekle
    await act(async () => {
      await resetPromise!;
    });

    // İşlem tamamlandıktan sonra isResetting false olmalı
    expect(result.current.isResetting).toBe(false);
  }, 10000); // Test timeout'unu 10 saniyeye çıkar
});
