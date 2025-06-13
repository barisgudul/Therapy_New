// --------------------------- useVoice.ts ---------------------------
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { textToSpeech, transcribeAudio } from '../utils/gcpServices';

interface UseVoiceSessionProps {
  onTranscriptReceived?: (transcript: string) => void;
  onSpeechStarted?: () => void;
  onSpeechEnded?: () => void;
  onSoundLevelChange?: (level: number) => void;
  therapistId?: string;
}

export const useVoiceSession = ({
  onTranscriptReceived,
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
    if (isRecording) return;
    const ok = await requestPermission();
    if (!ok) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = rec;
      setIsRecording(true);
      onSpeechStarted?.();

      // Ses seviyesi ölçümü
      levelTimer.current = setInterval(async () => {
        if (!recording.current) return;
        const status = await recording.current.getStatusAsync();
        if (status.isRecording && status.metering)
          onSoundLevelChange?.(status.metering);
      }, 120);
    } catch (err) {
      // console.warn('Kayıt başlatılamadı:', err);
    }
  }, [isRecording, onSoundLevelChange, onSpeechStarted]);

  const stopRecording = useCallback(async () => {
    if (!recording.current) return;
    if (levelTimer.current) {
      clearInterval(levelTimer.current);
      levelTimer.current = null;
    }
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
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
          const text = await transcribeAudio(uri);
          onTranscriptReceived?.(text);
        } catch (err) {
          // console.error('[useVoice] transcribeAudio error:', err);
          onTranscriptReceived?.('');
        }
      }
    } catch (err) {
      // console.warn('Kayıt durdurulamadı:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onSpeechEnded, onTranscriptReceived]);

  const speakText = useCallback(async (text: string) => {
    try {
      // iOS için ses modunu ayarla
      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      }

      const url = await textToSpeech(text, therapistId);
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: url },
        { 
          shouldPlay: true,
          volume: 1.0,
          isMuted: false
        },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            s.unloadAsync();
          }
        }
      );
      sound.current = s;
    } catch (err) {
      console.warn('Ses çalınamadı:', err);
    }
  }, [therapistId]);

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