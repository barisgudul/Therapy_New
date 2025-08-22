// hooks/__tests__/useTextSessionReducer.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { useTextSessionReducer } from '../useTextSessionReducer';

// Mock SessionService
import { SessionService } from '../../services/session.service';

jest.mock('../../services/session.service', () => ({
  SessionService: {
    sendMessage: jest.fn(),
    endSession: jest.fn(),
  },
}));

const mockSessionService = SessionService as jest.Mocked<typeof SessionService>;

describe('useTextSessionReducer - Transcript Senkronizasyonu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should maintain transcript and messages synchronization', async () => {
    const mockOnSessionEnd = jest.fn();
    
    const { result } = renderHook(() =>
      useTextSessionReducer({
        initialMood: 'happy',
        onSessionEnd: mockOnSessionEnd,
      })
    );

    // Initial state check - artık boş başlıyor
    expect(result.current.state.messages).toHaveLength(0);
    expect(result.current.state.status).toBe('welcoming');

    // Send a user message
    act(() => {
      result.current.handleInputChange('Merhaba, bugün kendimi iyi hissetmiyorum');
    });

    // Mock AI response
    const mockAIResponse = {
      aiResponse: 'Merhaba! Neden kendini iyi hissetmediğini anlatabilir misin?',
      usedMemory: null
    };
    mockSessionService.sendMessage.mockResolvedValue(mockAIResponse);

    // Send message
    await act(async () => {
      await result.current.sendMessage();
    });

    // Check synchronization - artık sadece User + AI Response
    expect(result.current.state.messages).toHaveLength(2); // User + AI Response
    expect(result.current.state.messages[0].sender).toBe('user');
    expect(result.current.state.messages[0].text).toContain('Merhaba, bugün kendimi iyi hissetmiyorum');
    expect(result.current.state.messages[1].sender).toBe('ai');
    expect(result.current.state.messages[1].text).toContain('Merhaba! Neden kendini iyi hissetmediğini anlatabilir misin?');
  });

  it('should handle multiple message exchanges correctly', async () => {
    const mockOnSessionEnd = jest.fn();
    
    const { result } = renderHook(() =>
      useTextSessionReducer({
        initialMood: 'happy',
        onSessionEnd: mockOnSessionEnd,
      })
    );

    // First exchange
    mockSessionService.sendMessage.mockResolvedValue({
      aiResponse: 'İlk AI cevabı',
      usedMemory: null
    });
    
    act(() => {
      result.current.handleInputChange('İlk kullanıcı mesajı');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });

    // Second exchange
    mockSessionService.sendMessage.mockResolvedValue({
      aiResponse: 'İkinci AI cevabı',
      usedMemory: null
    });
    
    act(() => {
      result.current.handleInputChange('İkinci kullanıcı mesajı');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });

    // Check final state - artık 2 exchange = 4 mesaj
    expect(result.current.state.messages).toHaveLength(4); // 2 exchanges
    expect(result.current.state.messages[0].sender).toBe('user');
    expect(result.current.state.messages[0].text).toContain('İlk kullanıcı mesajı');
    expect(result.current.state.messages[1].sender).toBe('ai');
    expect(result.current.state.messages[1].text).toContain('İlk AI cevabı');
    expect(result.current.state.messages[2].sender).toBe('user');
    expect(result.current.state.messages[2].text).toContain('İkinci kullanıcı mesajı');
    expect(result.current.state.messages[3].sender).toBe('ai');
    expect(result.current.state.messages[3].text).toContain('İkinci AI cevabı');
  });

  it('should handle session end with correct transcript', async () => {
    const mockOnSessionEnd = jest.fn();
    
    const { result } = renderHook(() =>
      useTextSessionReducer({
        initialMood: 'happy',
        onSessionEnd: mockOnSessionEnd,
      })
    );

    mockSessionService.sendMessage.mockResolvedValue({
      aiResponse: 'AI cevabı',
      usedMemory: null
    });
    
    // Send a message first
    act(() => {
      result.current.handleInputChange('Test mesajı');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });

    // End session
    await act(async () => {
      await result.current.endSession();
    });

    // Verify SessionService.endSession was called with correct transcript - artık başlangıç mesajı yok
    const expectedTranscript = "Danışan: Test mesajı\nTerapist: AI cevabı\n";
    
    expect(mockSessionService.endSession).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMood: 'happy',
        finalMood: 'happy',
        transcript: expectedTranscript,
        messages: expect.arrayContaining([
          expect.objectContaining({ sender: 'user', text: 'Test mesajı' }),
          expect.objectContaining({ sender: 'ai', text: 'AI cevabı' }),
        ]),
      })
    );
  });
});
