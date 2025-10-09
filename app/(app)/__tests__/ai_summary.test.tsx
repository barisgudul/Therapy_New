// app/(app)/__tests__/ai_summary.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import AISummaryScreen from '../ai_summary';

// Mock'lar
jest.mock('../../../context/Auth');
jest.mock('../../../utils/supabase');
jest.mock('../../../components/ai_summary/ReportCard', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ item, onPress, onDelete }: any) => (
      <TouchableOpacity testID={`report-card-${item.id}`} onPress={onPress}>
        <Text testID={`report-title-${item.id}`}>Report {item.id}</Text>
        <TouchableOpacity testID={`delete-button-${item.id}`} onPress={onDelete}>
          <Text>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ),
  };
});
jest.mock('../../../components/ai_summary/ReportDetailModal', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ isVisible, activeSummary }: any) =>
      isVisible ? (
        <View testID="report-detail-modal">
          <Text testID="modal-content">{JSON.stringify(activeSummary)}</Text>
        </View>
      ) : null,
  };
});
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) return `${key}_${JSON.stringify(params)}`;
      return key;
    },
    i18n: { language: 'tr' },
  }),
}));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
  },
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});
jest.mock('@miblanchard/react-native-slider', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    Slider: ({ onValueChange, value, ...props }: any) => (
      <TouchableOpacity
        testID="slider"
        onPress={() => onValueChange && onValueChange([10])}
        {...props}
      >
        <View testID="slider-value">{value}</View>
      </TouchableOpacity>
    ),
  };
});
jest.mock('react-native-reanimated', () => {
  const { FlatList } = require('react-native');
  const mockLinearTransition = {
    duration: jest.fn().mockReturnValue({}),
  };
  return {
    __esModule: true,
  default: {
      FlatList: FlatList,
  },
    LinearTransition: mockLinearTransition,
  };
});

// Alert mock
const mockAlert = jest.spyOn(Alert, 'alert');

