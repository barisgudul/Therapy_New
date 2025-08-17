// hooks/__tests__/useDiary.test.tsx
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiary } from '../useDiary';

// Mocks
jest.mock('../../services/event.service', () => ({
  deleteEventById: jest.fn().mockResolvedValue(undefined),
  getDiaryEventsForUser: jest.fn().mockResolvedValue([]),
  getEventById: jest.fn().mockImplementation((id: string) => ({
    id,
    user_id: 'user-1',
    type: 'diary_entry',
    timestamp: Date.now(),
    created_at: new Date().toISOString(),
    mood: null,
    data: { messages: [] },
  })),
  logEvent: jest.fn().mockResolvedValue('event-1'),
}));

const mockProcessUserEvent = jest.fn();
jest.mock('../../services/orchestration.service', () => ({
  processUserEvent: (args: unknown) => mockProcessUserEvent(args),
}));

jest.mock('../../services/api.service', () => ({
  incrementFeatureUsage: jest.fn().mockResolvedValue(undefined),
}));

// Wrapper
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useDiary Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });
    expect(result.current.state.mode).toBe('list');
    expect(result.current.state.messages).toEqual([]);
    expect(result.current.state.currentQuestions).toEqual([]);
    expect(result.current.state.isConversationDone).toBe(false);
  });

  it('should switch to write mode when starting a new diary and reset state', () => {
    const { result } = renderHook(() => useDiary(), { wrapper });
    act(() => {
      result.current.handlers.startNewDiary();
    });
    expect(result.current.state.mode).toBe('write');
    expect(result.current.state.messages).toEqual([]);
    expect(result.current.state.currentQuestions).toEqual([]);
    expect(result.current.state.isConversationDone).toBe(false);
  });

  it('should append user and AI messages and update questions for non-final AI response', async () => {
    mockProcessUserEvent.mockResolvedValue({
      aiResponse: 'AI cevabı',
      nextQuestions: ['Soru 1', 'Soru 2'],
      isFinal: false,
      conversationId: 'conv-1',
    });

    const { result } = renderHook(() => useDiary(), { wrapper });
    
    // 1. Durumu hazırla
    act(() => {
      result.current.handlers.startNewDiary();
      result.current.handlers.changeInput('Benim cevabım');
    });

    // 2. Asenkron eylemi tetikle
    act(() => {
      result.current.handlers.submitAnswer();
    });
    
    // 3. Sonucu bekle.
    // Mesaj listesinde önce kullanıcının kendi mesajı belirir.
    await waitFor(() => {
      expect(result.current.state.messages.length).toBe(1);
    });
    expect(result.current.state.messages[0].text).toBe('Benim cevabım');
    
    // Sonra AI'ın cevabının gelmesini ve state'in tamamen güncellenmesini bekle
    await waitFor(() => {
      expect(result.current.state.messages.length).toBe(2);
    });

    // 4. Son durumu onayla
    expect(result.current.state.messages[1].text).toBe('AI cevabı');
    expect(result.current.state.currentQuestions).toEqual(['Soru 1', 'Soru 2']);
    expect(result.current.state.isConversationDone).toBe(false);
  });

  it('should set conversation as done and clear questions on final AI response', async () => {
    mockProcessUserEvent.mockResolvedValue({
      aiResponse: 'Son AI cevabı',
      isFinal: true,
      conversationId: 'conv-1',
    });
    
    const { result } = renderHook(() => useDiary(), { wrapper });
    
    act(() => {
      result.current.handlers.startNewDiary();
      result.current.handlers.changeInput('Benim son cevabım');
    });

    act(() => {
      result.current.handlers.submitAnswer();
    });

    // Doğrudan nihai sonucu bekle
    await waitFor(() => {
      expect(result.current.state.isConversationDone).toBe(true);
    });

    expect(result.current.state.messages.length).toBe(2);
    expect(result.current.state.messages[1].text).toBe('Son AI cevabı');
    expect(result.current.state.currentQuestions).toEqual([]);
  });

  it('should view a diary and go back to list', async () => {
    const { result } = renderHook(() => useDiary(), { wrapper });
    const mockDiary = {
      id: 'evt-1',
      user_id: 'user-1',
      type: 'diary_entry',
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      mood: null,
      data: { messages: [] },
    };

    act(() => {
      result.current.handlers.viewDiary(mockDiary as unknown as import('../../services/event.service').AppEvent);
    });
    expect(result.current.state.mode).toBe('view');

    await waitFor(() => expect(result.current.state.selectedDiary?.id).toBe('evt-1'));
    act(() => {
      result.current.handlers.exitView();
    });
    expect(result.current.state.mode).toBe('list');
  });
});


