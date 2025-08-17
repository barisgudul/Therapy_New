// supabase/functions/_shared/ai.service.ts

import { AppEvent } from "./event.service.ts";
import { supabase } from "./supabase-admin.ts"; // Admin client'ı buradan alacağız
import { ApiError } from "./errors.ts";
import { VaultData } from "./types/context.ts"; // VaultData tipini import et

// Bu fonksiyonu bu dosyanın içine taşıdık.
export async function invokeGemini(
  prompt: string,
  model: string,
  config?: {
    temperature?: number;
    responseMimeType?: string;
    maxOutputTokens?: number;
  },
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "gemini",
        payload: { model, prompt, config },
      },
    });

    if (error) throw error;

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("API Gateway'den boş Gemini yanıtı alındı.");

    return reply;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[invokeGemini] Hatası:", msg);
    throw new ApiError("AI servisi şu anda kullanılamıyor.");
  }
}

// Sözleşme: AI'dan beklediğimiz paket tipi
// Sözleşme: AI'dan beklediğimiz YENİ ve AKILLI paket tipi
export interface ElegantReportPayload {
  // Artık tek bir markdown yok. Her parçanın kendi kimliği var.
  reportSections: {
    mainTitle: string; // Ana Başlık
    overview: string; // Genel Bakış
    goldenThread: string; // Altın İplik
    blindSpot: string; // Kör Nokta
  };
  // Metafor: Kelimelerin ötesine geçmek için.
  reportAnalogy: {
    title: string; // Metafor Başlığı
    text: string; // Metaforun açıklaması
  };
  // Türetilmiş veri (keywords kaldırıldı)
  derivedData: {
    readMinutes: number;
    headingsCount: number;
  };
}

// Paket üreten raporlayıcı
export async function generateElegantReport(
  events: AppEvent[],
  vault: VaultData,
  _days: number,
  predictions?: any[],
): Promise<ElegantReportPayload> {
  const hasAnyEvents = Array.isArray(events) && events.length > 0;
  const formattedEvents = hasAnyEvents
    ? events.map((e) => {
      const content = e.data?.text || e.data?.dreamText || e.data?.todayNote ||
        "İçerik detayı yok.";
      return `- ${
        new Date(e.created_at).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
        })
      }: [${e.type}] - ${String(content).substring(0, 150)}`;
    }).join("\n")
    : "- Veri sinyali sınırlı.";

  const goalLine = vault?.profile?.therapyGoals
    ? `KULLANICININ HEDEFİ: ${String(vault.profile.therapyGoals)}`
    : "";
  const predictionsBlock = (predictions && predictions.length > 0)
    ? `GEÇMİŞ TAHMİNLER:\n` +
      predictions.map((p) => `- ${p.title}: ${p.description}`).join("\n")
    : "";
  // Kullanıcı bağlamı: isim bilgisi varsa, AI doğrudan ismiyle hitap etsin
  const userName = vault?.profile?.nickname ?? null;
  const userContextLine = userName
    ? `KULLANICI BİLGİSİ: İsmi ${userName}.`
    : "";

  // PANO tarzı çıktı isteyen yeni prompt (Aynadaki Yansıma: ikinci tekil şahıs zorunlu)
  const prompt = `
  ROL: Sen, bir veri görselleştirme uzmanı ve psikolojik analistsin. Bir robottan çok, bilge ve empatik bir yol arkadaşı gibisin.

  GÖREV: Sana verilen verilerden yola çıkarak, Zihin Panosu için yapısal bileşenleri içeren TEK BİR JSON objesi üret.

  SAĞLANAN VERİLER:
  ${userContextLine}
  ${formattedEvents}
  ${goalLine}
  ${predictionsBlock}

  İSTENEN JSON ÇIKTI YAPISI (KESİNLİKLE UYULMALIDIR):
  {
    "reportSections": {
      "mainTitle": "Bu dönemin en vurucu ve özet başlığını YAZ.",
      "overview": "2-3 cümlelik, dönemin ana temasını özetleyen bir giriş paragrafı YAZ.",
      "goldenThread": "Olaylar arasındaki ana neden-sonuç ilişkisini anlatan 2 paragraflık bir analiz YAZ. Bu, 'Günlük Kayıtların Analizi' bölümü olacak.",
      "blindSpot": "'Fark ettin mi?' ile başlayan ve görmediği bir kalıbı ortaya çıkaran 1 paragraflık bölümü YAZ."
    },
    "reportAnalogy": {
      "title": "Tüm analizi özetleyen bir metafor veya analoji başlığı YAZ. Örn: 'İki Cephede Savaşan Bir Komutan'.",
      "text": "Bu metaforu 1-2 cümleyle açıkla."
    },
    "derivedData": {
      "readMinutes": 2,
      "headingsCount": 4
    }
  }

  KURALLAR:
  - **EN ÖNEMLİ KURAL: Tüm metni doğrudan ikinci tekil şahıs ('sen') kullanarak yaz. Sanki karşısında oturmuş onunla konuşuyorsun. Ona kendisinden üçüncü bir şahıs gibi ('Barış şunu yaptı', 'Barış'ın duyguları') ASLA bahsetme. Ona doğrudan hitap et ('Şunu yaptın', 'Senin duyguların...').**
  - **Eğer ismini biliyorsan ('Barış'), cümlenin veya paragrafın başına bir kere ismiyle hitap et, sonra 'sen' diye devam et. Örnek: 'Barış, bu dönemde projelerine odaklandığını görüyorum. Senin için bu durum...'.**
  - Cevabın SADECE yukarıdaki JSON formatında olsun. Başka hiçbir şey ekleme.
  - Markdown kullanMA. Çıktı düz metin (plain text) olacak. Vurgu için **kelime** formatını KULLANABİLİRSİN.
  - Her metin alanı (overview, goldenThread vb.) kısa ve öz olsun. Amacımız bir bakışta anlaşılmak.
  - Emoji YOK. Liste YOK.
  `;

  const responseText = await invokeGemini(prompt, "gemini-1.5-pro", {
    responseMimeType: "application/json",
    temperature: 0.7,
  });

  try {
    const parsed = JSON.parse(responseText) as ElegantReportPayload;
    if (parsed && parsed.reportSections && parsed.reportAnalogy) {
      return parsed;
    }
  } catch (e) {
    console.error("AI'dan dönen JSON parse edilemedi:", e, responseText);
  }

  // Güvenli fallback
  return {
    reportSections: {
      mainTitle: "Analiz Başarısız Oldu",
      overview: "Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
      goldenThread: "",
      blindSpot: "",
    },
    reportAnalogy: { title: "Veri Akışı Kesintisi", text: "Sinyal alınamadı." },
    derivedData: { readMinutes: 1, headingsCount: 1 },
  };
}

// Embedding helper - API Gateway üstünden Gemini Embedding çağrısı
export async function embedContent(content: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "gemini-embed",
        payload: { content },
      },
    });
    if (error) throw error;
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[embedContent] Hatası:", msg);
    return { embedding: null, error: msg };
  }
}
