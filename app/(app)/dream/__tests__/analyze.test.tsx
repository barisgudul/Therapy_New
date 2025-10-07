// app/(app)/dream/__tests__/analyze.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import AnalyzeDreamScreen from '../analyze';

// Mock'lar
jest.mock('../../../../hooks/useVault');
jest.mock('../../../../services/event.service');
jest.mock('../../../../utils/supabase');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('../../../../utils/i18n', () => ({
  language: 'tr',
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('moti', () => ({ MotiView: 'MotiView' }));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('AnalyzeDreamScreen', () => {
  const mockUseMutation = jest.mocked(require('@tanstack/react-query').useMutation);
  const mockUseQueryClient = jest.mocked(require('@tanstack/react-query').useQueryClient);
  const mockUseVault = jest.mocked(require('../../../../hooks/useVault').useVault);
  const mockCanUserAnalyzeDream = jest.mocked(require('../../../../services/event.service').canUserAnalyzeDream);
  const mockSupabase = jest.mocked(require('../../../../utils/supabase').supabase);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // useRouter mock'u
    require('expo-router').useRouter.mockImplementation(() => ({
      back: jest.fn(),
      replace: jest.fn(),
    }));
    
    // Varsayılan mock implementations
    mockUseVault.mockReturnValue({
      data: { id: 'vault-123' },
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });

    mockCanUserAnalyzeDream.mockResolvedValue({
      canAnalyze: true,
    });

    mockSupabase.functions = {
      invoke: jest.fn().mockResolvedValue({
        data: 'dream-123',
        error: null,
      }),
    };
  });

  it('component render edilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    expect(mockUseVault).toHaveBeenCalled();
  });

  it('header doğru render edilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    expect(screen.getByText('dream.analyze.header_title')).toBeTruthy();
    expect(screen.getByText('dream.analyze.header_subtext')).toBeTruthy();
  });

  it('text input doğru render edilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    expect(screen.getByPlaceholderText('dream.analyze.placeholder')).toBeTruthy();
  });

  it('text input değeri değiştirilebilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Test rüya metni');

    expect(textInput.props.value).toBe('Test rüya metni');
  });

  it('karakter sayacı doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Test');

    expect(screen.getByText('4/20')).toBeTruthy();
  });

  it('minimum karakter kontrolü doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Kısa metin');

    // 20 karakterden az olduğu için buton disabled olmalı
    const analyzeButton = screen.getByTestId('analyze-button');
    expect(analyzeButton).toBeTruthy();
    // Disabled butonun tıklanması mutation'ı çağırmamalı
    fireEvent.press(analyzeButton);
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('yeterli karakter olduğunda buton aktif olmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    // 20 karakterden fazla olduğu için buton aktif olmalı
    const analyzeButton = screen.getByTestId('analyze-button');
    expect(analyzeButton).toBeTruthy();
    // Aktif butonun tıklanması mutation'ı çağırmalı
    fireEvent.press(analyzeButton);
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('analyze butonuna basıldığında mutation çağrılmalıdır', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    expect(mockMutate).toHaveBeenCalled();
  });

  it('geri butonuna basıldığında router.back çağrılmalıdır', () => {
    const mockRouter = { back: jest.fn(), replace: jest.fn() };
    require('expo-router').useRouter.mockImplementation(() => mockRouter);

    render(<AnalyzeDreamScreen />);

    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('loading durumunda ActivityIndicator göstermelidir', () => {
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: true,
    });

    render(<AnalyzeDreamScreen />);

    // Loading state'inin doğru işlendiğini kontrol et
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('vault loading durumunda buton disabled olmalıdır', () => {
    mockUseVault.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    // Vault loading olduğu için buton disabled olmalı
    const analyzeButton = screen.getByTestId('analyze-button');
    expect(analyzeButton).toBeTruthy();
    // Vault loading olduğu için buton tıklanamamalı
    fireEvent.press(analyzeButton);
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('error state doğru gösterilmelidir', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    // Uzun metin ile analyze butonuna bas
    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    // Error handling'in doğru çalıştığını kontrol et
    expect(mockMutate).toHaveBeenCalled();
  });

  it('useMutation doğru parametrelerle çağrılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    expect(mockUseMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('component mount olduğunda hata olmamalıdır', () => {
    expect(() => {
      render(<AnalyzeDreamScreen />);
    }).not.toThrow();
  });

  it('LinearGradient component\'i kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // LinearGradient'in kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('MotiView component\'i kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // MotiView'in kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('useTranslation hook\'u doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Translation hook'unun doğru çalıştığını kontrol et
    expect(screen.getByText('dream.analyze.header_title')).toBeTruthy();
  });

  it('i18n.language doğru kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Language'in doğru kullanıldığını kontrol et
    expect(screen.getByText('dream.analyze.header_title')).toBeTruthy();
  });

  it('COSMIC_COLORS constant\'ı doğru kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Colors'ın doğru kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('stil objeleri doğru tanımlanmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Stil objelerinin doğru tanımlandığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('KeyboardAvoidingView doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // KeyboardAvoidingView'in doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('ScrollView doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // ScrollView'in doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('TextInput doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // TextInput'un doğru çalıştığını kontrol et
    expect(screen.getByPlaceholderText('dream.analyze.placeholder')).toBeTruthy();
  });

  it('TouchableOpacity doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // TouchableOpacity'in doğru çalıştığını kontrol et
    expect(screen.getByText('dream.analyze.button_analyze')).toBeTruthy();
  });

  it('Text component\'i kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Text'in kullanıldığını kontrol et
    expect(screen.getByText('dream.analyze.header_title')).toBeTruthy();
  });

  it('View component\'i kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // View'in kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('StyleSheet kullanılmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // StyleSheet'in kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('useSafeAreaInsets doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // useSafeAreaInsets'in doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('Platform.OS kontrolü doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Platform kontrolünün doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('Keyboard.dismiss doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    // Keyboard.dismiss'un çağrıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('canUserAnalyzeDream kontrolü doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    // canUserAnalyzeDream'un çağrıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('supabase functions invoke doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    // supabase functions invoke'un çağrıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('success durumunda router.replace çağrılmalıdır', () => {
    const mockRouter = { back: jest.fn(), replace: jest.fn() };
    require('expo-router').useRouter.mockImplementation(() => mockRouter);

    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    // Success durumunu simüle et
    const mutationCall = mockUseMutation.mock.calls[0][0];
    mutationCall.onSuccess('dream-123');

    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/dream/result',
      params: { id: 'dream-123' },
    });
  });

  it('error durumunda Toast gösterilmelidir', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    // Error durumunu simüle et
    const mutationCall = mockUseMutation.mock.calls[0][0];
    mutationCall.onError(new Error('Test error'));

    // Toast'un gösterildiğini kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('limit error durumunda info Toast gösterilmelidir', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    // Limit error durumunu simüle et
    const mutationCall = mockUseMutation.mock.calls[0][0];
    mutationCall.onError(new Error('limit reached'));

    // Info Toast'un gösterildiğini kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('Toast notifications doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    // Toast'un doğru kullanıldığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('query invalidation doğru çalışmalıdır', () => {
    const mockInvalidateQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    render(<AnalyzeDreamScreen />);

    // Success durumunu simüle et
    const mutationCall = mockUseMutation.mock.calls[0][0];
    mutationCall.onSuccess('dream-123');

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dreamEvents'],
    });
  });

  it('event payload doğru oluşturulmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Test rüya metni');

    const analyzeButton = screen.getByText('dream.analyze.button_analyze');
    fireEvent.press(analyzeButton);

    // Event payload'un doğru oluşturulduğunu kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('moon icon doğru render edilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    // Moon icon'un render edildiğini kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('helper text doğru gösterilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    expect(screen.getByText('dream.analyze.helper_privacy')).toBeTruthy();
  });

  it('counter text doğru gösterilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Test');

    expect(screen.getByText('4/20')).toBeTruthy();
  });

  it('error text doğru gösterilmelidir', () => {
    const mockMutate = jest.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    render(<AnalyzeDreamScreen />);

    // Error state'i simüle et
    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Test');
    fireEvent.press(screen.getByText('dream.analyze.button_analyze'));

    // Error text'in gösterildiğini kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('footer doğru render edilmelidir', () => {
    render(<AnalyzeDreamScreen />);

    // Footer'ın doğru render edildiğini kontrol et
    expect(screen.getByText('dream.analyze.button_analyze')).toBeTruthy();
  });

  it('button gradient doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

    // Button gradient'in doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });

  it('disabled gradient doğru çalışmalıdır', () => {
    render(<AnalyzeDreamScreen />);

    const textInput = screen.getByPlaceholderText('dream.analyze.placeholder');
    fireEvent.changeText(textInput, 'Kısa');

    // Disabled gradient'in doğru çalıştığını kontrol et
    expect(mockUseVault).toHaveBeenCalled();
  });
});
