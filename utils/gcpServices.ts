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
  name: 'tr-TR-Wavenet-A',
  ssmlGender: 'FEMALE',
};
// --------------------------------

// Terapistlere özel ses ayarları
const therapistVoiceConfigs: Record<string, any> = {
  therapist1: { // Dr. Elif - Şefkatli ve anaç
    name: 'tr-TR-Wavenet-C', // Wavenet daha doğal ses
    speakingRate: 0.92, // Biraz daha yavaş ve doğal
    pitch: -1.5, // Daha sıcak ve yumuşak ton
    volumeGainDb: 0,
    effectsProfileId: ['headphone-class-device'] // Daha doğal ses efekti
  },
  therapist3: { // Dr. Lina - Enerjik ve motive edici
    name: 'tr-TR-Wavenet-D', // Wavenet daha doğal ses
    speakingRate: 1.02, // Biraz daha canlı ama doğal
    pitch: 0.5, // Daha enerjik ama doğal ton
    volumeGainDb: 0,
    effectsProfileId: ['headphone-class-device']
  },
  coach1: { // Coach Can - Dinamik ve ilham verici
    name: 'tr-TR-Wavenet-B', // Wavenet daha doğal ses
    speakingRate: 0.95, // Dengeli ve profesyonel
    pitch: -3.0, // Erkek sesi için daha düşük ton
    volumeGainDb: 0,
    effectsProfileId: ['headphone-class-device']
  }
};

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
    // console.warn('[GCP STT] Kayıt formatı m4a/aac, encoding MP3 olarak ayarlandı.');
  }
  const audio64 = await audioToBase64(audioUri);
  const requestBody = { config: { ...STT_CFG, encoding, sampleRateHertz }, audio: { content: audio64 } };
  // console.log('[GCP STT] Request body:', JSON.stringify(requestBody));
  try {
    const res = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const json = await res.json();
    // console.log('[GCP STT] Response:', JSON.stringify(json));
    if (json.error) {
      // console.error('[GCP STT] Error:', json.error);
      throw new Error(json.error.message || 'GCP STT hatası');
    }
    return json?.results?.[0]?.alternatives?.[0]?.transcript ?? '';
  } catch (err: any) {
    // console.error('[GCP STT] Exception:', err);
    throw err;
  }
};

// Text‑to‑Speech → mp3 URI döner
export const textToSpeech = async (text: string, therapistId: string = 'therapist1'): Promise<string> => {
  const voiceConfig = EXTRA?.GCP_CONFIG?.textToSpeech?.[therapistId] || EXTRA?.GCP_CONFIG?.textToSpeech?.therapist1;
  
  if (!voiceConfig) {
    throw new Error('Ses konfigürasyonu bulunamadı');
  }

  const requestBody = {
    input: { text },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: voiceConfig.speakingRate || 1.0,
      pitch: voiceConfig.pitch || 0,
      volumeGainDb: voiceConfig.volumeGainDb || 0
    } as {
      audioEncoding: string;
      speakingRate: number;
      pitch: number;
      volumeGainDb: number;
      effectsProfileId?: string[];
      sampleRateHertz?: number;
      audioProfiles?: string[];
    }
  };

  if (voiceConfig.effectsProfileId) {
    requestBody.audioConfig.effectsProfileId = voiceConfig.effectsProfileId;
  }
  if (voiceConfig.sampleRateHertz) {
    requestBody.audioConfig.sampleRateHertz = voiceConfig.sampleRateHertz;
  }
  if (voiceConfig.audioProfiles) {
    requestBody.audioConfig.audioProfiles = voiceConfig.audioProfiles;
  }

  console.log('TTS Request Body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${EXTRA?.GCP_CONFIG?.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('TTS API Error Response:', JSON.stringify(responseData, null, 2));
      throw new Error(`TTS API hatası: ${response.status} - ${responseData.error?.message || 'Bilinmeyen hata'}`);
    }

    if (!responseData.audioContent) {
      throw new Error('Ses içeriği alınamadı');
    }

    // Base64 ses verisini doğrudan dosyaya yaz
    const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempUri, responseData.audioContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return tempUri;
  } catch (error) {
    console.error('Text-to-Speech detaylı hata:', error);
    throw error;
  }
};