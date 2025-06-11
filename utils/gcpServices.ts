// --------------------------- gcpServices.ts ---------------------------
// Google Cloud Speech‑to‑Text & Text‑to‑Speech REST yardımcıları
// -------------------------------------------------------------
// Bu sürüm, **gcpConfig.ts** olmadan doğrudan Expo Constants.extra içinden
// API anahtarı ve config parametrelerini okur. Böylece tek dosya yeter.
//
// app.config.js (ve git‑ignored app.config.local.js) içinde:
//   extra: {
//     GCP_CONFIG: {
//       apiKey: 'AIza...',
//       speechToText: { ... },
//       textToSpeech: { ... },
//     }
//   }
// -------------------------------------------------------------
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// -------- Runtime config --------
const EXTRA = Constants.expoConfig?.extra as any;
const API_KEY: string = EXTRA?.GCP_CONFIG?.apiKey ?? '<MISSING_API_KEY>';
const STT_CFG = EXTRA?.GCP_CONFIG?.speechToText ?? {
  languageCode: 'tr-TR',
  encoding: 'LINEAR16',
  sampleRateHertz: 44100,
  enableAutomaticPunctuation: true,
  model: 'default',
};
const TTS_CFG = EXTRA?.GCP_CONFIG?.textToSpeech ?? {
  languageCode: 'tr-TR',
  name: 'tr-TR-Standard-A',
  ssmlGender: 'FEMALE',
};
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
  // Dosya uzantısına göre encoding belirle
  let encoding = STT_CFG.encoding;
  let sampleRateHertz = STT_CFG.sampleRateHertz;
  const ext = audioUri.split('.').pop()?.toLowerCase();
  if (ext === 'm4a' || ext === 'aac') {
    encoding = 'MP3'; // GCP STT için en yakın desteklenen format
    // sampleRateHertz'i değiştirmeye gerek yok, ama isterseniz loglayabilirsiniz
    console.warn('[GCP STT] Kayıt formatı m4a/aac, encoding MP3 olarak ayarlandı.');
  }
  const audio64 = await audioToBase64(audioUri);
  const requestBody = { config: { ...STT_CFG, encoding, sampleRateHertz }, audio: { content: audio64 } };
  console.log('[GCP STT] Request body:', JSON.stringify(requestBody));
  try {
    const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const json = await res.json();
    console.log('[GCP STT] Response:', JSON.stringify(json));
    if (json.error) {
      console.error('[GCP STT] Error:', json.error);
      throw new Error(json.error.message || 'GCP STT hatası');
    }
    return json?.results?.[0]?.alternatives?.[0]?.transcript ?? '';
  } catch (err: any) {
    console.error('[GCP STT] Exception:', err);
    throw err;
  }
};

// Text‑to‑Speech → mp3 URI döner
export const textToSpeech = async (text: string): Promise<string> => {
  const requestBody = { input: { text }, voice: TTS_CFG, audioConfig: { audioEncoding: 'MP3' } };
  console.log('[GCP TTS] Request body:', JSON.stringify(requestBody));
  try {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const json = await res.json();
    console.log('[GCP TTS] Response:', JSON.stringify(json));
    if (json.error) {
      console.error('[GCP TTS] Error:', json.error);
      throw new Error(json.error.message || 'GCP TTS hatası');
    }
    if (!json.audioContent) throw new Error('audioContent boş');

    const path = FileSystem.cacheDirectory + `tts_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(path, json.audioContent, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  } catch (err: any) {
    console.error('[GCP TTS] Exception:', err);
    throw err;
  }
};