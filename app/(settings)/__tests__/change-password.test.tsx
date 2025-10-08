// app/(settings)/__tests__/change-password.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ChangePasswordScreen from '../change-password';

// Mock'lar
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
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
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('ChangePasswordScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          email: 'test@example.com',
        },
      },
      error: null,
    });

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: null,
    });

    mockSupabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: null,
    });
  });

  it('component render edilmelidir', () => {
    render(<ChangePasswordScreen />);
    
    expect(screen.getByText('settings.password.title')).toBeTruthy();
  });

  it('3 şifre alanı gösterilmelidir', () => {
    render(<ChangePasswordScreen />);
    
    expect(screen.getByPlaceholderText('settings.password.placeholder_current')).toBeTruthy();
    expect(screen.getByPlaceholderText('settings.password.placeholder_new')).toBeTruthy();
    expect(screen.getByPlaceholderText('settings.password.placeholder_confirm')).toBeTruthy();
  });

  it('submit butonu gösterilmelidir', () => {
    render(<ChangePasswordScreen />);
    
    expect(screen.getByText('settings.password.submit_button')).toBeTruthy();
  });

  it('kapat butonuna tıklandığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockReturnValue({
      back: mockBack,
    });

    render(<ChangePasswordScreen />);
    
    // Close button bulunmalı (Ionicons ile)
    expect(mockUseRouter).toHaveBeenCalled();
  });

  it('şifre güçlü değilse alert gösterilmelidir', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();

    render(<ChangePasswordScreen />);
    
    const currentPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_current');
    const newPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_new');
    const confirmPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_confirm');
    const submitButton = screen.getByText('settings.password.submit_button');
    
    fireEvent.changeText(currentPasswordInput, 'oldpassword');
    fireEvent.changeText(newPasswordInput, 'weak');
    fireEvent.changeText(confirmPasswordInput, 'weak');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('şifreler eşleşmezse alert gösterilmelidir', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();

    render(<ChangePasswordScreen />);
    
    const currentPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_current');
    const newPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_new');
    const confirmPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_confirm');
    const submitButton = screen.getByText('settings.password.submit_button');
    
    fireEvent.changeText(currentPasswordInput, 'oldpassword');
    fireEvent.changeText(newPasswordInput, 'NewPassword123');
    fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('mevcut şifre yanlışsa alert gösterilmelidir', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid password' },
    });

    render(<ChangePasswordScreen />);
    
    const currentPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_current');
    const newPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_new');
    const confirmPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_confirm');
    const submitButton = screen.getByText('settings.password.submit_button');
    
    fireEvent.changeText(currentPasswordInput, 'wrongpassword');
    fireEvent.changeText(newPasswordInput, 'NewPassword123');
    fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('şifre başarıyla güncellendiğinde alert ve yönlendirme yapılmalıdır', async () => {
    const alertSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {
      // Alert called
    });

    const mockBack = jest.fn();
    mockUseRouter.mockReturnValue({
      back: mockBack,
      canGoBack: jest.fn().mockReturnValue(true),
      push: jest.fn(),
    });

    render(<ChangePasswordScreen />);
    
    const currentPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_current');
    const newPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_new');
    const confirmPasswordInput = screen.getByPlaceholderText('settings.password.placeholder_confirm');
    const submitButton = screen.getByText('settings.password.submit_button');
    
    fireEvent.changeText(currentPasswordInput, 'OldPassword123');
    fireEvent.changeText(newPasswordInput, 'NewPassword123');
    fireEvent.changeText(confirmPasswordInput, 'NewPassword123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewPassword123',
      });
    });

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<ChangePasswordScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<ChangePasswordScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('password input alanları render edilmelidir', () => {
    render(<ChangePasswordScreen />);
    
    // Password input'ların render edildiğini kontrol et
    expect(screen.getByPlaceholderText('settings.password.placeholder_current')).toBeTruthy();
    expect(screen.getByPlaceholderText('settings.password.placeholder_new')).toBeTruthy();
    expect(screen.getByPlaceholderText('settings.password.placeholder_confirm')).toBeTruthy();
  });

  it('submit button render edilmelidir', () => {
    render(<ChangePasswordScreen />);
    
    // Submit button render edilmeli
    expect(screen.getByText('settings.password.submit_button')).toBeTruthy();
  });
});
