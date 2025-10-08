// app/(auth)/__tests__/forgot-password.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ForgotPasswordScreen from '../forgot-password';

// Mock'lar
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));
jest.mock('../../../context/Loading');
jest.mock('../../../components/AuthInput', () => {
  const { TextInput } = require('react-native');
  return {
    AuthInput: ({ value, onChangeText, placeholder, onSubmitEditing }: {
      value: string;
      onChangeText: (text: string) => void;
      placeholder: string;
      onSubmitEditing?: () => void;
    }) => (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onSubmitEditing={onSubmitEditing}
        testID={`input-${placeholder}`}
      />
    ),
  };
});
jest.mock('../../../components/AuthLayout', () => ({
  AuthLayout: ({ children, title, footer }: { children: React.ReactNode; title: string; footer?: React.ReactNode }) => {
    const { Text } = require('react-native');
    return (
      <>
        <Text>{title}</Text>
        {children}
        {footer}
      </>
    );
  },
}));
jest.mock('../../../components/AuthButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    AuthButton: ({ text, onPress, isLoading }: { text: string; onPress: () => void; isLoading: boolean }) => (
      <TouchableOpacity onPress={onPress} disabled={isLoading} testID="auth-button">
        <Text>{isLoading ? 'Loading...' : text}</Text>
      </TouchableOpacity>
    ),
  };
});
jest.mock('../../../constants/Colors', () => ({
  Colors: {
    light: {
      tint: '#0a7ea4',
    },
  },
}));
jest.mock('../../../styles/auth', () => ({
  authScreenStyles: {
    errorContainer: {},
    errorMessage: {},
    formContainer: {},
    inputWrapper: {},
    inputWrapperError: {},
    linkText: {},
    linkTextBold: {},
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (options && options.email) {
        return `${key} ${options.email}`;
      }
      return key;
    },
  }),
}));
jest.mock('expo-router/', () => ({
  useRouter: jest.fn(),
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Animated = { View };
  return {
    __esModule: true,
    default: Animated,
    FadeIn: {
      duration: () => ({}),
    },
  };
});
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('ForgotPasswordScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseLoading = jest.mocked(require('../../../context/Loading').useLoading);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: jest.fn(),
    });

    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      isLoading: false,
    });

    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });
  });

  it('component render edilmelidir', () => {
    render(<ForgotPasswordScreen />);
    
    expect(screen.getByText('auth.forgot_password_title')).toBeTruthy();
  });

  it('email inputu gösterilmelidir', () => {
    render(<ForgotPasswordScreen />);
    
    expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
  });

  it('email inputuna yazılabilmelidir', () => {
    render(<ForgotPasswordScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    fireEvent.changeText(emailInput, 'test@example.com');
    
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('geçersiz email girildiğinde hata gösterilmelidir', async () => {
    render(<ForgotPasswordScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const sendButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(screen.getByText('auth.error_invalid_email')).toBeTruthy();
    });
  });

  it('geçerli email ile link gönderildiğinde başarı ekranı gösterilmelidir', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<ForgotPasswordScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const sendButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    await waitFor(() => {
      expect(screen.getByText('auth.check_your_email_title')).toBeTruthy();
    });
  });

  it('başarı ekranında geri dön butonuna basıldığında login sayfasına yönlendirilmelidir', async () => {
    const mockReplace = jest.fn();
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      replace: mockReplace,
    });

    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<ForgotPasswordScreen />);
    
    // Email gönder
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByText('auth.check_your_email_title')).toBeTruthy();
    });

    // Geri dön butonuna bas
    const backButton = screen.getByText('auth.back_to_login_cta');
    fireEvent.press(backButton);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('link gönderme başarısız olduğunda hata gösterilmelidir', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email not found' },
    });

    render(<ForgotPasswordScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const sendButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeTruthy();
    });
  });

  it('geri dön linkine tıklandığında router.back çağrılmalıdır', () => {
    const mockBack = jest.fn();
    mockUseRouter.mockReturnValue({
      back: mockBack,
      replace: jest.fn(),
    });

    render(<ForgotPasswordScreen />);
    
    const backLink = screen.getByText('auth.back_to_login_link');
    fireEvent.press(backLink);
    
    expect(mockBack).toHaveBeenCalled();
  });

  it('loading durumunda buton disabled olmalıdır', () => {
    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      isLoading: true,
    });

    render(<ForgotPasswordScreen />);
    
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<ForgotPasswordScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<ForgotPasswordScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
