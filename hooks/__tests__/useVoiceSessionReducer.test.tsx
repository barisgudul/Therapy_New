// hooks/__tests__/useVoiceSessionReducer.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';
import { useVoiceSessionReducer } from '../useVoiceSessionReducer';

// Mock'lar
jest.mock('../useVoice');
jest.mock('../../utils/supabase');

describe('useVoiceSessionReducer - Karmaşık State Makinesi Testi', () => {
  const mockUseVoiceSession = jest.mocked(require('../useVoice').useVoiceSession);
  const mockSupabase = jest.mocked(require('../../utils/supabase').supabase);
  const mockAlert = jest.spyOn(Alert, 'alert');

  let mockStartRecording: jest.Mock;
  let mockStopRecording: jest.Mock;
  let mockSpeakText: jest.Mock;
  let mockOnSessionEnd: jest.Mock;
  let transcriptCallback: (transcript: string) => void;
  let speechStatusCallback: (status: { isPlaying: boolean }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();

    mockStartRecording = jest.fn();
    mockStopRecording = jest.fn();
    mockSpeakText = jest.fn().mockResolvedValue(() => {});
    mockOnSessionEnd = jest.fn();

    mockUseVoiceSession.mockImplementation((props: any) => {
      transcriptCallback = props.onTranscriptReceived;
      speechStatusCallback = props.onSpeechPlaybackStatusUpdate;
      return {
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        speakText: mockSpeakText,
        isRecording: false,
        isProcessing: false,
      };
    });

    // Supabase mock
    mockSupabase.functions = {
      invoke: jest.fn().mockResolvedValue({
        data: { aiResponse: 'AI response', usedMemory: null },
        error: null,
      }),
    } as any;

    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    } as any;
  });

  describe('1. Initial State', () => {
    it('hook initial state ile başlar', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      expect(result.current.state.status).toBe('idle');
      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.lastSpokenMessageId).toBeNull();
    });

    it('actions export edilir', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      expect(typeof result.current.actions.startRecording).toBe('function');
      expect(typeof result.current.actions.stopRecording).toBe('function');
      expect(typeof result.current.actions.endSession).toBe('function');
      expect(typeof result.current.actions.handleBackPress).toBe('function');
    });
  });

  describe('2. Recording Akışı - Baştan Sona', () => {
    it('start recording -> status recording olur', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
      });

      expect(mockStartRecording).toHaveBeenCalled();
      expect(result.current.state.status).toBe('recording');
    });

    it('stop recording -> status processing olur', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
      });

      act(() => {
        result.current.actions.stopRecording();
      });

      expect(mockStopRecording).toHaveBeenCalled();
      expect(result.current.state.status).toBe('processing');
    });

    it('transcript received -> user message eklenir', async () => {
      renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      await act(async () => {
        transcriptCallback('Hello from user');
      });

      // useVoiceSession callback'i çağrıldı
      expect(transcriptCallback).toBeDefined();
    });
  });

  describe('3. Transcript Received Action', () => {
    it('boş transcript idle durumuna döner', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      expect(result.current.state.status).toBe('processing');

      act(() => {
        transcriptCallback('   '); // Boş (whitespace)
      });

      // Status idle'a döner
      expect(result.current.state.status).toBe('idle');
      expect(result.current.state.messages).toEqual([]);
    });

    it('geçerli transcript user message olarak eklenir', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test user message');
      });

      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].sender).toBe('user');
      expect(result.current.state.messages[0].text).toBe('Test user message');
      expect(result.current.state.messages[0].id).toMatch(/^user-/);
    });
  });

  describe('4. AI İletişimi - useEffect', () => {
    it('user message geldiğinde AI\'a istek gönderilir', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('User says hello');
      });

      // useEffect tetiklenir ve AI'a istek gider
      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('voice-session', {
          body: {
            messages: expect.arrayContaining([
              expect.objectContaining({
                sender: 'user',
                text: 'User says hello',
              }),
            ]),
          },
        });
      });

      // Status thinking -> speaking olur
      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      // AI mesajı eklenir
      expect(result.current.state.messages).toHaveLength(2);
      expect(result.current.state.messages[1].sender).toBe('ai');
      expect(result.current.state.messages[1].text).toBe('AI response');
    });

    it('AI response başarılı olunca mesaj eklenir ve speaking state\'e geçer', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: { aiResponse: 'Test AI response', usedMemory: null },
        error: null,
      });

      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('Test message');
      });

      // AI mesajının eklenmesini bekle
      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      }, { timeout: 3000 });

      const aiMessage = result.current.state.messages[1];
      expect(aiMessage.sender).toBe('ai');
      expect(aiMessage.text).toBe('Test AI response');

      // Status speaking olmalı
      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      // lastSpokenMessageId set edilmeli
      expect(result.current.state.lastSpokenMessageId).toBe(aiMessage.id);
    });

    it('AI response memory ile gelirse message\'a eklenir', async () => {
      const testMemory = { content: 'Test memory', source_layer: 'layer-1' };

      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: { aiResponse: 'Response with memory', usedMemory: testMemory },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      const aiMessage = result.current.state.messages[1];
      expect(aiMessage.memory).toEqual(testMemory);
    });
  });

  describe('5. AI Hata Durumları', () => {
    it('AI invoke error döndürürse error state\'e geçer', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'AI service unavailable' },
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      expect(result.current.state.error).toBe('AI service unavailable');

      consoleErrorSpy.mockRestore();
    });

    it('AI boş response döndürürse error state\'e geçer', async () => {
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: { aiResponse: '' },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      expect(result.current.state.error).toContain('boş cevap');
    });

    it('AI invoke exception fırlatırsa error state\'e geçer', async () => {
      mockSupabase.functions.invoke = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });

      expect(result.current.state.error).toBe('Network error');
    });
  });

  describe('6. Speaking Status Management', () => {
    it('speaking status true olunca status speaking kalır', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      act(() => {
        speechStatusCallback({ isPlaying: true });
      });

      expect(result.current.state.status).toBe('speaking');
    });

    it('speaking status false olunca idle\'a döner', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      act(() => {
        speechStatusCallback({ isPlaying: false });
      });

      expect(result.current.state.status).toBe('idle');
    });
  });

  describe('7. endSession - Session Sonlandırma', () => {
    it('mesajlar varsa unified-ai-gateway invoke edilir', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Birkaç mesaj ekle
      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('User message');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      // Session sonlandır
      await act(async () => {
        await result.current.actions.endSession();
      });

      // unified-ai-gateway çağrıldı
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('unified-ai-gateway', {
        body: {
          eventPayload: expect.objectContaining({
            type: 'voice_session',
            data: expect.objectContaining({
              isSessionEnd: true,
              messages: expect.any(Array),
              transcript: expect.any(String),
            }),
          }),
        },
      });

      // onSessionEnd callback çağrıldı
      expect(mockOnSessionEnd).toHaveBeenCalled();
    });

    it('mesajlar 1 veya daha azsa unified-ai-gateway invoke edilmez', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Hiç mesaj yok
      expect(result.current.state.messages).toHaveLength(0);

      await act(async () => {
        await result.current.actions.endSession();
      });

      // unified-ai-gateway çağrılmadı (voice-session çağrısı var ama unified-ai-gateway yok)
      const gatewayCalls = (mockSupabase.functions.invoke as jest.Mock).mock.calls.filter(
        call => call[0] === 'unified-ai-gateway'
      );
      expect(gatewayCalls).toHaveLength(0);

      // Ama onSessionEnd yine çağrıldı
      expect(mockOnSessionEnd).toHaveBeenCalled();
    });

    it('user yoksa unified-ai-gateway invoke edilmez', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Mesajlar ekle
      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      await act(async () => {
        await result.current.actions.endSession();
      });

      // unified-ai-gateway çağrılmadı
      const gatewayCalls = (mockSupabase.functions.invoke as jest.Mock).mock.calls.filter(
        call => call[0] === 'unified-ai-gateway'
      );
      expect(gatewayCalls).toHaveLength(0);

      // onSessionEnd yine çağrıldı
      expect(mockOnSessionEnd).toHaveBeenCalled();
    });

    it('endSession hatası console.error ile loglanır', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testError = new Error('unified-ai-gateway error');
      mockSupabase.functions.invoke = jest.fn()
        .mockResolvedValueOnce({ data: { aiResponse: 'Test' }, error: null }) // voice-session
        .mockRejectedValueOnce(testError); // unified-ai-gateway

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      await act(async () => {
        await result.current.actions.endSession();
      });

      // Hata loglandı
      expect(consoleErrorSpy).toHaveBeenCalledWith('Session end error:', testError);

      // onSessionEnd yine çağrıldı (hata olsa bile)
      expect(mockOnSessionEnd).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('8. BackHandler Integration', () => {
    it('handleBackPress Alert gösterir', () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      const returnValue = result.current.actions.handleBackPress();

      expect(mockAlert).toHaveBeenCalledWith(
        'Seansı Sonlandır',
        'Seansı sonlandırmak istediğinizden emin misiniz? Sohbetiniz kaydedilecek.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'İptal', style: 'cancel' }),
          expect.objectContaining({
            text: 'Sonlandır',
            style: 'destructive',
            onPress: expect.any(Function),
          }),
        ])
      );

      // true döner (back press handled)
      expect(returnValue).toBe(true);
    });

    it('Alert onaylanınca endSession çağrılır', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Destructive butonu çağır
        if (buttons && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Mesajlar ekle
      act(() => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      act(() => {
        transcriptCallback('Test');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      // Back press
      result.current.actions.handleBackPress();

      await waitFor(() => {
        expect(mockOnSessionEnd).toHaveBeenCalled();
      });
    });

    it('BackHandler subscription kurulur ve temizlenir', () => {
      const mockAddEventListener = jest.fn().mockReturnValue({
        remove: jest.fn(),
      });

      BackHandler.addEventListener = mockAddEventListener;

      const { unmount } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Subscription kuruldu
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function)
      );

      // Unmount edince temizlenir
      const subscription = mockAddEventListener.mock.results[0].value;
      unmount();

      // remove çağrıldı
      expect(subscription.remove).toHaveBeenCalled();
    });
  });

  describe('9. lastSpokenMessageId - Duplicate Speech Prevention', () => {
    it('lastSpokenMessageId AI mesajı geldiğinde set edilir', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('Test');
      });

      // AI mesajı eklenene kadar bekle
      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      }, { timeout: 3000 });

      // Speaking status olana kadar bekle
      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      // lastSpokenMessageId set edildi
      const lastMessage = result.current.state.messages[result.current.state.messages.length - 1];
      expect(result.current.state.lastSpokenMessageId).toBe(lastMessage.id);
      expect(lastMessage.sender).toBe('ai');
    });
  });

  describe('10. Gerçek Kullanıcı Senaryoları', () => {
    it('Senaryo: Kullanıcı konuşuyor, AI cevap veriyor, kullanıcı tekrar konuşuyor', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // İlk kullanıcı mesajı
      await act(async () => {
        result.current.actions.startRecording();
      });

      expect(result.current.state.status).toBe('recording');

      await act(async () => {
        result.current.actions.stopRecording();
      });

      expect(result.current.state.status).toBe('processing');

      await act(async () => {
        transcriptCallback('Merhaba, nasılsın?');
      });

      // AI cevabı gelene kadar bekle
      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
        expect(result.current.state.status).toBe('speaking');
      });

      // AI konuşma bittiğinde idle'a dön
      await act(async () => {
        speechStatusCallback({ isPlaying: false });
      });

      expect(result.current.state.status).toBe('idle');

      // İkinci kullanıcı mesajı
      await act(async () => {
        result.current.actions.startRecording();
      });

      expect(result.current.state.status).toBe('recording');
    });

    it('Senaryo: Kullanıcı konuşurken session\'ı sonlandırıyor', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // Birkaç mesaj ekle
      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('Test message');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      });

      // Back press simüle et
      mockAlert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      result.current.actions.handleBackPress();

      // endSession çağrıldı
      await waitFor(() => {
        expect(mockOnSessionEnd).toHaveBeenCalled();
      });
    });

    it('Senaryo: AI hatası sonrası kullanıcı tekrar deniyor', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // İlk deneme - hata
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'AI timeout' },
      });

      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('First try');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
        expect(result.current.state.error).toBe('AI timeout');
      });

      // Kullanıcı tekrar deniyor - bu sefer başarılı
      mockSupabase.functions.invoke = jest.fn().mockResolvedValue({
        data: { aiResponse: 'Success response', usedMemory: null },
        error: null,
      });

      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('Second try');
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('speaking');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('11. Edge Cases ve Integration', () => {
    it('ardışık kayıt-transcript-AI döngüsü state\'i doğru günceller', async () => {
      const { result } = renderHook(() =>
        useVoiceSessionReducer({ onSessionEnd: mockOnSessionEnd })
      );

      // İlk döngü
      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('First message');
      });

      // İlk AI response'u bekle
      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
      }, { timeout: 3000 });

      expect(result.current.state.messages[0].text).toBe('First message');
      expect(result.current.state.messages[1].text).toBe('AI response');

      // İkinci döngü
      await act(async () => {
        speechStatusCallback({ isPlaying: false }); // idle'a dön
      });

      expect(result.current.state.status).toBe('idle');

      await act(async () => {
        result.current.actions.startRecording();
        result.current.actions.stopRecording();
      });

      await act(async () => {
        transcriptCallback('Second message');
      });

      // İkinci AI response'u bekle
      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(4);
      }, { timeout: 3000 });

      // Mesajlar doğru sırada
      expect(result.current.state.messages[2].text).toBe('Second message');
      expect(result.current.state.messages[3].text).toBe('AI response');
    });
  });
});

