// hooks/__tests__/useSettings.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSettings } from '../useSettings';
import { signOut } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const mockConsentReset = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('expo-router/', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

jest.mock('../../utils/auth', () => ({ signOut: jest.fn() }));
jest.mock('../../utils/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));
jest.mock('../../utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('../../store/consentStore', () => ({
  useConsentStore: { getState: () => ({ reset: mockConsentReset }) },
}));

const mockedSignOut = signOut as jest.Mock;
const mockedInvoke = supabase.functions.invoke as jest.Mock;

describe('useSettings', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedSignOut.mockResolvedValue(undefined);
    mockedInvoke.mockResolvedValue({ error: null });
  });

  afterEach(() => alertSpy.mockRestore());

  it('initializes with modal closed and not resetting', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.isResetting).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('openDeleteModal / closeDeleteModal toggle the modal', () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.openDeleteModal());
    expect(result.current.isDeleteModalOpen).toBe(true);
    act(() => result.current.closeDeleteModal());
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  describe('confirmDelete', () => {
    it('invokes reset-user-data, clears consent, signs out and routes to login', async () => {
      
      const { result } = renderHook(() => useSettings());
      act(() => result.current.openDeleteModal());

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockedInvoke).toHaveBeenCalledWith('reset-user-data');
      expect(mockConsentReset).toHaveBeenCalled();
      expect(mockedSignOut).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/login');
      expect(result.current.isDeleteModalOpen).toBe(false);
    });

    it('surfaces a network error and keeps the user signed in', async () => {
      mockedInvoke.mockRejectedValue(new Error('Failed to fetch'));
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'settings.password.alert_error_title',
        'settings.account.delete_error_network',
      );
      expect(mockedSignOut).not.toHaveBeenCalled();
      expect(result.current.isResetting).toBe(false);
    });

    it('surfaces an edge-function error via error.details', async () => {
      mockedInvoke.mockResolvedValue({
        error: Object.assign(new Error('bad'), { details: 'Server said no' }),
      });
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'settings.password.alert_error_title',
        'Server said no',
      );
    });
  });

  describe('handleSignOut', () => {
    it('shows a confirmation alert', () => {
      const { result } = renderHook(() => useSettings());
      act(() => result.current.handleSignOut());
      expect(alertSpy).toHaveBeenCalledWith(
        'settings.security.alert_signOut_title',
        'settings.security.alert_signOut_body',
        expect.any(Array),
      );
    });

    it('signs out and routes to login when confirmed', async () => {
      const { result } = renderHook(() => useSettings());
      act(() => result.current.handleSignOut());
      const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
      const confirm = buttons.find((b) => b.text === 'settings.security.sign_out');
      await act(async () => {
        await confirm?.onPress?.();
      });
      expect(mockedSignOut).toHaveBeenCalled();
      await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/login'));
    });
  });
});
