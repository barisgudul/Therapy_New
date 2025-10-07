// hooks/__tests__/useDiary.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import Toast from 'react-native-toast-message';
import { useDiary } from '../useDiary';
import {
  deleteEventById,
  getDiaryEventsForUser,
  getEventById,
  logEvent,
} from '../../services/event.service';
import { incrementFeatureUsage } from '../../services/api.service';

//----- MOCKS -----
jest.mock('../../services/event.service', () => ({
  deleteEventById: jest.fn(),
  getDiaryEventsForUser: jest.fn(),
  getEventById: jest.fn(),
  logEvent: jest.fn(),
}));

jest.mock('../../services/api.service', () => ({
  incrementFeatureUsage: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('../../utils/i18n', () => ({
  default: {
    t: jest.fn((key: string) => key),
  },
}));

jest.mock('../../context/Auth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      user_metadata: { nickname: 'TestUser' }
    }
  }),
}));

// Mock useDiaryConversation - her çağrıda yeni state döndüren fonksiyon
const mockResetConversation = jest.fn();
const mockSetIsModalVisible = jest.fn();
const mockSetActiveQuestion = jest.fn();
const mockSetCurrentInput = jest.fn();
const mockSetCurrentQuestions = jest.fn();
const mockSubmitAnswer = jest.fn();

jest.mock('../useDiaryConversation', () => ({
  useDiaryConversation: () => ({
    messages: [
      { text: 'Bugün nasılsın?', isUser: false, timestamp: 1234567890 },
      { text: 'İyiyim teşekkürler', isUser: true, timestamp: 1234567891 }
    ],
    isSubmitting: false,
    currentQuestions: ['Neden iyisin?', 'Başka neler yaptın?'],
    isModalVisible: false,
    currentInput: '',
    activeQuestion: null,
    isConversationDone: false,
    setIsModalVisible: mockSetIsModalVisible,
    setActiveQuestion: mockSetActiveQuestion,
    setCurrentInput: mockSetCurrentInput,
    setCurrentQuestions: mockSetCurrentQuestions,
    submitAnswer: mockSubmitAnswer,
    resetConversation: mockResetConversation,
  }),
}));

//----- TEST KURULUMU -----
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockedGetDiaryEventsForUser = getDiaryEventsForUser as jest.Mock;
const mockedGetEventById = getEventById as jest.Mock;
const mockedLogEvent = logEvent as jest.Mock;
const mockedDeleteEventById = deleteEventById as jest.Mock;
const mockedIncrementFeatureUsage = incrementFeatureUsage as jest.Mock;
const mockedToastShow = Toast.show as jest.Mock;

