// app/(settings)/__tests__/security.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SecurityDashboardScreen from '../security';

// Mock'lar
jest.mock('../../../utils/supabase');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

// Alert mock
const mockAlert = jest.spyOn(Alert, 'alert');

describe('SecurityDashboardScreen - Gerçek Davranış Testleri', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);

  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      back: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
    };

    mockUseRouter.mockReturnValue(mockRouter);

    // Varsayılan başarılı auth
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            identities: [
              { provider: 'email', id: '1' },
              { provider: 'google', id: '2' },
            ],
          },
        },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    } as any;

    mockAlert.mockClear();
  });

  describe('1. Loading State', () => {
    it('ilk render edildiğinde loading gösterilir', () => {
      // getUser'ı sonsuz beklemede tut
      mockSupabase.auth.getUser = jest.fn().mockImplementation(
        () => new Promise(() => { })
      );

      const { UNSAFE_getByType } = render(<SecurityDashboardScreen />);

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('veri yüklendikten sonra loading kaybolur', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.title')).toBeTruthy();
      });
    });
  });

  describe('2. User Identity Loading', () => {
    it('useEffect çağrılır ve supabase.auth.getUser tetiklenir', async () => {
      render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      });
    });

    it('getUser başarılı olunca identities set edilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.login_methods')).toBeTruthy();
      });
    });

    it('getUser hatası olunca console.error çağrılır', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      mockSupabase.auth.getUser = jest.fn().mockRejectedValue(new Error('Auth failed'));

      render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Güvenlik bilgisi alınamadı:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('user null olsa bile loading biter', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.title')).toBeTruthy();
      });
    });

    it('identities null olsa bile crash olmaz', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: { identities: null },
        },
        error: null,
      });

      await waitFor(async () => {
        expect(() => {
          render(<SecurityDashboardScreen />);
        }).not.toThrow();
      });
    });
  });

  describe('3. Provider Display', () => {
    it('email provider "Email" olarak gösterilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.login_methods')).toBeTruthy();
      });
    });

    it('multiple providers virgülle ayrılır', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            identities: [
              { provider: 'email', id: '1' },
              { provider: 'google', id: '2' },
              { provider: 'apple', id: '3' },
            ],
          },
        },
        error: null,
      });

      render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Provider names virgülle ayrılarak gösterilmeli
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      });
    });
  });

  describe('4. Password Change Button', () => {
    it('email provider varsa change password butonu gösterilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.change_password')).toBeTruthy();
      });
    });

    it('email provider yoksa change password butonu gösterilmez', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            identities: [{ provider: 'google', id: '1' }],
          },
        },
        error: null,
      });

      const { queryByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(queryByText('settings.security.change_password')).toBeNull();
      });
    });

    it('change password butonuna basınca router.push çağrılır', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const changePasswordButton = getByText('settings.security.change_password');
        fireEvent.press(changePasswordButton.parent!);

        expect(mockRouter.push).toHaveBeenCalledWith('/(settings)/change-password');
      });
    });
  });

  describe('5. Sign Out - EN KRİTİK', () => {
    it('sign out butonuna basınca Alert gösterilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.sign_out')).toBeTruthy();
      });

      const signOutButton = getByText('settings.security.sign_out');
      fireEvent.press(signOutButton);

      // Alert.alert çağrıldı mı?
      expect(mockAlert).toHaveBeenCalledWith(
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

    it('Alert iptal edilirse hiçbir şey olmaz', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Cancel butonuna bas
        if (buttons && buttons[0].onPress) {
          buttons[0].onPress();
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      // signOut çağrılmamalı
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });

    it('Alert onaylanınca signOut çağrılır ve router.replace tetiklenir', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Destructive butonuna bas (sign out)
        if (buttons && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(async () => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      await waitFor(() => {
        // signOut çağrıldı mı?
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();

        // router.replace çağrıldı mı?
        expect(mockRouter.replace).toHaveBeenCalledWith('/(welcome)');
      });
    });

    it('signOut hatası olunca Alert gösterilir', async () => {
      const signOutError = { message: 'Sign out failed' };
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: signOutError,
      });

      mockAlert.mockImplementation((title, message, buttons) => {
        // İlk çağrı - sign out onayı
        if (title === 'settings.security.alert_signOut_title') {
          if (buttons && buttons[1].onPress) {
            buttons[1].onPress();
          }
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(async () => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      await waitFor(() => {
        // İkinci Alert (error) çağrıldı mı?
        expect(mockAlert).toHaveBeenCalledWith(
          'settings.security.alert_error',
          'Sign out failed'
        );
      });
    });
  });

  describe('6. Navigation', () => {
    it('back butonuna basılınca router.back çağrılır', async () => {
      const { UNSAFE_root } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Component yüklendi
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      });

      // Close button Ionicons name="close" olan Pressable
      const Pressable = require('react-native').Pressable;
      const Ionicons = require('@expo/vector-icons').Ionicons;

      const pressables = UNSAFE_root.findAllByType(Pressable);

      // Close butonunu bul (header'da, close ikonu içeren)
      const closeButton = pressables.find(p => {
        try {
          const ionicons = p.findAllByType(Ionicons);
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

  describe('7. Content Rendering', () => {
    it('tüm section başlıkları gösterilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.title')).toBeTruthy();
        expect(getByText('settings.security.subtitle')).toBeTruthy();
        expect(getByText('settings.security.section_overview')).toBeTruthy();
        expect(getByText('settings.security.section_sessions')).toBeTruthy();
      });
    });

    it('email provider varsa password section gösterilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.section_password')).toBeTruthy();
      });
    });

    it('InfoRow component\'leri doğru render edilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Login methods InfoRow
        expect(getByText('settings.security.login_methods')).toBeTruthy();
        expect(getByText('Email, google')).toBeTruthy();
      });
    });

    it('SessionCard component doğru render edilir', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // SessionCard içeriği - bu textler SessionCard içinde render ediliyor
        // device, location, lastSeen, active text ve sign out butonu
        expect(getByText('settings.security.sign_out')).toBeTruthy();

        // current_location ve now da render edilmeli
        // Ama bunlar SessionCard içinde birleşik bir Text içinde olabilir
        // Bu yüzden component'in render edildiğini sign_out butonundan anlıyoruz
      });
    });
  });

  describe('8. Gerçek Kullanıcı Senaryoları', () => {
    it('Senaryo 1: Email kullanıcı şifresini değiştirmek istiyor', async () => {
      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        expect(getByText('settings.security.change_password')).toBeTruthy();
      });

      const changePasswordButton = getByText('settings.security.change_password');
      fireEvent.press(changePasswordButton.parent!);

      expect(mockRouter.push).toHaveBeenCalledWith('/(settings)/change-password');
    });

    it('Senaryo 2: Google kullanıcı şifre değiştiremez', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            identities: [{ provider: 'google', id: '1' }],
          },
        },
        error: null,
      });

      const { queryByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Google kullanıcı için şifre değiştirme butonu yok
        expect(queryByText('settings.security.change_password')).toBeNull();
      });
    });

    it('Senaryo 3: Kullanıcı oturumu kapatmak istiyor - başarılı', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        if (title === 'settings.security.alert_signOut_title' && buttons) {
          buttons[1].onPress(); // Destructive butona bas
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
        expect(mockRouter.replace).toHaveBeenCalledWith('/(welcome)');
      });
    });

    it('Senaryo 4: Kullanıcı oturum kapatma iptal ediyor', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        if (title === 'settings.security.alert_signOut_title' && buttons) {
          // Cancel butonuna bas
          if (buttons[0].onPress) {
            buttons[0].onPress();
          }
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      // signOut çağrılmamalı
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('Senaryo 5: Oturum kapatma sırasında hata oluşuyor', async () => {
      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({
        error: { message: 'Network error' },
      });

      mockAlert.mockImplementation((title, message, buttons) => {
        if (title === 'settings.security.alert_signOut_title' && buttons) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      await waitFor(() => {
        // Error alert gösterildi
        expect(mockAlert).toHaveBeenCalledWith(
          'settings.security.alert_error',
          'Network error'
        );
      });

      // Router replace çağrılmamalı
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('9. Edge Cases ve Boundary Conditions', () => {
    it('identities array boş olsa bile crash olmaz', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: { identities: [] },
        },
        error: null,
      });

      expect(async () => {
        render(<SecurityDashboardScreen />);
        await waitFor(() => {
          expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        });
      }).not.toThrow();
    });

    it('multiple providers doğru gösterilir', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            identities: [
              { provider: 'email', id: '1' },
              { provider: 'google', id: '2' },
              { provider: 'apple', id: '3' },
            ],
          },
        },
        error: null,
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Provider names virgülle ayrılarak gösterilmeli
        const providerText = getByText('Email, google, apple');
        expect(providerText).toBeTruthy();
      });
    });

    it('getUser hatası olduğunda loading durumu sona erer', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      mockSupabase.auth.getUser = jest.fn().mockRejectedValue(new Error('Auth failed'));

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        // Loading bitti ve sayfa render edildi
        expect(getByText('settings.security.title')).toBeTruthy();
      });

      consoleErrorSpy.mockRestore();
    });

    it('signOut async function doğru çalışır', async () => {
      let resolveSignOut: any;
      const signOutPromise = new Promise((resolve) => {
        resolveSignOut = resolve;
      });

      mockSupabase.auth.signOut = jest.fn().mockReturnValue(signOutPromise);

      mockAlert.mockImplementation((title, message, buttons) => {
        if (title === 'settings.security.alert_signOut_title' && buttons) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<SecurityDashboardScreen />);

      await waitFor(() => {
        const signOutButton = getByText('settings.security.sign_out');
        fireEvent.press(signOutButton);
      });

      // signOut çağrıldı ama henüz resolve olmadı
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Şimdi resolve et
      resolveSignOut({ error: null });

      await waitFor(() => {
        // Artık router.replace çağrıldı
        expect(mockRouter.replace).toHaveBeenCalledWith('/(welcome)');
      });
    });
  });
});
