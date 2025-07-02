// --------------------------- gcpServices.ts ---------------------------
// Google Cloud Speech‑to‑Text & Text‑to‑Speech REST yardımcıları
// -------------------------------------------------------------
// Tüm ayarlar doğrudan app.config.local.js (EXTRA.GCP_CONFIG) üzerinden alınır.
// -------------------------------------------------------------
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// -------- Runtime config --------
const EXTRA = Constants.expoConfig?.extra as any;
const API_KEY: string = EXTRA?.GCP_CONFIG?.apiKey ?? '<MISSING_API_KEY>';
const STT_CFG = EXTRA?.GCP_CONFIG?.speechToText;
// --------------------------------

// Ses dosyasını Base64'e çevirir
const audioToBase64 = async (uri: string): Promise<string> => {
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
};

// Speech‑to‑Text
export const transcribeAudio = async (audioUri: string): Promise<string> => {
  const audio64 = await audioToBase64(audioUri);
  const requestBody = { config: STT_CFG, audio: { content: audio64 } };
  try {
    const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || 'GCP STT hatası');
    }
    return json?.results?.[0]?.alternatives?.[0]?.transcript ?? '';
  } catch (err: any) {
    throw err;
  }
};

// Güncellenmiş textToSpeech fonksiyonu (pitch ve yaş parametresi olmadan)
export const textToSpeech = async (
  text: string, 
  therapistId: string = 'therapist1'
): Promise<string> => {
  // Config dosyasından temel ses yapılandırmasını al
  const baseVoiceConfig = EXTRA?.GCP_CONFIG?.textToSpeech?.[therapistId] || EXTRA?.GCP_CONFIG?.textToSpeech?.therapist1;

  if (!baseVoiceConfig) {
    throw new Error(`Ses konfigürasyonu bulunamadı: ${therapistId}`);
  }

  // API'ye gönderilecek isteğin gövdesini oluştur (PITCH İLE İLGİLİ HER ŞEY KALDIRILDI)
  const requestBody = {
    input: { text },
    voice: {
      languageCode: baseVoiceConfig.languageCode,
      name: baseVoiceConfig.name,
      ssmlGender: baseVoiceConfig.ssmlGender
    },
    audioConfig: baseVoiceConfig.audioConfig 
  };
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(`TTS API hatası: ${response.status} - ${responseData.error?.message || 'Bilinmeyen hata'}`);
    }
    if (!responseData.audioContent) {
      throw new Error('Ses içeriği alınamadı');
    }
    const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempUri, responseData.audioContent, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return tempUri;
  } catch (error) {
    console.error('[textToSpeech] Hata:', error);
    throw error;
  }
};