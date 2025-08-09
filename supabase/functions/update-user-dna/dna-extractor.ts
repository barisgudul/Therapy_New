// dna-extractor.ts
// DNA çıkarma mantığını ayrı bir modülde tutalım ki test edilebilsin

// === DNA ÇÖZÜCÜ KONFİGÜRASYONU ===
// Tüm sihirli sayılar burada tanımlı ve açıklamalı
export const DNA_CONFIG = {
    // Sentiment analizi için normalizasyon faktörleri
    SENTIMENT_NORMALIZATION_FACTOR: 10, // Her 10 kelimede 1 duygu kelimesi normal kabul edilir
    SENTIMENT_MIN: -1, // Minimum duygu skoru (çok negatif)
    SENTIMENT_MAX: 1, // Maksimum duygu skoru (çok pozitif)

    // Enerji seviyesi hesaplama parametreleri
    ENERGY_EXCLAMATION_WEIGHT: 20, // Her 20 kelimede 1 ünlem normal enerji
    ENERGY_UPPERCASE_MULTIPLIER: 2, // Büyük harf oranının enerji üzerindeki etkisi
    ENERGY_MAX: 1, // Maksimum enerji seviyesi

    // Karmaşıklık skoru ağırlıkları
    COMPLEXITY_AVG_WORD_DIVISOR: 6, // Ortalama kelime uzunluğu normalleştirme (8->6: daha hassas)
    COMPLEXITY_WORD_LENGTH_WEIGHT: 0.6, // Kelime uzunluğunun karmaşıklıktaki payı (artırıldı)
    COMPLEXITY_LEXICAL_DIVERSITY_WEIGHT: 0.4, // Kelime çeşitliliğinin karmaşıklıktaki payı (azaltıldı)
    COMPLEXITY_MAX: 1, // Maksimum karmaşıklık skoru

    // İçe dönüklük hesaplama
    INTROSPECTION_NORMALIZATION_FACTOR: 8, // Her 8 kelimede 1 içe dönük kelime normal
    INTROSPECTION_MAX: 1, // Maksimum içe dönüklük skoru

    // Sosyal bağlantı hesaplama
    SOCIAL_NORMALIZATION_FACTOR: 10, // Her 10 kelimede 1 sosyal kelime normal
    SOCIAL_MAX: 1, // Maksimum sosyal bağlantı skoru
} as const;

export interface MiniDnaProfile {
    sentiment_score: number; // -1 ile +1 arasında
    energy_level: number; // 0 ile 1 arasında
    complexity_score: number; // 0 ile 1 arasında (cümle uzunluğu, kelime çeşitliliği)
    introspection_depth: number; // 0 ile 1 arasında (kendine dönük düşünce yoğunluğu)
    social_connection: number; // 0 ile 1 arasında (başkalarından bahsetme sıklığı)
}

// === HIZLI VE BEDAVA DNA ÇÖZÜCÜsü: Basit Kurallar ===
// AI çağrısı YASAK! Sadece basit, hızlı kurallar.
export function extractMiniDna(content: string): MiniDnaProfile {
    const text = content.toLowerCase().trim();
    const words = text.split(/\s+/);
    const wordCount = words.length;
    const charCount = text.length;

    // === SENTIMENT SCORE: Duygu kelimelerine göre ===
    const positiveWords = [
        "mutlu",
        "güzel",
        "harika",
        "mükemmel",
        "seviyorum",
        "başarılı",
        "keyifli",
        "huzurlu",
    ];
    const negativeWords = [
        "üzgün",
        "kötü",
        "berbat",
        "nefret",
        "korkunç",
        "başarısız",
        "kaygılı",
        "stresli",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
        if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
        if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
    }

    const sentiment_score = Math.max(
        DNA_CONFIG.SENTIMENT_MIN,
        Math.min(
            DNA_CONFIG.SENTIMENT_MAX,
            (positiveCount - negativeCount) /
                Math.max(
                    wordCount / DNA_CONFIG.SENTIMENT_NORMALIZATION_FACTOR,
                    1,
                ),
        ),
    );

    // === ENERGY LEVEL: Ünlem ve büyük harf yoğunluğu ===
    const exclamationCount = (text.match(/!/g) || []).length;
    const uppercaseRatio = (text.match(/[A-ZÇĞİÖŞÜ]/g) || []).length /
        charCount;
    const energy_level = Math.min(
        DNA_CONFIG.ENERGY_MAX,
        (exclamationCount /
            Math.max(wordCount / DNA_CONFIG.ENERGY_EXCLAMATION_WEIGHT, 1)) +
            uppercaseRatio * DNA_CONFIG.ENERGY_UPPERCASE_MULTIPLIER,
    );

    // === COMPLEXITY SCORE: Cümle uzunluğu ve kelime çeşitliliği ===
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) /
        wordCount;
    const uniqueWords = new Set(words).size;
    const lexicalDiversity = uniqueWords / wordCount;

    const complexity_score = Math.min(
        DNA_CONFIG.COMPLEXITY_MAX,
        (avgWordLength / DNA_CONFIG.COMPLEXITY_AVG_WORD_DIVISOR) *
                DNA_CONFIG.COMPLEXITY_WORD_LENGTH_WEIGHT +
            lexicalDiversity * DNA_CONFIG.COMPLEXITY_LEXICAL_DIVERSITY_WEIGHT,
    );

    // === INTROSPECTION DEPTH: Kendine dönük kelimeler ===
    const introspectiveWords = [
        "ben",
        "beni",
        "benim",
        "kendim",
        "hissediyorum",
        "düşünüyorum",
        "iç",
    ];
    let introspectiveCount = 0;

    for (const word of words) {
        if (introspectiveWords.some((iw) => word.includes(iw))) {
            introspectiveCount++;
        }
    }

    const introspection_depth = Math.min(
        DNA_CONFIG.INTROSPECTION_MAX,
        introspectiveCount /
            Math.max(
                wordCount / DNA_CONFIG.INTROSPECTION_NORMALIZATION_FACTOR,
                1,
            ),
    );

    // === SOCIAL CONNECTION: Sosyal kelimeler ===
    const socialWords = [
        "arkadaş",
        "aile",
        "birlikte",
        "beraber",
        "insanlar",
        "biz",
        "onlar",
        "konuştuk",
    ];
    let socialCount = 0;

    for (const word of words) {
        if (socialWords.some((sw) => word.includes(sw))) socialCount++;
    }

    const social_connection = Math.min(
        DNA_CONFIG.SOCIAL_MAX,
        socialCount /
            Math.max(wordCount / DNA_CONFIG.SOCIAL_NORMALIZATION_FACTOR, 1),
    );

    return {
        sentiment_score: Number(sentiment_score.toFixed(2)),
        energy_level: Number(energy_level.toFixed(2)),
        complexity_score: Number(complexity_score.toFixed(2)),
        introspection_depth: Number(introspection_depth.toFixed(2)),
        social_connection: Number(social_connection.toFixed(2)),
    };
}
