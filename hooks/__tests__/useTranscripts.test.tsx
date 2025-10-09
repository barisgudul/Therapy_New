// hooks/__tests__/useTranscripts.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTranscripts } from '../useTranscripts';
import {
  getEventsForLast,
  getSessionSummariesForEventIds,
  getSummaryForSessionEvent,
  type AppEvent,
} from '../../services/event.service';
import { supabase } from '../../utils/supabase';
import { showDeleteConfirmation, showErrorDialog } from '../../utils/dialog';

//----- MOCKS -----
jest.mock('../../services/event.service', () => ({
  getEventsForLast: jest.fn(),
  getSessionSummariesForEventIds: jest.fn(),
  getSummaryForSessionEvent: jest.fn(),
}));

// Global mock kullanılıyor

jest.mock('../../utils/dialog', () => ({
  showDeleteConfirmation: jest.fn(),
  showErrorDialog: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

const mockNavigation = {
  goBack: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

// useFocusEffect'i doğru şekilde mock'la
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    mockUseFocusEffect(callback);
    // Focus effect'i hemen çalıştırma - sadece kaydet
  },
}));

//----- TEST KURULUMU -----
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockedGetEventsForLast = getEventsForLast as jest.Mock;
const mockedGetSessionSummariesForEventIds = getSessionSummariesForEventIds as jest.Mock;
const mockedGetSummaryForSessionEvent = getSummaryForSessionEvent as jest.Mock;
const mockedSupabaseInvoke = supabase.functions.invoke as jest.Mock;
const mockedShowDeleteConfirmation = showDeleteConfirmation as jest.Mock;
const mockedShowErrorDialog = showErrorDialog as jest.Mock;

