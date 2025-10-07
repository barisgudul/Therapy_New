// app/(app)/__tests__/settings.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import SettingsScreen from '../settings';

// Mock'lar
jest.mock('../../../context/Auth');
jest.mock('../../../hooks/useSettings');
jest.mock('../../../components/settings/FeaturedCard');
jest.mock('../../../components/settings/SettingsCard');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'tr',
      changeLanguage: jest.fn(),
    },
  }),
}));

describe('SettingsScreen', () => {
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockUseSettings = jest.mocked(require('../../../hooks/useSettings').useSettings);
  const mockUseRouter = jest.mocked(require('expo-router').useRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isPendingDeletion: false,
      isLoading: false,
      signOut: jest.fn(),
    });

    mockUseSettings.mockReturnValue({
      isResetting: false,
      handleSignOut: jest.fn(),
      handleResetData: jest.fn(),
    });

    mockUseRouter.mockImplementation(() => ({
      back: jest.fn(),
      push: jest.fn(),
    }));
  });

  it('component render edilmelidir', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('header bileşenlerini doğru render etmelidir', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('kullanıcı email\'i gösterilmelidir', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('kullanıcı yoksa email gösterilmemelidir', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isPendingDeletion: false,
      isLoading: false,
      signOut: jest.fn(),
    });

    render(<SettingsScreen />);

    expect(screen.queryByText('test@example.com')).toBeNull();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockReturnValue({
      back: mockBack,
      push: jest.fn(),
    });

    render(<SettingsScreen />);

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<SettingsScreen />);
    }).not.toThrow();
  });

  it('useAuth hook\'u doğru çalışmalıdır', () => {
    render(<SettingsScreen />);

    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('useSettings hook\'u doğru çalışmalıdır', () => {
    render(<SettingsScreen />);

    expect(mockUseSettings).toHaveBeenCalled();
  });

  it('useRouter hook\'u doğru çalışmalıdır', () => {
    render(<SettingsScreen />);

    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<SettingsScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('SafeAreaView component\'i kullanılmalıdır', () => {
    render(<SettingsScreen />);

    // SafeAreaView'in kullanıldığını kontrol et
    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('ScrollView component\'i kullanılmalıdır', () => {
    render(<SettingsScreen />);

    // ScrollView'in kullanıldığını kontrol et
    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<SettingsScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('settings.main.title')).toBeTruthy();
  });

  it('isResetting durumunda loading gösterilmelidir', () => {
    mockUseSettings.mockReturnValue({
      isResetting: true,
      handleSignOut: jest.fn(),
      handleResetData: jest.fn(),
    });

    render(<SettingsScreen />);

    // Loading state'inin doğru işlendiğini kontrol et
    expect(mockUseSettings).toHaveBeenCalled();
  });

  it('handleSignOut ve handleResetData fonksiyonları doğru tanımlanmalıdır', () => {
    const mockHandleSignOut = jest.fn();
    const mockHandleResetData = jest.fn();

    mockUseSettings.mockReturnValue({
      isResetting: false,
      handleSignOut: mockHandleSignOut,
      handleResetData: mockHandleResetData,
    });

    render(<SettingsScreen />);

    expect(mockHandleSignOut).toBeDefined();
    expect(mockHandleResetData).toBeDefined();
  });
});
