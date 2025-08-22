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

    // Initial state check
    expect(result.current.state.messages).toHaveLength(1);
    expect(result.current.state.transcript).toContain('Terapist: Merhaba, ben buradayım');
    expect(result.current.state.transcript).toContain('Hazır olduğunda seninle konuşmaya hazırım');

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

    // Check synchronization
    expect(result.current.state.messages).toHaveLength(3); // Initial AI + User + AI Response
    expect(result.current.state.transcript).toContain('Danışan: Merhaba, bugün kendimi iyi hissetmiyorum');
    expect(result.current.state.transcript).toContain('Terapist: Merhaba! Neden kendini iyi hissetmediğini anlatabilir misin?');

    // Verify transcript format
    const transcriptLines = result.current.state.transcript.split('\n').filter(line => line.trim());
    expect(transcriptLines).toHaveLength(3);
    expect(transcriptLines[0]).toMatch(/^Terapist: .+/);
    expect(transcriptLines[1]).toMatch(/^Danışan: .+/);
    expect(transcriptLines[2]).toMatch(/^Terapist: .+/);
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

    // Check final state
    expect(result.current.state.messages).toHaveLength(5); // Initial + 2 exchanges
    expect(result.current.state.transcript).toContain('İlk kullanıcı mesajı');
    expect(result.current.state.transcript).toContain('İlk AI cevabı');
    expect(result.current.state.transcript).toContain('İkinci kullanıcı mesajı');
    expect(result.current.state.transcript).toContain('İkinci AI cevabı');

    // Verify transcript line count matches message count
    const transcriptLines = result.current.state.transcript.split('\n').filter(line => line.trim());
    expect(transcriptLines).toHaveLength(5);
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

    // Verify SessionService.endSession was called with correct transcript
    const expectedTranscript = "Terapist: Merhaba, ben buradayım. Hazır olduğunda seninle konuşmaya hazırım.\nDanışan: Test mesajı\nTerapist: AI cevabı\n";
    
    expect(mockSessionService.endSession).toHaveBeenCalledWith(
      expect.objectContaining({
        initialMood: 'happy',
        finalMood: 'happy',
        transcript: expectedTranscript,
        messages: expect.arrayContaining([
          expect.objectContaining({ sender: 'ai', text: 'Merhaba, ben buradayım. Hazır olduğunda seninle konuşmaya hazırım.' }),
          expect.objectContaining({ sender: 'user', text: 'Test mesajı' }),
          expect.objectContaining({ sender: 'ai', text: 'AI cevabı' }),
        ]),
      })
    );
  });
});
