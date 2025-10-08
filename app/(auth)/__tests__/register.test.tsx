// app/(auth)/__tests__/register.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import RegisterScreen from '../register';

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
jest.mock('../../../store/onboardingStore');
jest.mock('../../../services/api.service');
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
  AuthLayout: ({ children, title, footer }: { children: React.ReactNode; title: string; footer: React.ReactNode }) => {
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

describe('RegisterScreen', () => {
  const mockUseRouter = jest.mocked(require('expo-router/').useRouter);
  const mockUseLoading = jest.mocked(require('../../../context/Loading').useLoading);
  const mockUseOnboardingStore = jest.mocked(require('../../../store/onboardingStore').useOnboardingStore);
  const mockSignUpWithOnboardingData = jest.mocked(require('../../../utils/auth').signUpWithOnboardingData);
  const mockLogEvent = jest.mocked(require('../../../services/api.service').logEvent);
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

    mockUseOnboardingStore.mockReturnValue([
      { answer: 'Answer 1', question: 'Question 1' },
      { answer: 'Answer 2', question: 'Question 2' },
      { answer: 'Answer 3', question: 'Question 3' },
    ]);

    mockSignUpWithOnboardingData.mockResolvedValue({
      user: { id: 'user-123' },
      error: null,
    });

    mockLogEvent.mockResolvedValue(undefined);
  });

  it('component render edilmelidir', () => {
    render(<RegisterScreen />);
    
    expect(screen.getByText('auth.create_account')).toBeTruthy();
  });

  it('ilk adımda email ve password inputları gösterilmelidir', () => {
    render(<RegisterScreen />);
    
    expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
    expect(screen.getByPlaceholderText('auth.password')).toBeTruthy();
  });

  it('email inputuna yazılabilmelidir', () => {
    render(<RegisterScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    fireEvent.changeText(emailInput, 'test@example.com');
    
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('geçersiz email girildiğinde hata gösterilmelidir', async () => {
    render(<RegisterScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const continueButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(screen.getByText('auth.error_invalid_email')).toBeTruthy();
    });
  });

  it('şifre 6 karakterden kısa olduğunda hata gösterilmelidir', async () => {
    render(<RegisterScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const continueButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, '12345');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(screen.getByText('auth.error_password_length')).toBeTruthy();
    });
  });

  it('geçerli bilgilerle devam edildiğinde 2. adıma geçilmelidir', async () => {
    render(<RegisterScreen />);
    
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const continueButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(screen.getByText('auth.almost_done')).toBeTruthy();
      expect(screen.getByPlaceholderText('auth.nickname')).toBeTruthy();
    });
  });

  it('2. adımda nickname boşsa hata gösterilmelidir', async () => {
    render(<RegisterScreen />);
    
    // Önce 2. adıma geç
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auth.nickname')).toBeTruthy();
    });

    // Şimdi boş nickname ile kayıt olmayı dene
    const createAccountButton = screen.getByTestId('auth-button');
    fireEvent.press(createAccountButton);

    await waitFor(() => {
      expect(screen.getByText('auth.error_nickname_required')).toBeTruthy();
    });
  });

  it('başarılı kayıt sonrası analysis sayfasına yönlendirilmelidir', async () => {
    const mockReplace = jest.fn();
    
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
      back: jest.fn(),
    });

    mockSignUpWithOnboardingData.mockResolvedValue({
      user: { id: 'user-123' },
      error: null,
    });

    render(<RegisterScreen />);
    
    // 2. adıma geç
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auth.nickname')).toBeTruthy();
    });

    // Nickname gir ve kayıt ol
    const nicknameInput = screen.getByPlaceholderText('auth.nickname');
    fireEvent.changeText(nicknameInput, 'Test User');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(mockSignUpWithOnboardingData).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
        expect.any(Array)
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/analysis');
    });
  });

  it('kayıt başarılı olduğunda event loglanmalıdır', async () => {
    mockSignUpWithOnboardingData.mockResolvedValue({
      user: { id: 'user-123' },
      error: null,
    });

    render(<RegisterScreen />);
    
    // 2. adıma geç
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'password123');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auth.nickname')).toBeTruthy();
    });

    // Kayıt ol
    fireEvent.changeText(screen.getByPlaceholderText('auth.nickname'), 'Test User');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(mockLogEvent).toHaveBeenCalledWith({
        type: 'register_success',
        data: { source: 'softwall' },
      });
    });
  });

  it('kayıt başarısız olduğunda hata gösterilmelidir', async () => {
    mockSignUpWithOnboardingData.mockResolvedValue({
      user: null,
      error: 'Email already exists',
    });

    render(<RegisterScreen />);
    
    // 2. adıma geç
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'password123');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('auth.nickname')).toBeTruthy();
    });

    // Kayıt ol
    fireEvent.changeText(screen.getByPlaceholderText('auth.nickname'), 'Test User');
    fireEvent.press(screen.getByTestId('auth-button'));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeTruthy();
    });
  });

  it('giriş yap linkine tıklandığında login sayfasına yönlendirilmelidir', () => {
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<RegisterScreen />);
    
    const loginLink = screen.getByText('auth.login_link');
    fireEvent.press(loginLink);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<RegisterScreen />);
    }).not.toThrow();
  });

  it('component unmount olduğunda hata olmamalıdır', () => {
    const { unmount } = render(<RegisterScreen />);
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  it('Google ile kayıt başarılı olmalıdır', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    });

    render(<RegisterScreen />);
    
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

    render(<RegisterScreen />);
    
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

    render(<RegisterScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/Google yönlendirme/)).toBeTruthy();
    });
  });

  it('Google OAuth catch bloğu çalışmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockRejectedValue(new Error('Network error'));

    render(<RegisterScreen />);
    
    const googleButton = screen.getByTestId('icon-logo-google');
    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Direksiyona geçerken hata:', 'Network error');
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('Apple ile kayıt başarılı olmalıdır', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://appleid.apple.com/auth' },
      error: null,
    });

    render(<RegisterScreen />);
    
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

    render(<RegisterScreen />);
    
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

    render(<RegisterScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(screen.getByText(/Apple yönlendirme/)).toBeTruthy();
    });
  });

  it('Apple OAuth catch bloğu çalışmalıdır', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabase.auth.signInWithOAuth.mockRejectedValue(new Error('Connection failed'));

    render(<RegisterScreen />);
    
    const appleButton = screen.getByTestId('icon-logo-apple');
    fireEvent.press(appleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Direksiyona geçerken hata (Apple):', 'Connection failed');
      expect(screen.getByText('Connection failed')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('email hatası ile step 0\'a dönülmelidir', async () => {
    const mockHideLoading = jest.fn();
    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: mockHideLoading,
      isLoading: false,
    });

    mockSignUpWithOnboardingData.mockResolvedValue({
      user: null,
      error: 'Email already registered',
    });

    render(<RegisterScreen />);
    
    // İlk adımda devam et
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const continueButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(screen.getByText('auth.almost_done')).toBeTruthy();
    });

    // İkinci adımda nickname gir ve kayıt ol
    const nicknameInput = screen.getByPlaceholderText('auth.nickname');
    const registerButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(nicknameInput, 'TestUser');
    fireEvent.press(registerButton);

    await waitFor(() => {
      expect(mockHideLoading).toHaveBeenCalled();
      expect(screen.getByText('Email already registered')).toBeTruthy();
    });
  });

  it('unknown error durumu yakalanmalıdır', async () => {
    const mockHideLoading = jest.fn();
    mockUseLoading.mockReturnValue({
      showLoading: jest.fn(),
      hideLoading: mockHideLoading,
      isLoading: false,
    });

    mockSignUpWithOnboardingData.mockResolvedValue({
      user: null,
      error: null,
    });

    render(<RegisterScreen />);
    
    // İlk adımda geçerli email ve password ile devam et
    const emailInput = screen.getByPlaceholderText('auth.email');
    const passwordInput = screen.getByPlaceholderText('auth.password');
    const continueButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(screen.getByText('auth.almost_done')).toBeTruthy();
    });

    // İkinci adımda nickname gir ve kayıt ol
    const nicknameInput = screen.getByPlaceholderText('auth.nickname');
    const registerButton = screen.getByTestId('auth-button');
    
    fireEvent.changeText(nicknameInput, 'TestUser');
    fireEvent.press(registerButton);

    await waitFor(() => {
      expect(mockHideLoading).toHaveBeenCalled();
      expect(screen.getByText('auth.unknown_error')).toBeTruthy();
    });
  });
});
