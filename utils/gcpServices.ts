// --------------------------- gcpServices.ts ---------------------------
// Google Cloud Speech‑to‑Text & Text‑to‑Speech REST yardımcıları

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
  console.log('🎤 [GCP-SERVICES] transcribeAudio başlatılıyor...', { audioUri });
  
  try {
    console.log('📁 [GCP-SERVICES] Ses dosyası base64\'e çevriliyor...');
    const audioContent = await audioToBase64(audioUri);
    console.log('✅ [GCP-SERVICES] Base64 çevirme tamamlandı:', { 
      contentLength: audioContent.length,
      hasContent: !!audioContent
    });
    
    // Teknik odaya sadece ses dosyasını gönderiyoruz.
    const payload = { audio: { content: audioContent } };
    
    console.log('📡 [GCP-SERVICES] API Gateway\'e istek gönderiliyor...');
    const { data, error } = await supabase.functions.invoke('api-gateway', {
      body: { type: 'speech-to-text', payload },
    });
    
    console.log('🔄 [GCP-SERVICES] API Gateway yanıtı:', { 
      hasData: !!data,
      hasError: !!error,
      error: error?.message || error
    });
    
    if (error) {
      console.error('❌ [GCP-SERVICES] API Gateway hatası:', error);
      throw error;
    }
    
    const transcript = data?.results?.[0]?.alternatives?.[0]?.transcript ?? '';
    console.log('📝 [GCP-SERVICES] Transkript sonucu:', { 
      transcript,
      length: transcript.length,
      isEmpty: !transcript || transcript.trim().length === 0
    });
    
    return transcript;
  } catch (err) {
    console.error('❌ [GCP-SERVICES] transcribeAudio genel hatası:', err);
    throw err;
  }
};

export const textToSpeech = async (text: string, therapistId: string = 'therapist1'): Promise<string> => {
  console.log('🔊 [GCP-SERVICES] textToSpeech başlatılıyor...', { text: text.substring(0, 50) + '...', therapistId });
  
  try {
    // Teknik odaya sadece metni ve terapist kimliğini gönderiyoruz.
    const payload = { text, therapistId };
    
    console.log('📡 [GCP-SERVICES] TTS API Gateway\'e istek gönderiliyor...');
    const { data, error } = await supabase.functions.invoke('api-gateway', {
      body: { type: 'text-to-speech', payload },
    });
    
    console.log('🔄 [GCP-SERVICES] TTS API Gateway yanıtı:', { 
      hasData: !!data,
      hasError: !!error,
      hasAudioContent: !!data?.audioContent
    });
    
    if (error) {
      console.error('❌ [GCP-SERVICES] TTS API Gateway hatası:', error);
      throw error;
    }
    
    if (!data?.audioContent) {
      console.error('❌ [GCP-SERVICES] Ses içeriği alınamadı');
      throw new Error('Ses içeriği alınamadı');
    }
    
    const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempUri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
    
    console.log('✅ [GCP-SERVICES] TTS tamamlandı:', { tempUri });
    return tempUri;
  } catch (err) {
    console.error('❌ [GCP-SERVICES] textToSpeech genel hatası:', err);
    throw err;
  }
};