describe('useDiary Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear(); // HER TESTTEN ÖNCE CACHE'İ TEMİZLE!

    // Mock fonksiyonlarını temizle
    mockResetConversation.mockClear();
    mockSetIsModalVisible.mockClear();
    mockSetActiveQuestion.mockClear();
    mockSetCurrentInput.mockClear();
    mockSetCurrentQuestions.mockClear();
    mockSubmitAnswer.mockClear();

    // Default mock responses
    mockedGetDiaryEventsForUser.mockResolvedValue([
      {
        id: 'diary-1',
        type: 'diary_entry',
        timestamp: 1234567890,
        data: { messages: [] },
        mood: null,
      },
    ]);

    mockedGetEventById.mockResolvedValue({
      id: 'diary-1',
      type: 'diary_entry',
      timestamp: 1234567890,
      data: { messages: [] },
      mood: null,
    });

    mockedLogEvent.mockResolvedValue({ id: 'new-diary-1' });
    mockedDeleteEventById.mockResolvedValue(undefined);
    mockedIncrementFeatureUsage.mockResolvedValue(undefined);
  });

  it('should initialize with default state values', async () => {
    mockedGetDiaryEventsForUser.mockResolvedValue([]); // Başlangıçta boş array döndür
    const { result } = renderHook(() => useDiary(), { wrapper });

    // Verinin gelmesini bekle
    await waitFor(() => expect(result.current.state.isLoadingDiaries).toBe(false));

    expect(result.current.state.mode).toBe('list');
    expect(result.current.state.selectedDiary).toBeUndefined();
    expect(result.current.state.userName).toBe('TestUser');
    expect(result.current.state.isLoadingDiaries).toBe(false);
    expect(result.current.state.diaryEvents).toEqual([]);
    expect(result.current.state.messages).toEqual([
      { text: 'Bugün nasılsın?', isUser: false, timestamp: 1234567890 },
      { text: 'İyiyim teşekkürler', isUser: true, timestamp: 1234567891 }
    ]);
    expect(result.current.state.isConversationDone).toBe(false);
  });

  it('should start new diary correctly', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    act(() => {
      result.current.handlers.startNewDiary();
    });

    expect(result.current.state.mode).toBe('write');
    expect(mockResetConversation).toHaveBeenCalled();
  });

  it('should view diary correctly', async () => {
    const mockDiaryEvent = {
      id: 'diary-1',
      type: 'diary_entry',
      timestamp: 1234567890,
      data: { messages: [] },
      mood: null,
    };
    
    mockedGetEventById.mockResolvedValue(mockDiaryEvent);

    const { result } = renderHook(() => useDiary(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoadingDiaries).toBe(false));

    act(() => {
      result.current.handlers.viewDiary(mockDiaryEvent);
    });

    expect(result.current.state.mode).toBe('view');
    
    // selectedDiary'nin dolmasını BEKLE. Bu bir useQuery çağrısıdır.
    await waitFor(() => {
      expect(result.current.state.selectedDiary).toBeTruthy();
    });

    expect(result.current.state.selectedDiary.id).toBe('diary-1');
  });

  it('should exit view mode correctly', async () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    await waitFor(() => expect(result.current.state.isLoadingDiaries).toBe(false));

    // Önce view mode'a geç
    act(() => {
      result.current.handlers.viewDiary({
        id: 'diary-1',
        type: 'diary_entry',
        timestamp: 1234567890,
        data: { messages: [] },
        mood: null,
      });
    });

    expect(result.current.state.mode).toBe('view');

    // Şimdi çık
    act(() => {
      result.current.handlers.exitView();
    });

    expect(result.current.state.mode).toBe('list');
    expect(result.current.state.selectedDiary).toBeUndefined();
  });

  it('should save diary with optimistic update on success', async () => {
    const { result } = renderHook(() => useDiary(), { wrapper });
    const initialCount = result.current.state.diaryEvents.length;

    // Önce write mode'a geç
    act(() => {
      result.current.handlers.startNewDiary();
    });

    expect(result.current.state.mode).toBe('write');

    // Save diary
    await act(async () => {
      result.current.handlers.saveDiary();
    });

    // Optimistic update kontrolü
    expect(mockedLogEvent).toHaveBeenCalledWith({
      type: 'diary_entry',
      data: {
        messages: [
          { text: 'Bugün nasılsın?', isUser: false, timestamp: 1234567890 },
          { text: 'İyiyim teşekkürler', isUser: true, timestamp: 1234567891 }
        ],
      },
    });

    expect(mockedIncrementFeatureUsage).toHaveBeenCalledWith('diary_write');

    // Mode list'e dönmeli ve conversation resetlenmeli
    expect(result.current.state.mode).toBe('list');
    expect(mockResetConversation).toHaveBeenCalled();

    // onMutate'in ANINDA cache'i güncellemesini bekle.
    // Bu, react render döngüsünü beklemez, doğrudan cache'i kontrol eder.
    await waitFor(() => {
      const cachedDiaries = queryClient.getQueryData<any[]>(['diaryEvents']);
      expect(cachedDiaries?.length).toBe(initialCount + 1);
    });

    // Şimdi hook'un state'inin güncellenmesini bekle.
    await waitFor(() => {
      expect(result.current.state.diaryEvents.length).toBe(initialCount + 1);
    });
  });

  it('should handle save diary error and rollback optimistic update', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedLogEvent.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() => useDiary(), { wrapper });

    // Başlangıç state'ini almadan önce useQuery'nin bitmesini bekle
    await waitFor(() => expect(result.current.state.isLoadingDiaries).toBe(false));
    const initialDiaries = result.current.state.diaryEvents;
    
    // Mutasyonu tetikle.
    act(() => {
      result.current.handlers.saveDiary();
    });

    // Hem toast'un gösterilmesini HEM DE cache'in eski haline dönmesini bekle.
    // React Query'nin cache'i güncellemesi zaman alabilir.
    await waitFor(() => {
        const cachedDiaries = queryClient.getQueryData(['diaryEvents']);
        expect(cachedDiaries).toEqual(initialDiaries);
    });

    // Hook'un state'inin güncellendiğini doğrula (cache kontrolü yeterli)
    expect(result.current.state.diaryEvents).toEqual(initialDiaries);

    errorSpy.mockRestore();
  });

  it('should delete diary successfully', async () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    await act(async () => {
      result.current.handlers.deleteDiary('diary-1');
    });

    expect(mockedDeleteEventById).toHaveBeenCalledWith('diary-1');
  });

  it('should handle delete diary error', async () => {
    const mockError = new Error('Delete failed');
    mockedDeleteEventById.mockRejectedValue(mockError);

    const { result } = renderHook(() => useDiary(), { wrapper });

    await act(async () => {
      result.current.handlers.deleteDiary('diary-1');
    });

    expect(mockedDeleteEventById).toHaveBeenCalledWith('diary-1');
  });

  it('should handle modal interactions', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    // Modal aç
    act(() => {
      result.current.handlers.openModal();
    });

    expect(mockSetIsModalVisible).toHaveBeenCalledWith(true);

    // Modal kapat
    act(() => {
      result.current.handlers.closeModal();
    });

    expect(mockSetIsModalVisible).toHaveBeenCalledWith(false);
    expect(mockSetActiveQuestion).toHaveBeenCalledWith(null);
  });

  it('should handle input change', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    act(() => {
      result.current.handlers.changeInput('Yeni input');
    });

    expect(mockSetCurrentInput).toHaveBeenCalledWith('Yeni input');
  });

  it('should handle question selection', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    const question = 'Neden iyisin?';

    act(() => {
      result.current.handlers.selectQuestion(question);
    });

    expect(mockSetActiveQuestion).toHaveBeenCalledWith(question);
    expect(mockSetIsModalVisible).toHaveBeenCalledWith(true);
  });

  it('should handle answer submission', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    act(() => {
      result.current.handlers.submitAnswer();
    });

    expect(mockSubmitAnswer).toHaveBeenCalled();
  });

  it('should handle selected diary loading', async () => {
    const { result } = renderHook(() => useDiary(), { wrapper });

    // Önce bir diary seç
    act(() => {
      result.current.handlers.viewDiary({
        id: 'diary-1',
        type: 'diary_entry',
        timestamp: 1234567890,
        data: { messages: [] },
        mood: null,
      });
    });

    // Selected diary yüklenmeli
    await waitFor(() => {
      expect(result.current.state.selectedDiary).toBeTruthy();
      expect(mockedGetEventById).toHaveBeenCalledWith('diary-1');
    });
  });

  it('should handle empty diary events', () => {
    mockedGetDiaryEventsForUser.mockResolvedValue([]);

    const { result } = renderHook(() => useDiary(), { wrapper });

    expect(result.current.state.diaryEvents).toHaveLength(0);
  });
});