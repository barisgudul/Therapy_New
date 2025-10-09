// app/(app)/dream/__tests__/analyze.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import Toast from 'react-native-toast-message';

import AnalyzeDreamScreen from '../analyze';

// Mock'lar
jest.mock('../../../../hooks/useVault');
jest.mock('../../../../services/event.service');
jest.mock('../../../../utils/supabase');
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock('../../../../utils/i18n', () => ({ __esModule: true, default: { language: 'tr' } }));
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('moti', () => {
  const { View } = require('react-native');
  return { MotiView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

// Keyboard mock
const mockKeyboardDismiss = jest.spyOn(Keyboard, 'dismiss');

describe('AnalyzeDreamScreen - Gerçek Davranış Testleri', () => {
  const mockUseMutation = jest.mocked(require('@tanstack/react-query').useMutation);
  const mockUseQueryClient = jest.mocked(require('@tanstack/react-query').useQueryClient);
  const mockUseVault = jest.mocked(require('../../../../hooks/useVault').useVault);
  const mockCanUserAnalyzeDream = jest.mocked(
    require('../../../../services/event.service').canUserAnalyzeDream
  );
  const mockSupabase = jest.mocked(require('../../../../utils/supabase').supabase);
  const mockToast = Toast;

  let mockMutate: jest.Mock;
  let mockQueryClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMutate = jest.fn();

    mockQueryClient = {
      invalidateQueries: jest.fn(),
    };

    // useRouter mock
    require('expo-router').useRouter.mockImplementation(() => ({
      back: jest.fn(),
      replace: jest.fn(),
    }));

    // useVault - varsayılan başarılı
    mockUseVault.mockReturnValue({
      data: { id: 'vault-123' },
      isLoading: false,
    } as any);

    // useMutation - varsayılan
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    mockUseQueryClient.mockReturnValue(mockQueryClient);

    // canUserAnalyzeDream - varsayılan izin var
    mockCanUserAnalyzeDream.mockResolvedValue({
      canAnalyze: true,
    } as any);

    // supabase functions - varsayılan başarılı
    mockSupabase.functions = {
      invoke: jest.fn().mockResolvedValue({
        data: 'dream-123',
        error: null,
      }),
    } as any;

    // Keyboard mock
    mockKeyboardDismiss.mockClear();
  });

  describe('1. Rendering ve UI', () => {
    it('header doğru render edilir', () => {
      const { getByText } = render(<AnalyzeDreamScreen />);

      expect(getByText('dream.analyze.header_title')).toBeTruthy();
      expect(getByText('dream.analyze.header_subtext')).toBeTruthy();
    });

    it('text input render edilir', () => {
      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      expect(getByPlaceholderText('dream.analyze.placeholder')).toBeTruthy();
    });

    it('helper text ve counter gösterilir', () => {
      const { getByText } = render(<AnalyzeDreamScreen />);

      expect(getByText('dream.analyze.helper_privacy')).toBeTruthy();
      expect(getByText('0/20')).toBeTruthy();
    });
  });

  describe('2. Text Input Değişimi', () => {
    it('text input değiştirilebilir ve counter güncellenir', () => {
      const { getByPlaceholderText, getByText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Test rüya metni');

      expect(textInput.props.value).toBe('Test rüya metni');
      // "Test rüya metni" = 15 karakter
      expect(getByText(/15/)).toBeTruthy();
      expect(getByText(/20/)).toBeTruthy();
    });

    it('20+ karakter yazınca counter 20+ gösterir', () => {
      const { getByPlaceholderText, getByText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin');

      // "Bu rüya metni yeterince uzun bir metin" = 38 karakter
      expect(getByText(/38/)).toBeTruthy();
      expect(getByText(/20/)).toBeTruthy();
    });
  });

  describe('3. Buton Disabled States', () => {
    it('20 karakterden az ise buton disabled olur', () => {
      const { getByPlaceholderText, getByTestId } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Kısa metin');

      const button = getByTestId('analyze-button');
      fireEvent.press(button);

      // Buton disabled olduğu için mutate çağrılmamalı
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('isPending true ise buton disabled olur', () => {
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      const { getByPlaceholderText, getByTestId } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      const button = getByTestId('analyze-button');
      fireEvent.press(button);

      // isPending olduğu için mutate çağrılmamalı
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('vault loading ise buton disabled olur', () => {
      mockUseVault.mockReturnValue({
        data: null,
        isLoading: true,
      } as any);

      const { getByPlaceholderText, getByTestId } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      const button = getByTestId('analyze-button');
      fireEvent.press(button);

      // Vault loading olduğu için mutate çağrılmamalı
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('tüm koşullar sağlandığında buton aktif olur', () => {
      const { getByPlaceholderText, getByTestId } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı ki analiz edilebilsin.');

      const button = getByTestId('analyze-button');
      fireEvent.press(button);

      // Tüm koşullar sağlandığı için mutate çağrılmalı
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('4. Loading State', () => {
    it('isPending true ise ActivityIndicator gösterilir', () => {
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      const { getByTestId } = render(<AnalyzeDreamScreen />);

      expect(getByTestId('activity-indicator')).toBeTruthy();
    });

    it('isPending true ise text input disabled olur', () => {
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      expect(textInput.props.editable).toBe(false);
    });
  });

  describe('5. Analyze Butonu - Mutation Tetikleme', () => {
    it('analyze butonuna basınca Keyboard.dismiss çağrılır', () => {
      const { getByPlaceholderText, getByText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      const analyzeButton = getByText('dream.analyze.button_analyze');
      fireEvent.press(analyzeButton);

      expect(mockKeyboardDismiss).toHaveBeenCalled();
    });

    it('handleAnalyzePress setError(null) çağırır', () => {
      const { getByPlaceholderText, getByText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // Butona bas
      const analyzeButton = getByText('dream.analyze.button_analyze');
      fireEvent.press(analyzeButton);

      // setError(null) çağrıldığı için mutation.mutate çağrılmış olmalı
      expect(mockMutate).toHaveBeenCalled();
      expect(mockKeyboardDismiss).toHaveBeenCalled();
    });
  });

  describe('6. Mutation onSuccess', () => {
    it('mutation başarılı olunca router.replace ve toast çağrılır', async () => {
      const mockRouter = { back: jest.fn(), replace: jest.fn() };
      require('expo-router').useRouter.mockImplementation(() => mockRouter);

      // onSuccess callback'ini yakala
      let onSuccessCallback: ((eventId: string) => void) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      render(<AnalyzeDreamScreen />);

      // onSuccess'i manuel olarak çağır
      onSuccessCallback?.('dream-new-123');

      await waitFor(() => {
        // Router.replace çağrıldı mı?
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/dream/result',
          params: { id: 'dream-new-123' },
        });

        // Toast gösterildi mi?
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'dream.analyze.toast_success_title',
          text2: 'dream.analyze.toast_success_body',
        });

        // Query invalidate edildi mi?
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['dreamEvents'],
        });
      });
    });
  });

  describe('7. Mutation onError', () => {
    it('normal hata olunca error toast gösterilir', async () => {
      // onError callback'ini yakala
      let onErrorCallback: ((e: Error) => void) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        onErrorCallback = options.onError;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByText } = render(<AnalyzeDreamScreen />);

      const testError = new Error('Analiz başarısız oldu');
      onErrorCallback?.(testError);

      await waitFor(() => {
        // Error state set edildi mi?
        expect(getByText('Analiz başarısız oldu')).toBeTruthy();

        // Error toast gösterildi mi?
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'dream.analyze.toast_error_title',
          text2: 'Analiz başarısız oldu',
        });
      });
    });

    it('limit hatası olunca info toast gösterilir', async () => {
      // onError callback'ini yakala
      let onErrorCallback: ((e: Error) => void) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        onErrorCallback = options.onError;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      render(<AnalyzeDreamScreen />);

      const limitError = new Error('Günlük limit aşıldı');
      onErrorCallback?.(limitError);

      await waitFor(() => {
        // Limit hatası için info toast gösterilmeli
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'info',
          text1: 'dream.analyze.toast_limit_title',
          text2: 'Günlük limit aşıldı',
        });
      });
    });

    it('error message boş olsa bile fallback gösterilir', async () => {
      // onError callback'ini yakala
      let onErrorCallback: ((e: Error) => void) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        onErrorCallback = options.onError;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      render(<AnalyzeDreamScreen />);

      const emptyError = new Error('');
      onErrorCallback?.(emptyError);

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'dream.analyze.toast_error_title',
          text2: 'dream.analyze.toast_error_body',
        });
      });
    });
  });

  describe('8. Navigation', () => {
    it('geri butonuna basılınca router.back çağrılır', () => {
      const mockRouter = { back: jest.fn(), replace: jest.fn() };
      require('expo-router').useRouter.mockImplementation(() => mockRouter);

      const { getByTestId } = render(<AnalyzeDreamScreen />);

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('9. useMutation Parameters', () => {
    it('useMutation doğru parametrelerle çağrılır', () => {
      render(<AnalyzeDreamScreen />);

      expect(mockUseMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
    });
  });

  describe('10. Edge Cases', () => {
    it('vault data null olsa bile component çalışır', () => {
      mockUseVault.mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      expect(() => {
        render(<AnalyzeDreamScreen />);
      }).not.toThrow();
    });

    it('whitespace karakterler trim edilerek sayılır', () => {
      const { getByPlaceholderText, getByText } = render(<AnalyzeDreamScreen />);

      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, '     Boşluklu metin     ');

      // trim sonrası 14 karakter ("Boşluklu metin")
      expect(getByText(/14/)).toBeTruthy();
      expect(getByText(/20/)).toBeTruthy();
    });
  });

  describe('11. MutationFn - canUserAnalyzeDream Kontrolü', () => {
    it('canAnalyze false ise error fırlatır', async () => {
      mockCanUserAnalyzeDream.mockResolvedValue({
        canAnalyze: false,
      } as any);

      // mutationFn'i yakala ve direkt çağır
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      render(<AnalyzeDreamScreen />);

      // mutationFn'i çağır - error fırlatmalı
      await expect(mutationFn?.()).rejects.toThrow('Günlük rüya analizi limitinize ulaştınız.');
    });

    it('20 karakterden az ise error fırlatır', async () => {
      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Kısa text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Kısa');

      // mutationFn'i çağır - error fırlatmalı
      await expect(mutationFn?.()).rejects.toThrow('Lütfen rüyanızı biraz daha detaylı anlatın.');
    });

    it('supabase error varsa error fırlatır', async () => {
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Supabase error'),
      }) as any;

      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Yeterli text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // mutationFn'i çağır - error fırlatmalı
      await expect(mutationFn?.()).rejects.toThrow('Supabase error');
    });

    it('eventId dönemezse error fırlatır', async () => {
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }) as any;

      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Yeterli text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // mutationFn'i çağır - error fırlatmalı
      await expect(mutationFn?.()).rejects.toThrow('Analiz tamamlandı ama event ID alınamadı');
    });

    it('başarılı olunca eventId döner', async () => {
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: 'dream-success-123',
        error: null,
      }) as any;

      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Yeterli text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // mutationFn'i çağır - eventId dönmeli
      const result = await mutationFn?.();
      expect(result).toBe('dream-success-123');
    });

    it('data obje ise eventId field\'ından alır', async () => {
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: { eventId: 'dream-obj-123', otherField: 'test' },
        error: null,
      }) as any;

      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Yeterli text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // mutationFn'i çağır - eventId dönmeli
      const result = await mutationFn?.();
      expect(result).toBe('dream-obj-123');
    });

    it('supabase invoke doğru parametrelerle çağrılır', async () => {
      // mutationFn'i yakala
      let mutationFn: (() => Promise<string>) | undefined;
      mockUseMutation.mockImplementation((options: any) => {
        mutationFn = options.mutationFn;
        return {
          mutate: mockMutate,
          isPending: false,
        } as any;
      });

      const { getByPlaceholderText } = render(<AnalyzeDreamScreen />);

      // Text yaz
      const textInput = getByPlaceholderText('dream.analyze.placeholder');
      fireEvent.changeText(textInput, 'Bu rüya metni yeterince uzun bir metin olmalı');

      // mutationFn'i çağır
      await mutationFn?.();

      // supabase.functions.invoke doğru parametrelerle çağrıldı mı?
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('orchestrator', {
        body: {
          eventPayload: {
            type: 'dream_analysis',
            data: {
              dreamText: 'Bu rüya metni yeterince uzun bir metin olmalı',
              language: 'tr',
            },
          },
        },
      });
    });
  });
});
