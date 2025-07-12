// --------------------------- gcpServices.ts ---------------------------
// Google Cloud Speech‑to‑Text & Text‑to‑Speech REST yardımcıları
// -------------------------------------------------------------
// Tüm ayarlar doğrudan app.config.local.js (EXTRA.GCP_CONFIG) üzerinden alınır.
// -------------------------------------------------------------
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

// Ses dosyasını Base64'e çevirir
export async function audioToBase64(uri: string): Promise<string> {
  if (uri.startsWith('file://')) {
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export const transcribeAudio = async (audioUri: string): Promise<string> => {
  const audioContent = await audioToBase64(audioUri);
  // Teknik odaya sadece ses dosyasını gönderiyoruz.
  const payload = { audio: { content: audioContent } };
  const { data, error } = await supabase.functions.invoke('api-gateway', {
    body: { type: 'speech-to-text', payload },
  });
  if (error) throw error;
  return data?.results?.[0]?.alternatives?.[0]?.transcript ?? '';
};

export const textToSpeech = async (text: string, therapistId: string = 'therapist1'): Promise<string> => {
  // Teknik odaya sadece metni ve terapist kimliğini gönderiyoruz.
  const payload = { text, therapistId };
  const { data, error } = await supabase.functions.invoke('api-gateway', {
    body: { type: 'text-to-speech', payload },
  });
  if (error) throw error;
  if (!data?.audioContent) throw new Error('Ses içeriği alınamadı');
  const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(tempUri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
  return tempUri;
};