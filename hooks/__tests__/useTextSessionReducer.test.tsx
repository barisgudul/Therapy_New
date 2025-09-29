// hooks/__tests__/useTextSessionReducer.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTextSessionReducer } from '../useTextSessionReducer';
import { supabase } from '../../utils/supabase';

describe('useTextSessionReducer - Transcript Senkronizasyonu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
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

    // useEffect'in çalışıp state'i 'idle' yapmasını bekle
    await waitFor(() => {
      expect(result.current.state.status).toBe('idle');
    });

    // Initial state check - artık boş başlıyor
    expect(result.current.state.messages).toHaveLength(0);

    // Send a user message
    act(() => {
      result.current.handleInputChange('Merhaba, bugün kendimi iyi hissetmiyorum');
    });

    // Mock AI response
    const mockAIResponse = {
      aiResponse: 'Merhaba! Neden kendini iyi hissetmediğini anlatabilir misin?',
      usedMemory: null
    };
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: mockAIResponse });

    // Send message
    await act(async () => {
      await result.current.sendMessage();
    });

    // Check synchronization - artık sadece User + AI Response
    await waitFor(() => {
      expect(result.current.state.messages).toHaveLength(2); // User + AI Response
    });
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

    // Her AI cevabı için mock'u ayarla
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        aiResponse: 'İlk AI cevabı',
        usedMemory: null
      }
    });
    
    act(() => {
      result.current.handleInputChange('İlk kullanıcı mesajı');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });

    // İkinci AI cevabı için mock'u ayarla
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        aiResponse: 'İkinci AI cevabı',
        usedMemory: null
      }
    });
    
    act(() => {
      result.current.handleInputChange('İkinci kullanıcı mesajı');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });

    // Check final state - artık 2 exchange = 4 mesaj
    await waitFor(() => {
      expect(result.current.state.messages).toHaveLength(4);
    });
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

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        aiResponse: 'AI cevabı',
        usedMemory: null
      }
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

    expect(mockOnSessionEnd).toHaveBeenCalled();
  });
});