// hooks/useVoice.ts
import { Audio } from "expo-av"; // expo-audio ile aynı API
import { useCallback, useRef, useState } from "react";
import { textToSpeech } from "../utils/gcpServices"; // Bu zaten vardı, dokunma
import * as FileSystem from "expo-file-system";
import { supabase } from "../utils/supabase";

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

  const recording = useRef<Audio.Recording | null>(null);
  const sound = useRef<Audio.Sound | null>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log("🎤 [expo-av] ATTEMPTING TO START RECORDING...");
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.error("Mikrofon izni verilmedi.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // expo-av'nin modern ve basit API'si
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY_16000_MONO_WAV, // Google için mükemmel ön-ayar
      );

      recording.current = newRecording;
      setIsRecording(true);
      console.log("✅ [expo-av] RECORDING STARTED SUCCESSFULLY.");
    } catch (err) {
      console.error("🔴 FAILED TO START RECORDING:", err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording.current) return;

    console.log("🛑 [expo-av] ATTEMPTING TO STOP RECORDING...");
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      console.log("   -> Recording stopped. URI:", uri);

      if (uri) {
        // transcribeAudio fonksiyonu zaten base64'e çeviriyor, o yüzden ona dokunma
        const text = await transcribeAudio(uri);
        onTranscriptReceived?.(text);
      }
    } catch (err) {
      console.error("🔴 FAILED TO STOP RECORDING:", err);
    } finally {
      setIsProcessing(false);
      console.log("✅ PROCESSING FINISHED.");
    }
  }, [onTranscriptReceived]);

  const speakText = useCallback(
    async (text: string, therapistIdArg?: string) => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const url = await textToSpeech(text, therapistIdArg || therapistId);

        // Önceki sound'u temizle
        if (sound.current) {
          await sound.current.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              onSpeechPlaybackStatusUpdate?.({ isPlaying: status.isPlaying });
              if (status.didJustFinish) {
                newSound.unloadAsync();
              }
            }
          },
        );
        sound.current = newSound;
      } catch (err) {
        console.warn("Ses çalınamadı:", err);
        onSpeechPlaybackStatusUpdate?.({ isPlaying: false });
      }
    },
    [therapistId, onSpeechPlaybackStatusUpdate],
  );

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    speakText,
  };
};

// transcribeAudio Google'a gönderdiği için o dosyada bir değişiklik gerekmiyor
async function transcribeAudio(audioUri: string): Promise<string> {
  // ... utils/gcpServices.ts dosyasındaki mevcut transcribeAudio kodun...
  // Bu kodun burada olmasına gerek yok, sadece bir hatırlatma.
  // O dosyadaki kod base64'e çevirip Supabase'e yolluyor, o kısım doğru.
  // Şimdilik buraya placeholder koyalım.

  console.log(`[Placeholder] Transcribing audio at: ${audioUri}`);
  try {
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "speech-to-text",
        payload: {
          audio: {
            content: await FileSystem.readAsStringAsync(audioUri, {
              encoding: FileSystem.EncodingType.Base64,
            }),
          },
        },
      },
    });
    if (error) throw error;
    return data?.results?.[0]?.alternatives?.[0]?.transcript ?? "";
  } catch (err) {
    console.error("Transcribe hatası:", err);
    return "";
  }
}
