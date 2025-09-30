// hooks/__tests__/useTextSessionReducer.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTextSessionReducer, textSessionReducer, initialState, type TextMessage, type TextSessionState } from '../useTextSessionReducer';
import { supabase } from '../../utils/supabase';
import { getEventById } from '../../services/event.service';
// ---- BAĞIMLILIK MOCK'LARI ----
jest.mock('../../services/event.service', () => ({
    getEventById: jest.fn(),
}));
// Alert'i de mock'la
const mockAlert = jest.fn();
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.Alert = { alert: mockAlert };
    RN.BackHandler = {
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
        removeEventListener: jest.fn(),
    };
    return RN;
});

// Alert'i ayrıca mock'la
jest.mock('react-native', () => ({
    Alert: { alert: mockAlert },
    BackHandler: {
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
        removeEventListener: jest.fn(),
    },
}));



const mockedGetEventById = getEventById as jest.Mock;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useTextSessionReducer', () => {

    // BÖLÜM 1: REDUCER MANTIĞI TESTLERİ (SAFTIR, RENDER GEREKTİRMEZ)
    describe('textSessionReducer pure logic', () => {
        it('ADD_MESSAGE: Mesajı listeye eklemeli ve turnCount\'u artırmalı (user için)', () => {
            const userMessage: TextMessage = { sender: 'user', text: 'merhaba' };
            const newState = textSessionReducer(initialState, { type: 'ADD_MESSAGE', payload: userMessage });
            expect(newState.messages).toHaveLength(1);
            expect(newState.messages[0].text).toBe('merhaba');
            expect(newState.turnCount).toBe(1);
        });

        it('ADD_MESSAGE: Mesajı listeye eklemeli ama turnCount\'u artırmamalı (ai için)', () => {
            const aiMessage: TextMessage = { sender: 'ai', text: 'selam' };
            const newState = textSessionReducer(initialState, { type: 'ADD_MESSAGE', payload: aiMessage });
            expect(newState.messages).toHaveLength(1);
            expect(newState.turnCount).toBe(0);
        });

        it('SEND_MESSAGE_START: isTyping ve status\'u doğru ayarlamalı, input\'u temizlemeli', () => {
            const stateWithInput = { ...initialState, input: 'gönderilecek mesaj' };
            const newState = textSessionReducer(stateWithInput, { type: 'SEND_MESSAGE_START' });
            expect(newState.isTyping).toBe(true);
            expect(newState.status).toBe('loading');
            expect(newState.input).toBe('');
        });
        
        it('SEND_MESSAGE_SUCCESS: isTyping\'i false yapmalı ve AI mesajını eklemeli', () => {
             const stateWhileSending: TextSessionState = { ...initialState, isTyping: true, status: 'loading' };
             const aiPayload = { aiResponse: 'İşte cevabım', usedMemory: { content: 'hafıza', source_layer: 'short_term' } };
             const newState = textSessionReducer(stateWhileSending, { type: 'SEND_MESSAGE_SUCCESS', payload: aiPayload });
             
             expect(newState.isTyping).toBe(false);
             expect(newState.status).toBe('idle');
             expect(newState.messages).toHaveLength(1);
             expect(newState.messages[0].sender).toBe('ai');
             expect(newState.messages[0].memory?.content).toBe('hafıza');
        });

        it('SEND_MESSAGE_ERROR: isTyping\'i false yapmalı ve error\'u set etmeli', () => {
            const stateWhileSending: TextSessionState = { ...initialState, isTyping: true, status: 'loading' };
            const newState = textSessionReducer(stateWhileSending, { type: 'SEND_MESSAGE_ERROR', payload: 'API hatası' });
            
            expect(newState.isTyping).toBe(false);
            expect(newState.status).toBe('error');
            expect(newState.error).toBe('API hatası');
        });

        it('INITIALIZE_FROM_HISTORY: Geçmiş mesajları ve transcript\'i yüklemeli', () => {
            const historyPayload = {
                messages: [
                    { sender: 'user' as const, text: 'eski mesaj' },
                    { sender: 'ai' as const, text: 'eski cevap' }
                ],
                transcript: 'Kullanıcı: eski mesaj\nAI: eski cevap\n'
            };
            const newState = textSessionReducer(initialState, { type: 'INITIALIZE_FROM_HISTORY', payload: historyPayload });
            
            expect(newState.messages).toHaveLength(2);
            expect(newState.transcript).toBe('Kullanıcı: eski mesaj\nAI: eski cevap\n');
            expect(newState.status).toBe('idle');
        });

        it('INITIALIZE_WITH_THEME: Tema ile AI mesajını eklemeli', () => {
            const newState = textSessionReducer(initialState, { type: 'INITIALIZE_WITH_THEME', payload: 'Anksiyete' });
            
            expect(newState.messages).toHaveLength(1);
            expect(newState.messages[0].sender).toBe('ai');
            expect(newState.messages[0].text).toContain('Anksiyete hakkında');
            expect(newState.status).toBe('idle');
        });

        it('RESET_SESSION: State\'i sıfırlamalı ama currentMood\'u korumalı', () => {
            const stateWithData: TextSessionState = {
                ...initialState,
                messages: [{ sender: 'user' as const, text: 'test' }],
                currentMood: 'sad',
                isMemoryModalVisible: true,
                selectedMemory: { content: 'test', source_layer: 'short' }
            };
            const newState = textSessionReducer(stateWithData, { type: 'RESET_SESSION' });
            
            expect(newState.messages).toHaveLength(0);
            expect(newState.currentMood).toBe('sad');
            expect(newState.isMemoryModalVisible).toBe(false);
            expect(newState.selectedMemory).toBeNull();
        });

        it('OPEN_MEMORY_MODAL: Modal\'ı açmalı ve memory\'yi set etmeli', () => {
            const memory = { content: 'test memory', source_layer: 'long_term' };
            const newState = textSessionReducer(initialState, { type: 'OPEN_MEMORY_MODAL', payload: memory });
            
            expect(newState.isMemoryModalVisible).toBe(true);
            expect(newState.selectedMemory).toBe(memory);
        });

        it('CLOSE_MEMORY_MODAL: Modal\'ı kapatmalı ve memory\'yi temizlemeli', () => {
            const stateWithModal = {
                ...initialState,
                isMemoryModalVisible: true,
                selectedMemory: { content: 'test', source_layer: 'short' }
            };
            const newState = textSessionReducer(stateWithModal, { type: 'CLOSE_MEMORY_MODAL' });
            
            expect(newState.isMemoryModalVisible).toBe(false);
            expect(newState.selectedMemory).toBeNull();
        });

        it('MESSAGE_SENT_SUCCESS: Mesaj durumunu "sent" yapmalı', () => {
            const stateWithMessage: TextSessionState = {
                ...initialState,
                messages: [{ id: 'msg-123', sender: 'user' as const, text: 'test', status: 'sending' as const }]
            };
            const newState = textSessionReducer(stateWithMessage, { type: 'MESSAGE_SENT_SUCCESS', payload: { messageId: 'msg-123' } });
            
            expect(newState.messages[0].status).toBe('sent');
        });

        it('MESSAGE_SENT_FAILURE: Mesaj durumunu "failed" yapmalı ve error set etmeli', () => {
            const stateWithMessage: TextSessionState = {
                ...initialState,
                messages: [{ id: 'msg-123', sender: 'user' as const, text: 'test', status: 'sending' as const }]
            };
            const newState = textSessionReducer(stateWithMessage, { type: 'MESSAGE_SENT_FAILURE', payload: { messageId: 'msg-123', error: 'Gönderim hatası' } });
            
            expect(newState.messages[0].status).toBe('failed');
            expect(newState.error).toBe('Gönderim hatası');
        });

        it('END_SESSION_START: isEnding ve status\'u ayarlamalı', () => {
            const newState = textSessionReducer(initialState, { type: 'END_SESSION_START' });
            
            expect(newState.isEnding).toBe(true);
            expect(newState.status).toBe('loading');
        });

        it('END_SESSION_SUCCESS: isEnding\'i false yapmalı ve status\'u success yapmalı', () => {
            const stateWhileEnding: TextSessionState = { ...initialState, isEnding: true, status: 'loading' };
            const newState = textSessionReducer(stateWhileEnding, { type: 'END_SESSION_SUCCESS' });
            
            expect(newState.isEnding).toBe(false);
            expect(newState.status).toBe('success');
        });

        it('END_SESSION_ERROR: isEnding\'i false yapmalı ve error set etmeli', () => {
            const stateWhileEnding: TextSessionState = { ...initialState, isEnding: true, status: 'loading' };
            const newState = textSessionReducer(stateWhileEnding, { type: 'END_SESSION_ERROR', payload: 'Sonlandırma hatası' });
            
            expect(newState.isEnding).toBe(false);
            expect(newState.status).toBe('error');
            expect(newState.error).toBe('Sonlandırma hatası');
        });
    });

    // BÖLÜM 2: HOOK YAN ETKİLERİ TESTLERİ (RENDER GEREKTİRİR)
    describe('Hook side effects', () => {
    const mockOnSessionEnd = jest.fn();
    
        beforeEach(() => {
            jest.clearAllMocks();
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { aiResponse: 'AI cevabı' } });
            (mockedSupabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: 'new-session-id' }, error: null }),
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            });
        });

        it('Başlangıçta (eventId olmadan) durumu "idle" olarak ayarlamalı', async () => {
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            
    await waitFor(() => {
      expect(result.current.state.status).toBe('idle');
    });
    expect(result.current.state.messages).toHaveLength(0);

            unmount(); // Test bittiğinde hook'u temizle
        });

        it('eventId ile başladığında, getEventById\'ı çağırmalı ve geçmişi yüklemeli', async () => {
            const historyEvent = { data: { messages: [{ sender: 'user', text: 'eski mesaj' }] } };
            mockedGetEventById.mockResolvedValue(historyEvent);

            const { result, unmount } = renderHook(() => useTextSessionReducer({ eventId: 'history-123', onSessionEnd: mockOnSessionEnd }));

            await waitFor(() => {
                 expect(mockedGetEventById).toHaveBeenCalledWith('history-123');
            });
            expect(result.current.state.messages).toHaveLength(1);
            expect(result.current.state.messages[0].text).toBe('eski mesaj');
            expect(result.current.state.status).toBe('idle');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('sendMessage çağrıldığında, kullanıcı mesajını hemen eklemeli ve API\'yi çağırmalı', async () => {
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            act(() => result.current.handleInputChange('Test mesajı'));

            // `act` içinde `sendMessage` çağırıyoruz
    await act(async () => {
      await result.current.sendMessage();
    });

            // API'nin çağrıldığını doğrula
            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('orchestrator', expect.anything());

            // API cevabı geldikten sonraki durumu bekle ve kontrol et
    await waitFor(() => {
                expect(result.current.state.messages).toHaveLength(2); // User + AI
    });
    expect(result.current.state.messages[0].sender).toBe('user');
            expect(result.current.state.messages[0].status).toBe('sent'); // Eski mesajın durumu güncellendi mi?
    expect(result.current.state.messages[1].sender).toBe('ai');
            expect(result.current.state.input).toBe('');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('API hatası durumunda mesajın durumunu "failed" olarak güncellemelidir', async () => {
            const apiError = new Error('Orchestrator patladı');
            (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(apiError);

            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            act(() => result.current.handleInputChange('Bu mesaj fail olacak'));
    
    await act(async () => {
      await result.current.sendMessage();
    });

            await waitFor(() => {
                expect(result.current.state.messages).toHaveLength(1);
            });

            expect(result.current.state.messages[0].status).toBe('failed');
            expect(result.current.state.error).toBe('Mesaj gönderilemedi');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('endSession (yeni session) çağrıldığında, yeni eventler oluşturmalı ve özet çağırmalı', async () => {
            // ARRANGE
            // `invoke` iki kere çağrılacak: biri sendMessage, diğeri endSession için
            (mockedSupabase.functions.invoke as jest.Mock)
                .mockResolvedValueOnce({ data: { aiResponse: 'AI cevabı' } })
                .mockResolvedValueOnce({ data: { summary: 'Bu bir özettir.' } });
            
            // `from` da iki kere çağrılacak, ikisi de insert için
            const mockInsertSingle = jest.fn()
                .mockResolvedValueOnce({ data: { id: 'text-session-id' }, error: null })
                .mockResolvedValueOnce({ data: { id: 'session-end-id' }, error: null });
            const mockInsertSelect = { select: jest.fn().mockReturnValue({ single: mockInsertSingle }) };
            const mockInsert = jest.fn().mockReturnValue(mockInsertSelect);
            (mockedSupabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            // ACT
            // Önce bir mesaj gönder ki `hasUserMessage` true olsun
            act(() => result.current.handleInputChange('Test mesajı'));
            await act(async () => { await result.current.sendMessage(); });

            // Şimdi sonlandır
            await act(async () => { await result.current.endSession(); });

            // ASSERT
            // 1. Yeni text_session ve session_end eventleri oluşturuldu mu?
            expect(mockInsert).toHaveBeenCalledTimes(2);
            // 2. Özet fonksiyonu çağrıldı mı?
            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('process-session-memory', expect.anything());
            // 3. Callback doğru özetle çağrıldı mı?
            expect(mockOnSessionEnd).toHaveBeenCalledWith('Bu bir özettir.');
            expect(result.current.state.status).toBe('success');
            
            unmount(); // Test bittiğinde hook'u temizle
        });
        
        it('endSession (mevcut session) çağrıldığında, mevcut event\'i update etmeli', async () => {
            // ARRANGE
            (mockedSupabase.functions.invoke as jest.Mock)
                .mockResolvedValueOnce({ data: { aiResponse: 'AI cevabı' } })
                .mockResolvedValueOnce({ data: { summary: 'Güncellenmiş özet' } });
                
            const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });
            
            // `from` çağrılarını ayırt et
            (mockedSupabase.from as jest.Mock).mockImplementation((tableName) => {
                if (tableName === 'events') {
                    return { 
                        update: mockUpdate,
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        gte: jest.fn().mockReturnThis(),
                        order: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: { created_at: '2024-01-01T12:00:00Z' }, error: null }),
                        insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'session-end-id' }, error: null }) }) })
                    };
                }
                return {};
            });

            // eventId ile başlat
            const { result, unmount } = renderHook(() => useTextSessionReducer({ eventId: 'history-123', onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));
            
            // ACT
            act(() => result.current.handleInputChange('Yeni mesaj'));
            await act(async () => { await result.current.sendMessage(); });
            await act(async () => { await result.current.endSession(); });
            
            // ASSERT
            // 1. `update` çağrıldı mı?
            expect(mockUpdate).toHaveBeenCalled();
            expect(mockUpdateEq).toHaveBeenCalledWith('id', 'history-123');
            // 2. Callback çağrıldı mı?
            expect(mockOnSessionEnd).toHaveBeenCalledWith('Güncellenmiş özet');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('handleInputChange input\'u güncellemeli', () => {
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            
            act(() => result.current.handleInputChange('Yeni input'));
            
            expect(result.current.state.input).toBe('Yeni input');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('openMemoryModal ve closeMemoryModal çalışmalı', () => {
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            const memory = { content: 'test memory', source_layer: 'short_term' };
            
            act(() => result.current.openMemoryModal(memory));
            expect(result.current.state.isMemoryModalVisible).toBe(true);
            expect(result.current.state.selectedMemory).toBe(memory);
            
            act(() => result.current.closeMemoryModal());
            expect(result.current.state.isMemoryModalVisible).toBe(false);
            expect(result.current.state.selectedMemory).toBeNull();
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('endSession çağrıldığında, hiç kullanıcı mesajı yoksa sadece onSessionEnd çağırmalı', async () => {
            // ARRANGE
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            // ACT - Hiç mesaj göndermeden direkt endSession çağır
            await act(async () => { await result.current.endSession(); });

            // ASSERT
            expect(mockOnSessionEnd).toHaveBeenCalledWith(); // Parametresiz çağrıldı
            expect(result.current.state.status).toBe('success');
            // Database işlemleri yapılmamalı
            expect(mockedSupabase.from).not.toHaveBeenCalled();
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('endSession (mevcut session) çağrıldığında ve özetleme başarısız olduğunda, onSessionEnd yine de çağrılmalı', async () => {
            // ARRANGE
            (mockedSupabase.functions.invoke as jest.Mock)
                .mockResolvedValueOnce({ data: { aiResponse: 'AI cevabı' } })
                .mockRejectedValueOnce(new Error('Özetleme hatası')); // process-session-memory başarısız
                
            const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
            const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });
            
            (mockedSupabase.from as jest.Mock).mockImplementation((tableName) => {
                if (tableName === 'events') {
                    return { 
                        update: mockUpdate,
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        gte: jest.fn().mockReturnThis(),
                        order: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: { created_at: '2024-01-01T12:00:00Z' }, error: null }),
                        insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'session-end-id' }, error: null }) }) })
                    };
                }
                return {};
            });

            // eventId ile başlat
            const { result, unmount } = renderHook(() => useTextSessionReducer({ eventId: 'history-123', onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));
            
            // ACT
            act(() => result.current.handleInputChange('Yeni mesaj'));
            await act(async () => { await result.current.sendMessage(); });
            await act(async () => { await result.current.endSession(); });
            
            // ASSERT
            expect(mockOnSessionEnd).toHaveBeenCalled(); // Hata olsa bile çağrıldı
            expect(result.current.state.status).toBe('success');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('eventId ile başlarken getEventById hata verirse, durumu error yapmalı', async () => {
            // ARRANGE
            mockedGetEventById.mockRejectedValue(new Error('Event bulunamadı'));

            // ACT
            const { result, unmount } = renderHook(() => useTextSessionReducer({ eventId: 'invalid-id', onSessionEnd: mockOnSessionEnd }));

            // ASSERT
            await waitFor(() => {
                expect(result.current.state.status).toBe('error');
            });
            expect(result.current.state.error).toBe('Geçmiş sohbet yüklenemedi.');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('pendingSessionId ile başlarken orchestrator hata verirse, durumu error yapmalı', async () => {
            // ARRANGE
            (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Orchestrator hatası'));

            // ACT
            const { result, unmount } = renderHook(() => useTextSessionReducer({ pendingSessionId: 'pending-123', onSessionEnd: mockOnSessionEnd }));

            // ASSERT
            await waitFor(() => {
                expect(result.current.state.status).toBe('error');
            });
            expect(result.current.state.error).toBe('Sohbet başlatılamadı.');
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('endSession, text_session update hatası verirse, yine de sonlanmalı', async () => {
            // ARRANGE
            const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error('Update Failed') }) });
            
            // getEventById'ı başarılı döndür ki başlangıçta hata olmasın
            mockedGetEventById.mockResolvedValue({ 
                data: { 
                    messages: [{ sender: 'user', text: 'eski mesaj' }] 
                } 
            });
            
            (mockedSupabase.from as jest.Mock).mockImplementation((tableName) => {
                if (tableName === 'events') {
                    return {
                        update: mockUpdate,
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        gte: jest.fn().mockReturnThis(),
                        order: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: { created_at: '2024-01-01T12:00:00Z' }, error: null }),
                        insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'session-end-id' }, error: null }) }) })
                    };
                }
                return {};
            });

            const { result, unmount } = renderHook(() => useTextSessionReducer({ eventId: 'history-123', onSessionEnd: mockOnSessionEnd }));
            
            // Başlangıç durumunu bekle
            await waitFor(() => expect(result.current.state.status).toBe('idle'));
            
            // Bir mesaj ekle (bu önemli, `hasUserMessage`'ı true yapar)
            act(() => {
                result.current.state.messages.push({ sender: 'user', text: 'mesaj' });
            });

            // ACT
            await act(async () => { await result.current.endSession(); });

            // ASSERT
            // Hook'un içindeki `catch` bloğu çalıştı ve durumu 'error' yaptı
            expect(result.current.state.status).toBe('error');
            expect(result.current.state.error).toBe('Seans sonlandırılamadı');
            // `onSessionEnd` yine de çağrılmalı (catch bloğunun sonunda)
            expect(mockOnSessionEnd).toHaveBeenCalled();
            
            unmount();
        });
        
        it('endSession, özetleme (invoke) hatası verirse, yine de sonlanmalı (ama özetsiz)', async () => {
            // ARRANGE
            (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Özetleme hatası'));
            // Diğer Supabase çağrıları başarılı olsun
            (mockedSupabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: '123' } }) }) }),
            });
            
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            act(() => { result.current.state.messages.push({ sender: 'user', text: 'mesaj' }); });

            // ACT
            await act(async () => { await result.current.endSession(); });

            // ASSERT
            // Özetleme patlasa bile, onSessionEnd parametresiz (veya undefined özetle) çağrılmalı
            expect(mockOnSessionEnd).toHaveBeenCalledWith(undefined);
            expect(result.current.state.status).toBe('success'); // invoke'un catch'i hatayı yuttuğu için success olur
            
            unmount();
        });

        it('handleBackPress, kullanıcı mesajı yoksa false dönmeli', () => {
            // ARRANGE
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));

            // ACT
            const shouldPreventDefault = result.current.handleBackPress();

            // ASSERT
            expect(shouldPreventDefault).toBe(false);
            
            unmount(); // Test bittiğinde hook'u temizle
        });

        it('handleBackPress, kullanıcı mesajı varsa true dönmeli', async () => {
            // ARRANGE
            const { result, unmount } = renderHook(() => useTextSessionReducer({ onSessionEnd: mockOnSessionEnd }));
            await waitFor(() => expect(result.current.state.status).toBe('idle'));

            // Manuel olarak mesaj ekle (reducer'ı doğrudan kullan)
            act(() => {
                result.current.state.messages.push({ 
                    sender: 'user', 
                    text: 'Test mesajı',
                    status: 'sent'
                });
            });

            // Mesajın eklendiğini doğrula
            expect(result.current.state.messages.length).toBeGreaterThan(0);
            expect(result.current.state.messages.some(m => m.sender === 'user')).toBe(true);

            // ACT
            let shouldPreventDefault;
            act(() => {
                shouldPreventDefault = result.current.handleBackPress();
            });

            // ASSERT
            expect(shouldPreventDefault).toBe(true);
            
            unmount(); // Test bittiğinde hook'u temizle
        });
  });
});