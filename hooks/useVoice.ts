// hooks/useVoice.ts
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useState } from "react";
import { textToSpeech, transcribeAudio } from "../utils/gcpServices";

interface UseVoiceSessionProps {
  onTranscriptReceived?: (transcript: string) => void;
  onSpeechPlaybackStatusUpdate?: (status: { isPlaying: boolean }) => void;
  therapistId?: string;
}

export const useVoiceSession = ({
  onTranscriptReceived,
  onSpeechPlaybackStatusUpdate,
  therapistId = "therapist1",
}: UseVoiceSessionProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // expo-audio hook'larını kullan - GOOGLE'IN ANLAYACAĞI DİLDE
  const recorder = useAudioRecorder({
    // === ANA AYARLAR (Platform-independent) ===
    extension: ".wav",
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    ios: {
      outputFormat: "lpcm", // aac DEĞİL, lpcm (Linear PCM) olacak!
      audioQuality: 32, // Sıkıştırmayı engellemek için sayısal bir 'low' değeri.
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    android: {
      outputFormat: "default", // Android genellikle WAV için bunu sever
      audioEncoder: "default",
    },
  });

  const player = useAudioPlayer();

  const startRecording = useCallback(async () => {
    try {
      console.log("🎤 [expo-audio] ATTEMPTING TO START RECORDING...");
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.error("Mikrofon izni verilmedi.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      console.log("✅ [expo-audio] RECORDING STARTED SUCCESSFULLY.");
    } catch (err) {
      console.error("🔴 FAILED TO START RECORDING:", err);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      console.log("🛑 [expo-audio] ATTEMPTING TO STOP RECORDING...");
      setIsRecording(false);
      setIsProcessing(true);

      recorder.stop();
      const uri = recorder.uri;
      console.log(`   -> Recording stopped. URI: ${uri}`);

      if (uri) {
        const text = await transcribeAudio(uri);
        onTranscriptReceived?.(text);
      }
    } catch (err) {
      console.error("🔴 FAILED TO STOP RECORDING:", err);
    } finally {
      setIsProcessing(false);
      console.log("✅ PROCESSING FINISHED.");
    }
  }, [recorder, onTranscriptReceived]);

  const speakText = useCallback(
    async (text: string, therapistIdArg?: string) => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });

        const url = await textToSpeech(text, therapistIdArg || therapistId);

        player.replace(url);
        player.play();

        // Status listener ekle
        const unsubscribe = player.addListener(
          "playbackStatusUpdate",
          (status) => {
            onSpeechPlaybackStatusUpdate?.({ isPlaying: status.playing });
            if (status.didJustFinish) {
              player.remove();
            }
          },
        );

        return unsubscribe;
      } catch (err) {
        console.warn("Ses çalınamadı:", err);
        onSpeechPlaybackStatusUpdate?.({ isPlaying: false });
      }
    },
    [therapistId, onSpeechPlaybackStatusUpdate, player],
  );

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    speakText,
  };
};
