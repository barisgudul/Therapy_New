// app/(settings)/__tests__/security.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import SecurityDashboardScreen from '../security';

// Mock'lar
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('SecurityDashboardScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          identities: [
            { provider: 'email', id: '1' },
            { provider: 'google', id: '2' },
          ],
        },
      },
      error: null,
    });

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });
  });

  it('component render edilmelidir', () => {
    render(<SecurityDashboardScreen />);
    
    // İlk başta loading olacak
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('kullanıcı bilgileri yüklendiğinde gösterilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('settings.security.title')).toBeTruthy();
    });
  });

  it('login metodları gösterilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('settings.security.login_methods')).toBeTruthy();
    });
  });

  it('email provider varsa şifre değiştirme butonu gösterilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('settings.security.change_password')).toBeTruthy();
    });
  });

  it('aktif oturum bilgisi gösterilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText(/this_device/)).toBeTruthy();
      expect(screen.getByText(/active_session/)).toBeTruthy();
    });
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<SecurityDashboardScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<SecurityDashboardScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('email provider olmadığında şifre değiştirme butonu gösterilmemelidir', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          identities: [
            { provider: 'google', id: '1' },
          ],
        },
      },
      error: null,
    });

    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Email provider yoksa buton gösterilmemeli
      expect(screen.queryByText('settings.security.change_password')).toBeNull();
    });
  });

  it('multiple auth providers gösterilmelidir', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          identities: [
            { provider: 'email', id: '1' },
            { provider: 'google', id: '2' }
          ],
        },
      },
      error: null,
    });

    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Multiple providers gösterilmeli
      expect(screen.getByText('settings.security.login_methods')).toBeTruthy();
    });
  });

  it('getUser error durumunda handle edilmelidir', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    });

    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Error handling çalışmalı
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('auth providers kontrol edilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Auth providers kontrol edilmeli
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  it('loading state doğru yönetilmelidir', async () => {
    mockSupabase.auth.getUser.mockImplementation(() => new Promise(() => {}));

    render(<SecurityDashboardScreen />);
    
    // Loading indicator gösterilmeli
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('provider list render edilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Provider list render edilmeli
      expect(screen.getByText('settings.security.login_methods')).toBeTruthy();
    });
  });

  it('active session info gösterilmelidir', async () => {
    render(<SecurityDashboardScreen />);
    
    await waitFor(() => {
      // Active session info gösterilmeli
      expect(screen.getByText(/this_device|active_session/)).toBeTruthy();
    });
  });
});
