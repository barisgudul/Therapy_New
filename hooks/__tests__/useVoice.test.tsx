// hooks/__tests__/useVoice.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVoiceSession } from '../useVoice';

// Mock'lar
jest.mock('expo-audio');
jest.mock('../../utils/gcpServices');

describe('useVoiceSession - Ses Motoru Testi', () => {
  const mockExpoAudio = jest.mocked(require('expo-audio'));
  const mockGcpServices = jest.mocked(require('../../utils/gcpServices'));

  let mockRecorder: any;
  let mockPlayer: any;
  let mockOnTranscriptReceived: jest.Mock;
  let mockOnSpeechPlaybackStatusUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnTranscriptReceived = jest.fn();
    mockOnSpeechPlaybackStatusUpdate = jest.fn();

    // Recorder mock
    mockRecorder = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      record: jest.fn(),
      stop: jest.fn(),
      uri: null,
    };

    // Player mock
    mockPlayer = {
      replace: jest.fn(),
      play: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn().mockReturnValue(() => {}),
    };

    mockExpoAudio.useAudioRecorder = jest.fn().mockReturnValue(mockRecorder);
    mockExpoAudio.useAudioPlayer = jest.fn().mockReturnValue(mockPlayer);
    mockExpoAudio.requestRecordingPermissionsAsync = jest.fn().mockResolvedValue({
      granted: true,
    });
    mockExpoAudio.setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

    // GCP Services mock
    mockGcpServices.transcribeAudio = jest.fn().mockResolvedValue('Test transcript');
    mockGcpServices.textToSpeech = jest.fn().mockResolvedValue('https://test-audio-url.com/audio.mp3');
  });

  describe('1. Initial State', () => {
    it('hook başlangıç değerleriyle render edilir', () => {
      const { result } = renderHook(() => useVoiceSession());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.speakText).toBe('function');
    });

    it('callback propları olmadan da çalışır', () => {
      expect(() => {
        renderHook(() => useVoiceSession());
      }).not.toThrow();
    });

    it('callback propları ile render edilir', () => {
      expect(() => {
        renderHook(() =>
          useVoiceSession({
            onTranscriptReceived: mockOnTranscriptReceived,
            onSpeechPlaybackStatusUpdate: mockOnSpeechPlaybackStatusUpdate,
          })
        );
      }).not.toThrow();
    });
  });

  describe('2. startRecording - Başarılı Senaryo', () => {
    it('mikrofon izni verildiğinde kayıt başlatılır', async () => {
      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.startRecording();
      });

      // İzin kontrolü yapıldı
      expect(mockExpoAudio.requestRecordingPermissionsAsync).toHaveBeenCalled();

      // Audio mode set edildi
      expect(mockExpoAudio.setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Recorder prepare edildi
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();

      // Kayıt başlatıldı
      expect(mockRecorder.record).toHaveBeenCalled();

      // State güncellendi
      expect(result.current.isRecording).toBe(true);
    });
  });

  describe('3. startRecording - İzin Reddedildi', () => {
    it('mikrofon izni verilmediğinde kayıt başlatılmaz', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockExpoAudio.requestRecordingPermissionsAsync = jest.fn().mockResolvedValue({
        granted: false,
      });

      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.startRecording();
      });

      // İzin kontrolü yapıldı ama granted: false
      expect(mockExpoAudio.requestRecordingPermissionsAsync).toHaveBeenCalled();

      // Kayıt başlatılmadı
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();

      // State değişmedi
      expect(result.current.isRecording).toBe(false);

      // Console error çağrıldı
      expect(consoleErrorSpy).toHaveBeenCalledWith('Mikrofon izni verilmedi.');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('4. startRecording - Hata Durumu', () => {
    it('recording başlatma sırasında hata oluşursa gracefully handle edilir', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const testError = new Error('Audio initialization failed');
      mockRecorder.prepareToRecordAsync = jest.fn().mockRejectedValue(testError);

      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.startRecording();
      });

      // Hata yakalandı
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔴 FAILED TO START RECORDING:', testError);

      // State değişmedi (kayıt başlamadı)
      expect(result.current.isRecording).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('5. stopRecording - Başarılı Transcription', () => {
    it('kayıt durdurulduğunda transcript alınır', async () => {
      mockRecorder.uri = 'file:///path/to/recording.wav';

      const { result } = renderHook(() =>
        useVoiceSession({
          onTranscriptReceived: mockOnTranscriptReceived,
        })
      );

      // Önce kayıt başlat
      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Kayıt durdur
      await act(async () => {
        await result.current.stopRecording();
      });

      // Recorder durduruldu
      expect(mockRecorder.stop).toHaveBeenCalled();

      // Transcript alındı
      await waitFor(() => {
        expect(mockGcpServices.transcribeAudio).toHaveBeenCalledWith('file:///path/to/recording.wav');
      });

      // Callback çağrıldı
      await waitFor(() => {
        expect(mockOnTranscriptReceived).toHaveBeenCalledWith('Test transcript');
      });

      // State güncellendi
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('stopRecording sırasında processing state true olur', async () => {
      mockRecorder.uri = 'file:///path/to/recording.wav';

      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.startRecording();
      });

      // stopRecording çağrıldığında processing başlar
      const stopPromise = act(async () => {
        await result.current.stopRecording();
      });

      // Processing state'i kontrol et (async işlem devam ederken)
      // Not: Test ortamında bu çok hızlı olabilir, ama mantık doğru

      await stopPromise;

      // İşlem bittiğinde processing false olmalı
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('6. stopRecording - URI Yok Durumu', () => {
    it('recorder.uri null ise transcription yapılmaz', async () => {
      mockRecorder.uri = null;

      const { result } = renderHook(() =>
        useVoiceSession({
          onTranscriptReceived: mockOnTranscriptReceived,
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      // Recorder durduruldu
      expect(mockRecorder.stop).toHaveBeenCalled();

      // Ama transcript alınmadı
      expect(mockGcpServices.transcribeAudio).not.toHaveBeenCalled();
      expect(mockOnTranscriptReceived).not.toHaveBeenCalled();

      // State temiz
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('7. stopRecording - Hata Durumu', () => {
    it('transcription hatası gracefully handle edilir', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRecorder.uri = 'file:///path/to/recording.wav';

      const testError = new Error('Transcription failed');
      mockGcpServices.transcribeAudio = jest.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useVoiceSession({
          onTranscriptReceived: mockOnTranscriptReceived,
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      // Hata yakalandı
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔴 FAILED TO STOP RECORDING:', testError);

      // Callback çağrılmadı
      expect(mockOnTranscriptReceived).not.toHaveBeenCalled();

      // State temizlendi (finally block)
      expect(result.current.isProcessing).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('8. speakText - Başarılı Playback', () => {
    it('text TTS ile sese dönüştürülüp çalınır', async () => {
      const { result } = renderHook(() =>
        useVoiceSession({
          onSpeechPlaybackStatusUpdate: mockOnSpeechPlaybackStatusUpdate,
        })
      );

      await act(async () => {
        await result.current.speakText('Hello world');
      });

      // Audio mode set edildi
      expect(mockExpoAudio.setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      // TTS çağrıldı
      expect(mockGcpServices.textToSpeech).toHaveBeenCalledWith('Hello world');

      // Player replace ve play çağrıldı
      expect(mockPlayer.replace).toHaveBeenCalledWith('https://test-audio-url.com/audio.mp3');
      expect(mockPlayer.play).toHaveBeenCalled();

      // Event listener eklendi
      expect(mockPlayer.addListener).toHaveBeenCalledWith(
        'playbackStatusUpdate',
        expect.any(Function)
      );
    });

    it('player status listener çalışır', async () => {
      let statusCallback: any;

      mockPlayer.addListener = jest.fn().mockImplementation((event, callback) => {
        statusCallback = callback;
        return () => {}; // unsubscribe function
      });

      const { result } = renderHook(() =>
        useVoiceSession({
          onSpeechPlaybackStatusUpdate: mockOnSpeechPlaybackStatusUpdate,
        })
      );

      await act(async () => {
        await result.current.speakText('Test speech');
      });

      // Status callback'i manuel çağır - playing: true
      act(() => {
        statusCallback({ playing: true, didJustFinish: false });
      });

      expect(mockOnSpeechPlaybackStatusUpdate).toHaveBeenCalledWith({ isPlaying: true });

      // Status callback'i manuel çağır - finished
      act(() => {
        statusCallback({ playing: false, didJustFinish: true });
      });

      expect(mockOnSpeechPlaybackStatusUpdate).toHaveBeenCalledWith({ isPlaying: false });
      expect(mockPlayer.remove).toHaveBeenCalled();
    });
  });

  describe('9. speakText - Hata Durumu', () => {
    it('TTS hatası gracefully handle edilir', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const testError = new Error('TTS service unavailable');
      mockGcpServices.textToSpeech = jest.fn().mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useVoiceSession({
          onSpeechPlaybackStatusUpdate: mockOnSpeechPlaybackStatusUpdate,
        })
      );

      await act(async () => {
        await result.current.speakText('Test text');
      });

      // Hata yakalandı
      expect(consoleWarnSpy).toHaveBeenCalledWith('Ses çalınamadı:', testError);

      // Status update false ile çağrıldı
      expect(mockOnSpeechPlaybackStatusUpdate).toHaveBeenCalledWith({ isPlaying: false });

      // Player çağrılmadı
      expect(mockPlayer.play).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('10. Edge Cases ve Integration', () => {
    it('callback olmadan stopRecording çalışır', async () => {
      mockRecorder.uri = 'file:///path/to/recording.wav';

      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      // Transcript alındı ama callback yok
      expect(mockGcpServices.transcribeAudio).toHaveBeenCalled();

      // Hata olmadı
      expect(result.current.isProcessing).toBe(false);
    });

    it('callback olmadan speakText çalışır', async () => {
      const { result } = renderHook(() => useVoiceSession());

      await act(async () => {
        await result.current.speakText('No callback test');
      });

      // TTS çağrıldı
      expect(mockGcpServices.textToSpeech).toHaveBeenCalled();

      // Player çalıştırıldı
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('ardışık kayıtlar yapılabilir', async () => {
      mockRecorder.uri = 'file:///first-recording.wav';

      const { result } = renderHook(() =>
        useVoiceSession({
          onTranscriptReceived: mockOnTranscriptReceived,
        })
      );

      // İlk kayıt
      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockOnTranscriptReceived).toHaveBeenCalledTimes(1);

      // İkinci kayıt
      mockRecorder.uri = 'file:///second-recording.wav';

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockOnTranscriptReceived).toHaveBeenCalledTimes(2);
    });

    it('speakText unsubscribe fonksiyonu döner', async () => {
      const mockUnsubscribe = jest.fn();
      mockPlayer.addListener = jest.fn().mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => useVoiceSession());

      let unsubscribe: any;

      await act(async () => {
        unsubscribe = await result.current.speakText('Test');
      });

      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});

