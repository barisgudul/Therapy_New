// hooks/__tests__/useProtectedRoute.test.tsx
import { renderHook } from '@testing-library/react-native';
import { useProtectedRoute } from '../useProtectedRoute';
import { useAuth } from '../../context/Auth';
import { useVault } from '../useVault';

//----- MOCKS -----
const mockRouterReplace = jest.fn();

// useSegments mock'u için dışarıda değişken tanımla
let mockSegments = ['(app)'];

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useSegments: () => mockSegments,
}));

// Mock context and hooks properly
jest.mock('../../context/Auth', () => ({
  useAuth: jest.fn(() => ({ user: null, isLoading: false })),
}));

jest.mock('../useVault', () => ({
  useVault: jest.fn(() => ({ data: null, isLoading: false })),
}));

describe('useProtectedRoute Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Her testten önce mock'ları varsayılan değerlere döndür
    (useAuth as jest.Mock).mockReturnValue({ user: null, isLoading: false });
    (useVault as jest.Mock).mockReturnValue({ data: null, isLoading: false });
  });

  it('should not redirect when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should not redirect when vault is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is null and not in auth group', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('should not redirect when user is null but in auth group', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Auth group'ta olalım
    mockSegments = ['(auth)', 'login'];

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should redirect to app when user exists and in auth group but not in analysis', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: { id: 'vault-1' },
      isLoading: false,
    });

    // Auth group'ta ama analysis'te değil
    mockSegments = ['(auth)', 'login'];

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)');
  });

  it('should not redirect when user exists and in analysis page', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: { id: 'vault-1' },
      isLoading: false,
    });

    // Analysis sayfasında
    mockSegments = ['(auth)', 'analysis'];

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should not redirect when user exists and not in auth group', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: { id: 'vault-1' },
      isLoading: false,
    });

    // App group'ta
    mockSegments = ['(app)'];

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should handle vault data changes', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    const mockVault = { id: 'vault-1', metadata: {} };
    (useVault as jest.Mock).mockReturnValue({
      data: mockVault,
      isLoading: false,
    });

    // İlk render
    const { rerender } = renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();

    // Vault değişikliği
    const newMockVault = { id: 'vault-2', metadata: {} };
    (useVault as jest.Mock).mockReturnValue({
      data: newMockVault,
      isLoading: false,
    });

    rerender({});

    // Vault değişikliği effect'i tetiklemeli
    expect(mockRouterReplace).not.toHaveBeenCalled(); // Auth group'ta değiliz
  });

  it('should handle segments array changes', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // İlk render - auth group'ta değil
    renderHook(() => useProtectedRoute());
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');

    jest.clearAllMocks();

    // Şimdi auth group'ta olalım
    mockSegments = ['(auth)', 'login'];

    renderHook(() => useProtectedRoute());

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should handle user state changes', () => {
    // İlk render - user null
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockSegments = ['(app)'];

    renderHook(() => useProtectedRoute());
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');

    jest.clearAllMocks();

    // User login olsun
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: { id: 'vault-1' },
      isLoading: false,
    });

    renderHook(() => useProtectedRoute());

    // Auth group'ta değiliz, user var - yönlendirme olmamalı
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('should handle empty segments array', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Boş segments
    mockSegments = [];

    renderHook(() => useProtectedRoute());

    // Auth group'ta değiliz, user null - login'e yönlendirmeli
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('should handle nested auth segments', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    (useVault as jest.Mock).mockReturnValue({
      data: { id: 'vault-1' },
      isLoading: false,
    });

    // Nested auth segment
    mockSegments = ['(auth)', 'forgot-password'];

    renderHook(() => useProtectedRoute());

    // Auth group'ta, user var, analysis'te değil - app'e yönlendirmeli
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)');
  });
});
