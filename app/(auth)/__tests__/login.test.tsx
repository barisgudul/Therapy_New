// app/(auth)/__tests__/login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import LoginScreen from '../login';

// Mock'lar
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));
jest.mock('../../../utils/auth');
jest.mock('../../../utils/authRedirect', () => ({
  makeRedirectTo: jest.fn(() => 'http://localhost:8081'),
}));
jest.mock('../../../context/Loading');
jest.mock('../../../components/AuthInput', () => {
  const { TextInput } = require('react-native');
  return {
    AuthInput: ({ value, onChangeText, placeholder, onSubmitEditing, testID }: {
      value: string;
      onChangeText: (text: string) => void;
      placeholder: string;
      onSubmitEditing?: () => void;
      testID?: string;
    }) => (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onSubmitEditing={onSubmitEditing}
        testID={testID || `input-${placeholder}`}
      />
    ),
  };
});
jest.mock('../../../components/AuthLayout', () => ({
  AuthLayout: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => (
    <>
      {children}
      {footer}
    </>
  ),
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
jest.mock('../../../styles/auth', () => ({
  authScreenStyles: {
    errorContainer: {},
    errorMessage: {},
    formContainer: {},
    inputWrapper: {},
    inputWrapperError: {},
    inputSeparator: {},
    linkText: {},
    linkTextBold: {},
    dividerContainer: {},
    dividerLine: {},
    dividerText: {},
    socialContainer: {},
    socialButton: {},
    socialIconVector: {},
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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
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
  Ionicons: ({ name }: { name: string }) => {
    const { View } = require('react-native');
    return <View testID={`icon-${name}`} />;
  },
}));

describe('LoginScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseLoading = jest.mocked(require('../../../context/Loading').useLoading);
  const mockSignInAndVerifyUser = jest.mocked(require('../../../utils/auth').signInAndVerifyUser);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);
  const mockWebBrowser = jest.mocked(require('expo-web-browser'));

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan mock'lar
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    });

    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      isLoading: false,
    });

    mockSignInAndVerifyUser.mockResolvedValue({
      success: true,
      error: '',
    });
  });

  it('component render edilmelidir', () => {
    render(<LoginScreen />);
    
    expect(screen.getByText('auth.login')).toBeTruthy();
  });

  it('email ve password inputları gösterilmelidir', () => {
    render(<LoginScreen />);
    
    expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
    expect(screen.getByPlaceholderText('auth.password')).toBeTruthy();
  });

  it('email inputuna yazılabilmelidir', () => {
    render(<LoginScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    fireEvent.changeText(emailInput, 'test@example.com');
    
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('password inputuna yazılabilmelidir', () => {
    render(<LoginScreen />);
    
    const passwordInput = screen.getByPlaceholderText('auth.password');
    fireEvent.changeText(passwordInput, 'password123');
    
    expect(passwordInput.props.value).toBe('password123');
  });

  it('giriş butonuna basıldığında handleSignIn çağrılmalıdır', async () => {
    const mockShowLoading = jest.fn();
    const mockHideLoading = jest.fn();
    
    mockUseLoading.mockReturnValue({
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
      isLoading: false,
    });

    render(<LoginScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    
    const loginButton = screen.getByTestId('auth-button');
    fireEvent.press(loginButton);
    
    expect(mockShowLoading).toHaveBeenCalledWith('auth.logging_in');
  });

  it('başarılı giriş sonrası ana sayfaya yönlendirilmelidir', async () => {
    const mockReplace = jest.fn();
    const mockHideLoading = jest.fn();
    
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
      back: jest.fn(),
    });

    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: mockHideLoading,
      isLoading: false,
    });

    mockSignInAndVerifyUser.mockResolvedValue({
      success: true,
      error: '',
    });

    render(<LoginScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const loginButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignInAndVerifyUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('giriş başarısız olduğunda hata mesajı gösterilmelidir', async () => {
    mockSignInAndVerifyUser.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    render(<LoginScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const loginButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('beklenmeyen hata yakalanmalıdır', async () => {
    const mockHideLoading = jest.fn();
    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: mockHideLoading,
      isLoading: false,
    });

    mockSignInAndVerifyUser.mockRejectedValue(new Error('Network error'));

    render(<LoginScreen />);
    
    const loginButton = screen.getByTestId('auth-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockHideLoading).toHaveBeenCalled();
      expect(screen.getByText('auth.unexpected_error')).toBeTruthy();
    });
  });

  it('Google ile giriş başarılı olmalıdır', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });

    render(<LoginScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:8081',
          skipBrowserRedirect: true,
          scopes: 'email profile',
        },
      });
    });

    await waitFor(() => {
      expect(mockWebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://accounts.google.com/oauth',
        'http://localhost:8081'
      );
    });
  });

  it('Google OAuth hatası yakalanmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'OAuth failed' },
    });

    render(<LoginScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase rotayı hazırlayamadı:', 'OAuth failed');
      expect(screen.getByText('OAuth failed')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('Google OAuth URL yoksa hata gösterilmelidir', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    render(<LoginScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/Google yönlendirme/)).toBeTruthy();
    });
  });

  it('Google OAuth beklenmeyen hata yakalanmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockRejectedValue(new Error('Network error'));

    render(<LoginScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Direksiyona geçerken hata:', 'Network error');
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('Apple ile giriş başarılı olmalıdır', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://appleid.apple.com/auth' },
      error: null,
    });

    render(<LoginScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: 'http://localhost:8081',
          skipBrowserRedirect: true,
        },
      });
    });

    await waitFor(() => {
      expect(mockWebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://appleid.apple.com/auth',
        'http://localhost:8081'
      );
    });
  });

  it('Apple OAuth hatası yakalanmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Apple OAuth failed' },
    });

    render(<LoginScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase (Apple) rotayı hazırlayamadı:', 'Apple OAuth failed');
      expect(screen.getByText('Apple OAuth failed')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('Apple OAuth URL yoksa hata gösterilmelidir', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });

    render(<LoginScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(screen.getByText(/Apple yönlendirme/)).toBeTruthy();
    });
  });

  it('Apple OAuth beklenmeyen hata yakalanmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockRejectedValue(new Error('Connection failed'));

    render(<LoginScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Direksiyona geçerken hata (Apple):', 'Connection failed');
      expect(screen.getByText('Connection failed')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('kayıt ol linkine tıklandığında register sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<LoginScreen />);
    
    const registerLink = screen.getByText('auth.register_link');
    fireEvent.press(registerLink);
    
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  it('şifremi unuttum linkine tıklandığında forgot-password sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<LoginScreen />);
    
    const forgotPasswordLink = screen.getByText('auth.forgot_password');
    fireEvent.press(forgotPasswordLink);
    
    expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('sosyal medya giriş butonları gösterilmelidir', () => {
    render(<LoginScreen />);
    
    expect(screen.getByTestId('icon-logo-google')).toBeTruthy();
    expect(screen.getByTestId('icon-logo-apple')).toBeTruthy();
  });

  it('loading durumunda buton disabled olmalıdır', () => {
    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      isLoading: true,
    });

    render(<LoginScreen />);
    
    const loginButton = screen.getByText('Loading...');
    expect(loginButton).toBeTruthy();
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<LoginScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<LoginScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
