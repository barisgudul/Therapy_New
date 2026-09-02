// supabase/functions/_shared/crisis-resources.ts
//
// Kriz (level_3_high_alert) tespitinde kullanıcıya gösterilecek ŞEFKATLİ mesaj
// ve GERÇEK acil yardım kaynakları. Eskiden yalnızca yarım, TR-only bir hata
// metni dönüyordu ve hiç acil yardım hattı yoktu — bir ruh sağlığı ürününde en
// kritik eksik. Bu modül tek kaynaktır; hem safety-guard hem api-gateway kullanır.
//
// Numaralar bilerek konservatif ve yaygın/doğrulanabilir tutuldu. Yerel acil
// numara her zaman önce vurgulanır.

export interface CrisisResource {
  label: string;
  phone: string;
  note?: string;
}

export interface CrisisPayload {
  // Geriye uyumluluk: eski tüketiciler hâlâ `error` ve `code` okuyabilir.
  error: string;
  code: "SECURITY_VIOLATION_HIGH_RISK";
  // Yeni, zengin alanlar: istemci doğru bir kriz ekranı çizebilsin diye.
  crisis: true;
  title: string;
  message: string;
  resources: CrisisResource[];
}

type Lang = "tr" | "en" | "de";

const BUNDLES: Record<Lang, {
  title: string;
  message: string;
  resources: CrisisResource[];
}> = {
  tr: {
    title: "Yalnız değilsin",
    message:
      "Yazdıkların beni endişelendirdi ve güvende olman benim için çok değerli. " +
      "Şu an çok zor bir andan geçiyor olabilirsin — bunu tek başına taşımak " +
      "zorunda değilsin. Lütfen hemen bir uzmana veya güvendiğin birine ulaş. " +
      "Aşağıdaki hatlar 7/24 açık ve ücretsiz.",
    resources: [
      { label: "Acil Çağrı Merkezi", phone: "112", note: "Hayati tehlike durumunda hemen ara" },
      { label: "Sağlık Bakanlığı Danışma (SABİM)", phone: "184" },
    ],
  },
  en: {
    title: "You are not alone",
    message:
      "What you wrote worries me, and your safety matters deeply. You may be " +
      "going through an incredibly hard moment — you don't have to carry this " +
      "alone. Please reach out to a professional or someone you trust right now. " +
      "The lines below are free and available 24/7.",
    resources: [
      { label: "Emergency", phone: "112 / 911", note: "If life is in danger, call now" },
      { label: "Suicide & Crisis Lifeline (US/Canada)", phone: "988" },
      { label: "Samaritans (UK & ROI)", phone: "116 123" },
    ],
  },
  de: {
    title: "Du bist nicht allein",
    message:
      "Was du geschrieben hast, macht mir Sorgen, und deine Sicherheit ist mir " +
      "sehr wichtig. Vielleicht durchlebst du gerade einen sehr schweren Moment — " +
      "du musst das nicht allein tragen. Bitte wende dich jetzt an Fachpersonen " +
      "oder an jemanden, dem du vertraust. Die folgenden Nummern sind kostenlos " +
      "und rund um die Uhr erreichbar.",
    resources: [
      { label: "Notruf", phone: "112", note: "Bei Lebensgefahr sofort anrufen" },
      { label: "Telefonseelsorge", phone: "0800 111 0 111" },
    ],
  },
};

export function getCrisisPayload(language?: string): CrisisPayload {
  const lang: Lang = (["tr", "en", "de"] as const).includes(language as Lang)
    ? (language as Lang)
    : "tr";
  const b = BUNDLES[lang];
  return {
    error: b.message,
    code: "SECURITY_VIOLATION_HIGH_RISK",
    crisis: true,
    title: b.title,
    message: b.message,
    resources: b.resources,
  };
}