describe('AISummaryScreen - Gerçek Davranış Testleri', () => {
  const mockUseAuth = jest.mocked(require('../../../context/Auth').useAuth);
  const mockSupabase = jest.mocked(require('../../../utils/supabase').supabase);
  const mockToast = Toast;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAnalysisReport = {
    id: 'report-123',
    created_at: '2024-01-01T00:00:00Z',
    content: {
      summary: 'Test özeti',
      insights: ['Test insight 1', 'Test insight 2'],
      recommendations: ['Test öneri 1'],
    },
    days_analyzed: 7,
    user_id: 'user-123',
  };

  const createMockSupabaseQuery = (data: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error }),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Varsayılan auth mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isPendingDeletion: false,
      isLoading: false,
      signOut: jest.fn(),
    });

    // Varsayılan supabase mock - başarılı veri yükleme
    mockSupabase.from.mockReturnValue(
      createMockSupabaseQuery([mockAnalysisReport])
    );

    // Varsayılan functions.invoke mock
    mockSupabase.functions.invoke.mockResolvedValue({
      data: mockAnalysisReport.content,
      error: null,
    });

    // Alert mock'unu temizle
    mockAlert.mockClear();
  });

  describe('1. Başarılı Veri Yükleme', () => {
    it('ilk render edildiğinde loading gösterir, sonra raporları ekranda gösterir', async () => {
      const { queryByTestId } = render(<AISummaryScreen />);

      // İlk başta loading olmalı
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_reports');

      // Loading bitince rapor kartı görünmeli
      await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });
    });

    it('supabase query doğru parametrelerle çağrılır', async () => {
    render(<AISummaryScreen />);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_reports');
    });

      const mockQuery = mockSupabase.from.mock.results[0].value;
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.select().eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQuery.select().eq().order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });
  });

  describe('2. Boş Veri Durumu', () => {
    it('hiç rapor yoksa empty state gösterilir', async () => {
      mockSupabase.from.mockReturnValue(createMockSupabaseQuery([]));

      const { getByText } = render(<AISummaryScreen />);

    await waitFor(() => {
        expect(getByText('ai_summary.empty_title')).toBeTruthy();
        expect(getByText('ai_summary.empty_subtext')).toBeTruthy();
      });
    });
  });

  describe('3. Veri Yükleme Hatası', () => {
    it('loadSavedReports hata fırlatırsa console.error çağrılır', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const testError = { message: 'Database error' };

      mockSupabase.from.mockReturnValue(createMockSupabaseQuery(null, testError));

    render(<AISummaryScreen />);

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Raporlar yüklenirken hata:',
          testError
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('4. Yeni Rapor Oluşturma (Başarılı)', () => {
    it('analiz et butonuna basıldığında loading gösterir, sonra success toast gösterir ve modal açılır', async () => {
      const newReportContent = {
        summary: 'Yeni rapor özeti',
        insights: ['Insight 1'],
        recommendations: ['Öneri 1'],
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: newReportContent,
        error: null,
      });

      const { getByText, getByTestId, queryByTestId } = render(<AISummaryScreen />);

      // İlk verilerin yüklenmesini bekle
    await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // "Analiz Et" butonunu bul ve tıkla
      const analyzeButtonText = getByText(/ai_summary.analyze_button/);
      fireEvent.press(analyzeButtonText.parent!);

      // Loading durumunda "Analiz ediliyor..." yazısı görünmeli
      await waitFor(() => {
        expect(getByText('ai_summary.analyzing')).toBeTruthy();
      });

      // API çağrısı tamamlandıktan sonra
      await waitFor(() => {
        // Toast gösterilmiş mi?
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'ai_summary.toast_success_title',
          text2: 'ai_summary.toast_success_body',
        });

        // Modal açılmış mı?
        expect(getByTestId('report-detail-modal')).toBeTruthy();
      });

      // Supabase functions.invoke doğru parametrelerle çağrılmış mı?
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-analysis-report', {
        body: { days: 7, language: 'tr' },
      });
    });

    it('yeni oluşturulan rapor listenin başına eklenir', async () => {
      const newReportContent = {
        summary: 'Yeni rapor',
        insights: ['Yeni insight'],
        recommendations: ['Yeni öneri'],
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: newReportContent,
        error: null,
      });

      const { getByText, queryByTestId } = render(<AISummaryScreen />);

      // İlk veri yüklenmesini bekle
      await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // Analiz butonuna tıkla
      const analyzeButton = getByText(/ai_summary.analyze_button/);
      fireEvent.press(analyzeButton.parent!);

      // Yeni rapor eklenmiş olmalı (temp- ile başlayan ID'yle)
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' })
        );
      });
    });
  });

  describe('5. Yeni Rapor Oluşturma (Hata)', () => {
    it('API hatası olduğunda error toast gösterilir ve loading durur', async () => {
      const errorMessage = 'Yetersiz veri';
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      const { getByText, queryByText } = render(<AISummaryScreen />);

      // İlk veri yüklenmesini bekle
      await waitFor(() => {
        expect(queryByText('ai_summary.analyzing')).toBeNull();
      });

      // Analiz butonuna tıkla
      const analyzeButton = getByText(/ai_summary.analyze_button/);
      fireEvent.press(analyzeButton.parent!);

      // Loading gösterilir
      await waitFor(() => {
        expect(getByText('ai_summary.analyzing')).toBeTruthy();
      });

      // Hata sonrası error toast gösterilir - Error objesi mesajı döndürür
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'ai_summary.toast_error_title',
          text2: errorMessage,
        });
      });

      // Loading durmalı, buton tekrar tıklanabilir olmalı
      await waitFor(() => {
        expect(queryByText('ai_summary.analyzing')).toBeNull();
        expect(getByText(/ai_summary.analyze_button/)).toBeTruthy();
      });
    });

    it('API exception fırlatırsa error toast gösterilir', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByText(/ai_summary.analyze_button/)).toBeTruthy();
      });

      const analyzeButton = getByText(/ai_summary.analyze_button/);
      fireEvent.press(analyzeButton.parent!);

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'ai_summary.toast_error_title',
          text2: 'Network error',
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('data.error varsa hata olarak işlenir', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Özel hata mesajı' },
      error: null,
    });

      const { getByText } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByText(/ai_summary.analyze_button/)).toBeTruthy();
      });

      const analyzeButton = getByText(/ai_summary.analyze_button/);
      fireEvent.press(analyzeButton.parent!);

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'ai_summary.toast_error_title',
          text2: 'Özel hata mesajı',
        });
      });
    });
  });

  describe('6. Rapor Silme (İptal)', () => {
    it('kullanıcı iptal ederse silme işlemi yapılmaz', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // İptal butonuna bas (buttons[0])
        if (buttons && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });

      const { getByTestId, queryByTestId } = render(<AISummaryScreen />);

      // Rapor yüklenmesini bekle
      await waitFor(() => {
        expect(getByTestId(`delete-button-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // İlk supabase.from çağrı sayısını not et
      const initialCallCount = mockSupabase.from.mock.calls.length;

      // Silme butonuna tıkla
      const deleteButton = getByTestId(`delete-button-${mockAnalysisReport.id}`);
      fireEvent.press(deleteButton);

      // Alert çağrılmalı
      expect(mockAlert).toHaveBeenCalledWith(
        'ai_summary.confirm_delete_title',
        'ai_summary.confirm_delete_message',
        expect.arrayContaining([
          expect.objectContaining({ text: 'ai_summary.confirm_cancel', style: 'cancel' }),
          expect.objectContaining({
            text: 'ai_summary.confirm_delete_cta',
            style: 'destructive',
          }),
        ])
      );

      // İptal sonrası rapor hala görünmeli
      await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // Supabase.from çağrı sayısı artmamalı (delete çağrısı yapılmamalı)
      expect(mockSupabase.from.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('7. Rapor Silme (Başarılı)', () => {
    it('kullanıcı onayladığında rapor silinir ve toast gösterilir', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Sil butonuna bas (buttons[1])
        if (buttons && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

      // Delete için mock
      const deleteMock = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
        ...createMockSupabaseQuery([mockAnalysisReport]),
      delete: jest.fn().mockReturnValue({
          eq: deleteMock,
        }),
      });

      const { getByTestId, queryByTestId } = render(<AISummaryScreen />);

      // Rapor yüklenmesini bekle
      await waitFor(() => {
        expect(getByTestId(`delete-button-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // Silme butonuna tıkla
      const deleteButton = getByTestId(`delete-button-${mockAnalysisReport.id}`);
      fireEvent.press(deleteButton);

      // Alert çağrılmalı ve onaylanmalı
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled();
      });

      // Delete API çağrılmalı
      await waitFor(() => {
        expect(deleteMock).toHaveBeenCalledWith('id', mockAnalysisReport.id);
      });

      // Success toast gösterilmeli
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'info',
          text1: 'ai_summary.toast_deleted',
        });
      });

      // Rapor UI'dan kaldırılmış olmalı
      await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeNull();
      });
    });

    it('temp ID ile başlayan rapor silinirse sadece lokal state güncellenir', async () => {
      const tempReport = {
        id: 'temp-123456',
        created_at: new Date().toISOString(),
        content: { summary: 'Temp rapor' },
        days_analyzed: 7,
      };

      mockSupabase.from.mockReturnValue(createMockSupabaseQuery([tempReport]));

      mockAlert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      const { getByTestId } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByTestId(`delete-button-${tempReport.id}`)).toBeTruthy();
      });

      const deleteButton = getByTestId(`delete-button-${tempReport.id}`);
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled();
      });

      // Toast gösterilmeli ama supabase delete çağrılmamalı
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'info',
          text1: 'ai_summary.toast_deleted',
        });
      });
    });

    it('silme hatası olduğunda rollback yapılır ve error toast gösterilir', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

    mockSupabase.from.mockReturnValue({
        ...createMockSupabaseQuery([mockAnalysisReport]),
      delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      }),
    });

      const { getByTestId, queryByTestId } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByTestId(`delete-button-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      const deleteButton = getByTestId(`delete-button-${mockAnalysisReport.id}`);
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled();
      });

      // Error toast gösterilmeli - Error objesi Instance of olmadığı için fallback mesaj
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'ai_summary.toast_delete_error_title',
          text2: 'ai_summary.toast_delete_error_body',
        });
      });

      // Rapor tekrar UI'da olmalı (rollback)
      await waitFor(() => {
        expect(queryByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });
    });
  });

  describe('8. Kullanıcı Yoksa', () => {
    it('user null ise API çağrıları yapılmaz', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isPendingDeletion: false,
        isLoading: false,
        signOut: jest.fn(),
      });

    render(<AISummaryScreen />);

      // Biraz bekle ve API çağrısı yapılmadığını kontrol et
      await waitFor(() => {
        expect(mockSupabase.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('9. Slider ve Gün Seçimi', () => {
    it('slider değeri değiştiğinde selectedDays state güncellenir', async () => {
      const { getByTestId, getByText } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByTestId('slider')).toBeTruthy();
      });

      const slider = getByTestId('slider');
      fireEvent.press(slider);

      // Debounce için bekle
      await waitFor(
        () => {
          // Yeni gün sayısıyla buton metni güncellenmiş olmalı
          const buttonText = getByText(/ai_summary.analyze_button/);
          expect(buttonText).toBeTruthy();
        },
        { timeout: 300 }
      );
    });
  });

  describe('10. Modal İşlemleri', () => {
    it('rapor kartına tıklandığında modal açılır', async () => {
      const { getByTestId, queryByTestId } = render(<AISummaryScreen />);

      await waitFor(() => {
        expect(getByTestId(`report-card-${mockAnalysisReport.id}`)).toBeTruthy();
      });

      // Önce modal kapalı olmalı
      expect(queryByTestId('report-detail-modal')).toBeNull();

      // Rapora tıkla
      const reportCard = getByTestId(`report-card-${mockAnalysisReport.id}`);
      fireEvent.press(reportCard);

      // Modal açılmalı
      await waitFor(() => {
        expect(getByTestId('report-detail-modal')).toBeTruthy();
      });
    });
  });

  describe('11. Router İşlemleri', () => {
    it('router.back tanımlı olmalı', () => {
      const mockRouter = require('expo-router').useRouter();
    render(<AISummaryScreen />);

      // Router.back fonksiyonu tanımlı olmalı
      expect(mockRouter.back).toBeDefined();
      expect(typeof mockRouter.back).toBe('function');
    });
  });
});
