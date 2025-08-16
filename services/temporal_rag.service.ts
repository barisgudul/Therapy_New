// services/temporal_rag.service.ts
import { AI_MODELS } from "../constants/AIConfig";
import { supabase } from "../utils/supabase";
import { invokeGemini } from "./ai.service";

// Dışarıya vereceğimiz analiz sonucunun tipini tanımlıyoruz.
export interface TemporalAnalysisResult {
    summary: string;
    chains: CausalityChain[];
    // Gelecekte eklenecekler: predictions, hiddenTriggers, etc.
}

export interface CausalityChain {
    cause: string;
    effect: string;
    timeDelta: string; // "2 gün sonra", "Aynı akşam" gibi.
    evidence: string; // AI'ın bu bağlantıyı neden kurduğunun açıklaması.
}

// Bu, veritabanından çekeceğimiz her anının tipidir.
interface TimeEmbedding {
    id: string;
    content: string;
    event_time: string;
    metadata: {
        type?: string;
        // ... rüya başlığı, günlük modu gibi diğer metaveriler
    };
    // Vektörleri şimdilik analizde kullanmayacağız, AI'a metinleri vereceğiz.
}

export class TemporalRAG {
    static async findCausalityChains(
        userId: string,
        days: number,
    ): Promise<TemporalAnalysisResult> {
        console.log(
            `[TEMPORAL-RAG] ${userId} için ${days} günlük neden-sonuç zincirleri aranıyor...`,
        );

        // =======================================================
        // FAZ 1: KANIT TOPLAMA
        // =======================================================
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: memories, error } = await supabase
            .from("event_time_embeddings")
            .select("id, content, event_time, metadata")
            .eq("user_id", userId)
            .gte("event_time", startDate.toISOString())
            .order("event_time", { ascending: true }); // Eskiden yeniye sırala!

        if (error) {
            console.error(
                "[TEMPORAL-RAG] Hafıza anıları çekilirken hata:",
                error,
            );
            throw new Error("Geçmiş anılar çekilemedi.");
        }

        if (!memories || memories.length < 3) {
            return {
                summary:
                    "Bu zaman aralığında yeterli veri bulunamadı. Zamanla, daha fazla anı biriktikçe bu analiz daha da güçlenecek.",
                chains: [],
            };
        }

        // =======================================================
        // FAZ 2 & 3: OLAY YERİ İNCELEME ve RAPOR YAZMA
        // =======================================================
        try {
            const analysisPrompt = this.getTemporalAnalysisPrompt(
                memories as TimeEmbedding[],
                days,
            );

            console.log(
                `[TEMPORAL-RAG] ${memories.length} anı ile zaman yolcusu beyni çağrılıyor...`,
            );

            const rawReport = await invokeGemini(
                analysisPrompt,
                AI_MODELS.POWERFUL,
                {
                    temperature: 0.6,
                },
            );

            // Burada normalde AI'dan dönen JSON'u parse ederdik, ama şimdilik
            // doğrudan metin olarak dönen bir rapor istiyoruz.
            return {
                summary: rawReport,
                chains: [], // Bu kısmı daha sonra AI'dan JSON olarak alacak şekilde güncelleyeceğiz.
            };
        } catch (e) {
            console.error("[TEMPORAL-RAG] AI analizi sırasında hata:", e);
            return {
                summary:
                    "Bilinçaltının derinliklerine inerken bir türbülansla karşılaştık. Analiz şu anda tamamlanamıyor, lütfen daha sonra tekrar deneyin.",
                chains: [],
            };
        }
    }

    // Bu, artık bu sınıfın özel bir metodudur. Dışarıdan çağrılmaz.
    private static getTemporalAnalysisPrompt(
        memories: TimeEmbedding[],
        days: number,
    ): string {
        return `
      ### ROL & GÖREV ###
      Sen, insan psikolojisinin derinliklerini anlayan ve zaman içindeki olaylar arasındaki gizli neden-sonuç ilişkilerini ortaya çıkaran bir "Bilinçaltı Arkeoloğu"sun. Görevin, sana sunulan anı parçalarını (hafıza kayıtlarını) birleştirerek, kullanıcının son ${days} gününe dair anlamlı, derin ve "vay be!" dedirtecek bir hikaye anlatmaktır.

      ### KANITLAR (Kullanıcının Hafıza Kayıtları) ###
      İşte son ${days} güne ait, kronolojik sırayla hafıza kayıtları:
      ${
            memories.map((m) => `
      - TARİH: ${new Date(m.event_time).toLocaleString("tr-TR")}
      - TÜR: ${m.metadata?.type || "Bilinmiyor"}
      - İÇERİK: "${m.content.substring(0, 200)}..." 
      `).join("\n")
        }

      ### ANALİZ TALİMATLARI (KESİNLİKLE UYULMALIDIR) ###
      1.  **Büyük Resmi Gör:** Sadece tekil olaylara odaklanma. Olaylar arasındaki **zincirleme reaksiyonları** bul. "Bu rüya, 2 gün sonraki o günlüğe nasıl zemin hazırladı?" "Bu seanstaki farkındalık, bir sonraki haftaki ruh halini nasıl etkiledi?" gibi sorular sor.
      2.  **Tetikleyicileri Avla:** Kullanıcının ruh halini belirgin şekilde değiştiren **kilit olayları** (tetikleyicileri) tespit et. Bu bir rüya, bir günlük girdisi veya bir seans olabilir.
      3.  **Kör Noktaları Aydınlat:** Kullanıcının kendisinin bile farkında olmadığı, tekrar eden davranış kalıplarını veya kaçındığı temaları ortaya çıkar.
      4.  **Empatik ve Yapıcı Ol:** Asla yargılama. "Hata yaptın" deme. "Görünüşe göre, bu olay seni derinden etkilemiş ve bu da şu sonuca yol açmış olabilir" gibi bir dil kullan.
      5.  **Hikaye Anlat:** Cevabını sıkıcı bir liste gibi değil, akıcı bir anlatı, bir keşif yolculuğu gibi sun.

      ### ÇIKTI FORMATI ###
      Cevabını, doğrudan Markdown formatında, aşağıdaki yapıya birebir uyarak ver. Başka hiçbir giriş veya sonuç cümlesi ekleme.

      ## Son ${days} Günlük Zihin Haritası
      
      ### Ana Gözlem
      Bu dönemdeki en belirgin tema veya duygusal yolculuk hakkında 1-2 cümlelik vurucu bir özet.

      ### Zaman Çizelgesindeki Kilit Anlar
      - **[Tarih]:** [Olayın Adı - Örn: Kovalanma Rüyası]
        - **Ne Oldu?:** Olayın kısa bir özeti.
        - **Etkisi:** Bu olayın, takip eden saatler veya günler içindeki duygusal veya davranışsal yansıması. "Bu rüyadan 18 saat sonra, günlüğünüze yansıyan bir 'belirsizlik' hissi var."
      
      - **[Tarih]:** [İkinci Kilit Olay]
        - **Ne Oldu?:** ...
        - **Etkisi:** ...

      ### Derinlemesine İçgörü: Gizli Bir Desen
      Yukarıdaki kilit anları birleştirerek ortaya çıkardığın, kullanıcının muhtemelen farkında olmadığı bir davranış kalıbı veya neden-sonuç zinciri hakkında derinlemesine bir analiz.

      ### İleriye Dönük Pusula
      Bu analize dayanarak, kullanıcının dikkat etmesi veya üzerinde düşünmesi gereken bir konu hakkında, tek bir cümlelik, nazik ve yol gösterici bir tavsiye.
    `.trim();
    }
}
