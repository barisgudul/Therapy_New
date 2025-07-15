// --------------------------- useVoice.ts ---------------------------
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { textToSpeech, transcribeAudio } from '../utils/gcpServices';

interface UseVoiceSessionProps {
  onTranscriptReceived?: (transcript: string) => void;
  // YENİ: Seslendirme durumunu bildirmek için daha genel bir callback
  onSpeechPlaybackStatusUpdate?: (status: { isPlaying: boolean }) => void;
  onSpeechStarted?: () => void;
  onSpeechEnded?: () => void;
  onSoundLevelChange?: (level: number) => void;
  therapistId?: string;
}

export const useVoiceSession = ({
  onTranscriptReceived,
  onSpeechPlaybackStatusUpdate, // YENİ
  onSpeechStarted,
  onSpeechEnded,
  onSoundLevelChange,
  therapistId = 'therapist1',
}: UseVoiceSessionProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recording = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Platforma göre izin diyaloğu */
  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mikrofon İzni',
          message: 'Sesli terapi için mikrofona erişim gerekiyor',
          buttonPositive: 'Tamam',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else if (Platform.OS === 'ios') {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    }
    return true;
  };

  const startRecording = useCallback(async () => {
    console.log("🎤 ATTEMPTING TO START RECORDING...");
    if (isRecording) {
      console.log("   -> Already recording, returning.");
      return;
    }
    const ok = await requestPermission();
    if (!ok) {
      console.log("   -> Permission denied, returning.");
      return;
    }

    try {
      // Genel ses modu ayarı - hem kayıt hem oynatım için optimize edilmiş
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false // Android'de hoparlörden çalsın
      });
      console.log("   -> Audio mode set.");

      // ----> GÜNCEL KAYIT SEÇENEKLERİ <----
      const customRecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000, // <-- EKSİK OLAN BUYDU. ZAFİYET GİDERİLDİ.
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };
      const { recording: rec } = await Audio.Recording.createAsync(
        customRecordingOptions
      );
      console.log("   -> Recording object created.");

      recording.current = rec;
      setIsRecording(true); // <-- Bu state'in güncellenmesi ÇOK ÖNEMLİ
      onSpeechStarted?.();
      console.log("✅ RECORDING STARTED SUCCESSFULLY.");

      // Ses seviyesi ölçümü
      levelTimer.current = setInterval(async () => {
        if (!recording.current) return;
        const status = await recording.current.getStatusAsync();
        if (status.isRecording && status.metering)
          onSoundLevelChange?.(status.metering);
      }, 120);
    } catch (err) {
      console.error('🔴 FAILED TO START RECORDING:', err);
    }
  }, [isRecording, onSoundLevelChange, onSpeechStarted]);

  const stopRecording = useCallback(async () => {
    console.log("🛑 ATTEMPTING TO STOP RECORDING...");
    if (!recording.current) {
      console.log("   -> No recording object found, returning.");
      return;
    }
    if (levelTimer.current) {
      clearInterval(levelTimer.current);
      levelTimer.current = null;
    }
    setIsRecording(false); // <-- Bu state'in güncellenmesi ÇOK ÖNEMLİ
    setIsProcessing(true);

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      console.log("   -> Recording stopped and unloaded. URI:", uri);
      if (uri) {
        const info = await FileSystem.getInfoAsync(uri);
        // info.size sadece exists:true ise vardır
        const fileSize = info.exists ? info.size : 0;
        const fileExt = uri.split('.').pop();
        // console.log('[VOICE] Kayıt URI:', uri, 'Boyut:', fileSize, 'Format:', fileExt, 'exists:', info.exists);
      }
      recording.current = null;
      onSpeechEnded?.();

      if (uri) {
        try {
          console.log('🎯 [VOICE-HOOK] Ses tanıma başlatılıyor...', { uri, fileExists: true });
          const text = await transcribeAudio(uri);
          console.log('📝 [VOICE-HOOK] Ses tanıma tamamlandı:', {
            text,
            length: text?.length,
            isEmpty: !text || text.trim().length === 0
          });
          onTranscriptReceived?.(text);
        } catch (err) {
          console.error('❌ [VOICE-HOOK] Ses tanıma hatası:', err);
          onTranscriptReceived?.('');
        }
      } else {
        console.log('⚠️ [VOICE-HOOK] Ses dosyası URI bulunamadı');
        onTranscriptReceived?.('');
      }
    } catch (err) {
      console.error('🔴 FAILED TO STOP RECORDING:', err);
    } finally {
      setIsProcessing(false);
      console.log("✅ PROCESSING FINISHED.");
    }
  }, [onSpeechEnded, onTranscriptReceived]);

  // speakText fonksiyonundan yaş parametresini kaldır
  const speakText = useCallback(async (text: string, therapistIdArg?: string) => {
    try {
      // Ses çalmadan önce hoparlör moduna geç
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // Sadece oynatım için
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false // Hoparlörden çalsın
      });

      // therapistId'yi gcpServices'e iletiyoruz (artık userAge yok)
      const url = await textToSpeech(text, therapistIdArg || therapistId);
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 1.0, isMuted: false },
        (status) => {
          if (status.isLoaded) {
            console.log('🔊 [VOICE-HOOK] Playback status update:', { isPlaying: status.isPlaying, didJustFinish: status.didJustFinish });
            onSpeechPlaybackStatusUpdate?.({ isPlaying: status.isPlaying });
            if (status.didJustFinish) {
              s.unloadAsync();
              onSpeechPlaybackStatusUpdate?.({ isPlaying: false });
            }
          }
        }
      );
      sound.current = s;
    } catch (err) {
      console.warn('Ses çalınamadı:', err);
      onSpeechPlaybackStatusUpdate?.({ isPlaying: false });
    }
  }, [therapistId, onSpeechPlaybackStatusUpdate]);

  const cleanup = useCallback(async () => {
    if (levelTimer.current) clearInterval(levelTimer.current);
    levelTimer.current = null;
    if (recording.current) await recording.current.stopAndUnloadAsync();
    if (sound.current) await sound.current.unloadAsync();
  }, []);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    speakText,
    cleanup,
  };
};