describe('useTranscripts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear(); // HER TESTTEN ÖNCE CACHE'İ TEMİZLE!
    
    // Default mock responses
    mockedGetEventsForLast.mockResolvedValue([]);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to trigger focus effect
  const triggerFocusEffect = async () => {
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await act(async () => {
      await focusCallback();
    });
  };

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });

    expect(result.current.state.isLoading).toBe(true);
    expect(result.current.state.viewMode).toBe('menu');
    expect(result.current.state.allEvents).toEqual([]);
    expect(result.current.state.selectedSessionType).toBe(null);
    expect(result.current.state.error).toBe(null);
  });

  it('should call useFocusEffect on mount', () => {
    renderHook(() => useTranscripts(), { wrapper });
    
    // useFocusEffect çağrılmış olmalı
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should trigger focus effect manually', async () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });
    
    // Focus effect callback'ini al ve manuel olarak çalıştır
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    
    await act(async () => {
      await focusCallback();
    });
    
    // State güncellenmiş olmalı
    expect(result.current.state.isLoading).toBe(false);
  });

  it('should fetch and process events correctly on focus', async () => {
    // Mock data
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 86400000, // 1 gün önce
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-1',
        type: 'session_end',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-2',
        type: 'session_end',
        timestamp: Date.now() - 172800000, // 2 gün önce
        created_at: new Date(Date.now() - 172800000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    const mockSummaries = {
      'session-end-1': 'Bu harika bir seanstı',
    };

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue(mockSummaries);
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    // Focus effect callback'ini al ve manuel olarak çalıştır
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    
    await act(async () => {
      await focusCallback();
    });

    // Events işlenmiş olmalı
    expect(result.current.state.allEvents).toHaveLength(3);
    expect(result.current.state.allEvents[0].summary).toBe('Bu harika bir seanstı');
    expect(result.current.state.error).toBe(null);
  });

  it('should handle empty events list', async () => {
    mockedGetEventsForLast.mockResolvedValue([]);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    expect(result.current.state.allEvents).toEqual([]);
  });

  it('should deduplicate session_end events correctly', async () => {
    // Aynı gün içinde birden fazla session_end
    const mockEvents: AppEvent[] = [
      {
        id: 'session-end-1',
        type: 'session_end',
        timestamp: Date.now() - 3600000, // 1 saat önce
        created_at: new Date(Date.now() - 3600000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-2',
        type: 'session_end',
        timestamp: Date.now() - 1800000, // Aynı gün, 30 dakika önce (daha yeni)
        created_at: new Date(Date.now() - 1800000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 172800000,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({
      'session-end-1': 'İlk özet',
      'session-end-2': 'İkinci özet',
    });
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // Sadece en yeni session_end kalmalı
    const sessionEnds = result.current.state.allEvents.filter(e => e.type === 'session_end');
    expect(sessionEnds).toHaveLength(1);
    expect(sessionEnds[0].id).toBe('session-end-2'); // Daha yeni olan
  });

  it('should handle fetch error correctly', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockError = new Error('Network error');
    mockedGetEventsForLast.mockRejectedValue(mockError);

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    expect(result.current.state.error).toBe('Veriler yüklenirken bir sorun oluştu.');
    expect(result.current.state.allEvents).toEqual([]);

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should select session type correctly', () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });

    act(() => {
      result.current.actions.handleSelectSessionType('text_session');
    });

    expect(result.current.state.selectedSessionType).toBe('text_session');
    expect(result.current.state.viewMode).toBe('summaryList');
  });

  it('should handle session deletion with optimistic update', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);
    mockedSupabaseInvoke.mockResolvedValue({ error: null });
    
    // Supabase delete mock'unu başarılı yap
    (supabase.from as jest.Mock).mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
    });

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    const initialEventCount = result.current.state.allEvents.length;

    // Delete confirmation callback'i mock'la
    let deleteCallback: () => void;
    mockedShowDeleteConfirmation.mockImplementation((callback) => {
      deleteCallback = callback;
    });

    act(() => {
      result.current.actions.handleDeleteEvent('text-session-1');
    });

    // Confirmation dialog gösterilmeli
    expect(mockedShowDeleteConfirmation).toHaveBeenCalled();

    // Simulate user confirmation first
    if (deleteCallback) {
      await act(async () => {
        await deleteCallback();
      });
    }

    // Optimistic update - event kaldırılmalı (state güncellemesini bekle)
    await waitFor(() => {
      expect(result.current.state.allEvents).toHaveLength(initialEventCount - 1);
    }, { timeout: 2000 });

    // API çağrısı yapılmalı
    expect(mockedSupabaseInvoke).toHaveBeenCalledWith(
      'delete-session-and-memories',
      { body: { event_id: 'text-session-1' } }
    );
  });

  it('should rollback deletion on API error', async () => {
    // KONSOLU SUSTUR
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);
    mockedSupabaseInvoke.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    const initialEvents = [...result.current.state.allEvents];

    // Delete confirmation callback'i mock'la
    let deleteCallback: () => void;
    mockedShowDeleteConfirmation.mockImplementation((callback) => {
      deleteCallback = callback;
    });

    act(() => {
      result.current.actions.handleDeleteEvent('text-session-1');
    });

    // Simulate user confirmation with error
    if (deleteCallback) {
      await act(async () => {
        await deleteCallback();
      });
    }

    // Error dialog gösterilmeli
    expect(mockedShowErrorDialog).toHaveBeenCalled();

    // Event geri eklenmeli
    expect(result.current.state.allEvents).toEqual(initialEvents);

    // KONSOLU ESKİ HALİNE GETİR
    errorSpy.mockRestore();
  });

  it('should handle navigation to premium', () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });

    act(() => {
      result.current.actions.handleNavigateToPremium();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/therapy/therapy_options');
  });

  it('should navigate to session correctly', () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });

    act(() => {
      result.current.actions.navigateToSession('event-123', 'happy', 'Great session');
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('eventId=event-123')
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('mood=happy')
    );
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringContaining('summary=')
    );
  });

  it('should set view mode to menu', () => {
    const { result } = renderHook(() => useTranscripts(), { wrapper });

    // Önce farklı mode'a geç
    act(() => {
      result.current.actions.handleSelectSessionType('text_session');
    });

    expect(result.current.state.viewMode).toBe('summaryList');

    // Menu mode'a dön
    act(() => {
      result.current.actions.setViewModeToMenu();
    });

    expect(result.current.state.viewMode).toBe('menu');
  });

  it('should handle complex summary mapping', async () => {
    // text_session sonra session_end senaryosu
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-1',
        type: 'session_end',
        timestamp: Date.now() - 86400000 + 3600000, // 1 saat sonra
        created_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({
      'session-end-1': 'Session tamamlandı',
    });
    mockedGetSummaryForSessionEvent.mockResolvedValue('Fresh summary');

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // text_session, sonraki session_end'in özetini almalı
    const textSession = result.current.state.allEvents.find(e => e.type === 'text_session');
    expect(textSession?.summary).toBe('Session tamamlandı');
  });

  it('should use fallback summary from database', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue('Database fallback summary');

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    const textSession = result.current.state.allEvents.find(e => e.type === 'text_session');
    expect(textSession?.summary).toBe('Database fallback summary');
  });

  it('should handle multiple text sessions with different summaries', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-1',
        type: 'session_end',
        timestamp: Date.now() - 86400000 + 3600000,
        created_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'text-session-2',
        type: 'text_session',
        timestamp: Date.now() - 172800000,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
      {
        id: 'session-end-2',
        type: 'session_end',
        timestamp: Date.now() - 172800000 + 3600000,
        created_at: new Date(Date.now() - 172800000 + 3600000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({
      'session-end-1': 'Summary for session 1',
      'session-end-2': 'Summary for session 2',
    });
    
    // Mock'u daha akıllı yap - her çağrıda doğru özeti döndür
    mockedGetSummaryForSessionEvent.mockImplementation(async (eventId: string) => {
        if (eventId === 'text-session-1') {
            return 'Summary for session 1';
        }
        if (eventId === 'text-session-2') {
            return 'Summary for session 2';
        }
        return null;
    });

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    const events = result.current.state.allEvents;
    const firstTextSession = events.find(e => e.id === 'text-session-1');
    const secondTextSession = events.find(e => e.id === 'text-session-2');

    // text-session-1, session-end-1'in özetini almalı
    expect(firstTextSession?.summary).toBe('Summary for session 1');
    // text-session-2, getSummaryForSessionEvent'ten özet almalı
    expect(secondTextSession?.summary).toBe('Summary for session 2');
  });

  it('should handle partial fetch errors gracefully', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now() - 86400000,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // Error durumunda da events yüklenmeli, sadece summary null olacak
    const textSession = result.current.state.allEvents.find(e => e.type === 'text_session');
    expect(textSession?.summary).toBe(null);
    expect(result.current.state.error).toBe(null); // Ana fetch hatası yok
  });

  it('should handle events ref updates', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'text-session-1',
        type: 'text_session',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    mockedGetSummaryForSessionEvent.mockResolvedValue(null);

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // Events ref'i güncel olmalı
    expect(result.current.state.allEvents).toHaveLength(1);
  });

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // getEventsForLast hata fırlatır
    mockedGetEventsForLast.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // FETCH_ERROR action dispatch edildi
    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.error).toBe('Veriler yüklenirken bir sorun oluştu.');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Events fetch error:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should handle getSessionSummariesForEventIds error', async () => {
    const mockEvents: AppEvent[] = [
      {
        id: 'session-end-1',
        type: 'session_end',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: { messages: [] },
        mood: null,
        user_id: 'test-user',
      },
    ];

    mockedGetEventsForLast.mockResolvedValue(mockEvents);
    mockedGetSessionSummariesForEventIds.mockRejectedValue(new Error('Summary fetch failed'));

    const { result } = renderHook(() => useTranscripts(), { wrapper });

    await triggerFocusEffect();

    // Hata yakalandı ve FETCH_ERROR dispatch edildi
    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    expect(result.current.state.error).toBe('Veriler yüklenirken bir sorun oluştu.');
  });
});
