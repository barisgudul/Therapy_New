// services/analysis_pipeline/2_processor.ts

// Gelişmiş token tahmini
export function estimateTokenCount(text: string): number {
  // Daha doğru token tahmini: Türkçe için 1 token ≈ 3.5 karakter
  return Math.ceil(text.length / 3.5);
}

// Akıllı veri yoğunlaştırma fonksiyonu
export async function compressEventsForAnalysis(events: any[], days: number): Promise<any[]> {
    const MAX_TOKENS_FOR_CONTEXT = 7500;
    let currentTokens = 0;
    const compressedData: any[] = [];
    const priorityOrder = ['journey_log_entry', 'dream_analysis', 'diary_entry', 'text_session', 'voice_session', 'video_session'];

    for (const eventType of priorityOrder) {
        const typeEvents = events.filter(e => e.type === eventType);

        for (const event of typeEvents) {
            const eventTokens = estimateTokenCount(JSON.stringify(event));

            if (currentTokens + eventTokens <= MAX_TOKENS_FOR_CONTEXT) {
                compressedData.push(event);
                currentTokens += eventTokens;
            } else {
                // Eğer bir olay olduğu gibi sığmıyorsa, daha fazla ekleme yapma.
                console.warn(`Token limitine ulaşıldı. ${events.length - compressedData.length} olay analizden çıkarıldı.`);
                // Analizi en dolu haliyle döndür.
                return compressedData;
            }
        }
    }
    return compressedData;
}

// Ana fonksiyon: Veri işleme ve sıkıştırma
export async function processAndCompressEvents(events: any[], days: number): Promise<any[]> {
  try {
    console.log(`[PROCESSOR] ${events.length} olay işleniyor...`);
    
    // Veriyi sıkıştır ve token limitini kontrol et
    const processedData = await compressEventsForAnalysis(events, days);
    
    console.log(`[PROCESSOR] ${processedData.length} olay işlendi ve sıkıştırıldı.`);
    return processedData;
  } catch (error) {
    console.error('[PROCESSOR] Veri işleme hatası:', error);
    throw error;
  }
} 