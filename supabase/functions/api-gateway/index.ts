// supabase/functions/api-gateway/index.ts
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY_FOR_GATEWAY = Deno.env.get('GEMINI_API_KEY'); // Anahtarı bir kere al, tekrar tekrar sorma.

async function classifyTextForSafety(text: string): Promise<string> {
    // Eğer API anahtarı yoksa, bu kritik bir yapılandırma hatasıdır.
    if (!GEMINI_API_KEY_FOR_GATEWAY) {
        console.error("KRİTİK HATA: GEMINI_API_KEY sunucu ortam değişkenlerinde bulunamadı!");
        // Güvenlik için en riskli durumu varsayarak devam et ama logla.
        return 'level_3_high_alert'; 
    }
    
    // Bu prompt, senin `ai.service.ts` içinde sildiğin classifyTextSafety'den daha kısa ve net.
    const prompt = `Metni SADECE şu kategorilerden biriyle etiketle: ['level_0_safe', 'level_1_mild_concern', 'level_2_moderate_risk', 'level_3_high_alert']. METİN: "${text}" KATEGORİ:`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY_FOR_GATEWAY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.0, maxOutputTokens: 10 }
            }),
        });

        if (!res.ok) {
            // API'den hata dönerse, logla ve güvenli tarafta kal.
            const errorBody = await res.text();
            console.error(`Güvenlik sınıflandırma API hatası: ${res.status} ${errorBody}`);
            return 'level_2_moderate_risk';
        }

        const data = await res.json();
        const classification = data?.candidates?.[0]?.content?.parts?.[0]?.text.trim()?.toLowerCase() || 'level_2_moderate_risk';

        // Gelen cevabın beklenen formatta olduğunu doğrula.
        const validClassifications = ['level_0_safe', 'level_1_mild_concern', 'level_2_moderate_risk', 'level_3_high_alert'];
        if (validClassifications.includes(classification)) {
            return classification;
        }

        console.warn(`Beklenmedik sınıflandırma sonucu: '${classification}'. Riskli varsayılıyor.`);
        return 'level_2_moderate_risk';

    } catch (error) {
        console.error('[API-GATEWAY] Güvenlik sınıflandırması ağ hatası:', error.message);
        // Ağ hatası gibi durumlarda, güvenli tarafta kal.
        return 'level_2_moderate_risk';
    }
}

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

    // --- MERKEZİ GÜVENLİK KAPI GÖREVLİSİ ---
    // `prompt` veya `text` alanlarından hangisi varsa onu kontrol et.
    const textToAnalyze = payload.prompt || payload.text;
    
    if (textToAnalyze && typeof textToAnalyze === 'string' && textToAnalyze.trim().length > 0) {
      const safetyLevel = await classifyTextForSafety(textToAnalyze);

      // Yüksek riskli (sadece level 3) içeriklere kapıyı kapat.
      if (safetyLevel === 'level_3_high_alert') {
        console.warn(`🚨 GÜVENLİK İHLALİ: API Gateway'de '${safetyLevel}' seviyesinde riskli içerik engellendi.`);
        // Frontend'e ANLAŞILIR bir hata dönüyoruz.
        return new Response(JSON.stringify({
          error: "Okuduklarım beni endişelendirdi ve güvende olman benim için çok önemli. Unutma, yalnız değilsin ve yardım istemek bir güç göstergesidir. Lütfen profesyonel destek alabileceğin bu kaynaklardan birine ulaşmayı düşün: \n\n• Acil Tıbbi Yardım: 112\n• Sosyal Destek Hattı: 183",
          code: 'SECURITY_VIOLATION_HIGH_RISK' 
        }), { 
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    // --- GÜVENLİK KONTROLÜNDEN GEÇTİ, İŞLEME DEVAM ---

    let responseData;
    switch (type) {
      case 'gemini': {
        // Artık burası temiz, çünkü güvenlik yukarıda halledildi.
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY'); // veya önceden tanımlanan sabiti kullan.
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