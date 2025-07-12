import { corsHeaders } from '../_shared/cors.ts';

const GCP_SERVER_CONFIG = {
  speechToText: {
    languageCode: 'tr-TR',
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    enableAutomaticPunctuation: true,
    model: 'latest_long',
  },
  textToSpeech: {
    therapist1: {
      languageCode: 'tr-TR',
      name: 'tr-TR-Chirp3-HD-Despina',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ['handset-class-device'],
      },
    },
    therapist3: {
      languageCode: 'tr-TR',
      name: 'tr-TR-Chirp3-HD-Erinome',
      ssmlGender: 'FEMALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ['headset-class-device'],
      },
    },
    coach1: {
      languageCode: 'tr-TR',
      name: 'tr-TR-Chirp3-HD-Algieba',
      ssmlGender: 'MALE',
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ['large-home-entertainment-class-device'],
      },
    },
  },
} // <- Sadece TEK BİR bitiş parantezi. Noktalı virgül VEYA virgül YOK.

// Hemen sonra Deno.serve başlıyor. Aradaki ayrım, yeni bir satırdır.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, payload } = await req.json();
    let responseData;

    switch (type) {
      case 'gemini': {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) throw new Error('Sunucuda GEMINI_API_KEY sırrı bulunamadı!');
        
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${payload.model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: payload.prompt }] }],
              ...(payload.config && { generationConfig: payload.config }),
            }),
          }
        );
        responseData = await geminiRes.json();
        if (!geminiRes.ok) throw new Error(responseData?.error?.message || 'Gemini API hatası.');
        break;
      }

      case 'speech-to-text': {
        const gcpApiKey = Deno.env.get('GCP_API_KEY');
        if (!gcpApiKey) throw new Error('Sunucuda GCP_API_KEY sırrı bulunamadı!');
        
        const sttPayload = {
          config: GCP_SERVER_CONFIG.speechToText,
          audio: payload.audio,
        };

        const sttRes = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${gcpApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sttPayload),
        });
        responseData = await sttRes.json();
        if (!sttRes.ok) throw new Error(responseData?.error?.message || 'GCP STT hatası.');
        break;
      }

      case 'text-to-speech': {
        const gcpApiKey = Deno.env.get('GCP_API_KEY');
        if (!gcpApiKey) throw new Error('Sunucuda GCP_API_KEY sırrı bulunamadı!');
        
        const voiceConfig = GCP_SERVER_CONFIG.textToSpeech[payload.therapistId] || GCP_SERVER_CONFIG.textToSpeech.therapist1;
        const ttsPayload = {
          input: { text: payload.text },
          voice: { languageCode: voiceConfig.languageCode, name: voiceConfig.name, ssmlGender: voiceConfig.ssmlGender, },
          audioConfig: voiceConfig.audioConfig
        };

        const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${gcpApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ttsPayload),
        });
        responseData = await ttsRes.json();
        if (!ttsRes.ok) throw new Error(responseData?.error?.message || 'GCP TTS hatası.');
        break;
      }

      default:
        throw new Error(`Bilinmeyen API tipi: ${type}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});