// supabase/functions/create-analysis-report/index.ts
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// BURASI ÇOK ÖNEMLİ: O karmaşık beyin servislerini BURADA import edeceksin.
// Frontend'in bu dosyalardan haberi bile olmayacak.
import { generateElegantReport } from "../_shared/ai.service.ts";
import { getUserVault } from "../_shared/vault.service.ts"; // Bunu import et
import { logRagInvocation } from "../_shared/utils/logging.service.ts";

// Gelen isteğin body'sinin neye benzemesi gerektiğini tanımlıyoruz.
// Frontend bize sadece 'days' adında bir sayı gönderecek. Başka bir şey gönderirse suratına kapatacağız.
const RequestBodySchema = z.object({
  days: z.number().int().min(1).max(365), // 1 ile 365 gün arası olmalı
});

// Hataları düzgün bir şekilde yakalamak için.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Bilinmeyen bir sunucu hatası oluştu.";
}

// Adaptif RAG parametre hesaplayıcı
function getAdaptiveRetrievalParams(
  days: number,
): { threshold: number; count: number } {
  if (days <= 7) {
    return { threshold: 0.45, count: 40 };
  } else if (days <= 15) {
    return { threshold: 0.5, count: 30 };
  } else {
    return { threshold: 0.55, count: 25 };
  }
}

Deno.serve(async (req) => {
  // Tarayıcıların ağlamaması için standart CORS ayarı.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. GÜVENLİK: Kapıdaki koruma. Gelenin kim olduğunu kontrol et.
    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");

    // Admin client, RLS'i falan dinlemez, ne dersek onu yapar.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth
      .getUser(jwt);
    if (userError) {
      throw new Error(`Yetkilendirme hatası: ${userError.message}`);
    }
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    // 2. DOĞRULAMA: Gelen paketin içini kontrol et.
    const body = await req.json();
    const validation = RequestBodySchema.safeParse(body);
    if (!validation.success) {
      // Eğer 'days' sayısı yanlışsa veya yoksa, kapıdan geri çevir.
      throw new Error(`Geçersiz istek: ${validation.error.message}`);
    }
    const { days } = validation.data;
    // ADAPTİF PARAMETRELERİ HESAPLA
    const retrievalParams = getAdaptiveRetrievalParams(days);

    // 3. HAZIRLIK: Beyni çalıştırmadan önce gerekli malzemeleri topla.
    // Artık sadece olayları çekip AI'a gönderiyoruz.

    // 4. BEYNİ ÇALIŞTIR!

    // --- CASUS 1: VERİ ÇEKİLİYOR MU? ---
    const vault = await getUserVault(user.id, supabaseAdmin);
    if (!vault) {
      // Eğer vault yoksa, henüz analiz için yeterli değil demektir.
      // Bu normalde olmaz ama bir güvenlik önlemi.
      throw new Error(
        "Kullanıcı profili (vault) bulunamadı. Analiz için yeterli veri yok.",
      );
    }

    // 2. EN ALAKALI ANILARI ÇEK (GERÇEK RAG)
    // Önce arama sorgusu oluştur ve embed et
    const therapyGoals = vault.profile?.therapyGoals ||
      "kişisel gelişim ve duygusal denge";
    let search_query: string;
    if (days <= 10) {
      search_query =
        `Kullanıcının son ${days} gün içindeki en belirgin olayları, günlük aktiviteleri, anlık duygu değişimleri ve karşılaştığı somut zorluklar. Odak noktası, 'bu hafta ne oldu?' sorusudur.`;
    } else {
      search_query =
        `Kullanıcının ana hedefi: ${therapyGoals}. Son ${days} gün boyunca bu hedefe giden yolda tekrar eden duygusal desenler, davranış kalıpları, ana temalar ve bu temaların nasıl evrildiği. Odak noktası, 'bu ayın büyük resmi ne?' sorusudur.`;
    }

    const { data: embedData, error: embedError } = await supabaseAdmin.functions
      .invoke("api-gateway", {
        body: { type: "gemini-embed", payload: { content: search_query } },
      });
    if (embedError || !embedData?.embedding) {
      throw new Error("Arama sorgusu için embedding oluşturulamadı.");
    }
    const query_embedding = embedData.embedding as number[];

    // Benzerlik tabanlı hafıza eşleştirme (RPC)
    const startDateIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString();
    const { data: memories, error: memoriesError } = await supabaseAdmin.rpc(
      "match_memories",
      {
        query_embedding,
        match_threshold: retrievalParams.threshold, // DİNAMİK EŞİK
        match_count: retrievalParams.count, // DİNAMİK SAYI
        p_user_id: user.id,
        start_date: startDateIso,
      },
    );

    if (memoriesError) throw memoriesError;
    // --- MİKROSKOP BURADA ---
    // Bu fonksiyonun transactionId'si olmadığı için şimdilik boş bırakıyoruz.
    await logRagInvocation(supabaseAdmin, {
      user_id: user.id,
      source_function: "ai_summary",
      search_query: search_query,
      retrieved_memories: memories || [],
    });
    // --- KANIT KAYDEDİLDİ ---

    // Tahminler: dönem içindeki predicted_outcomes kayıtları
    const sinceIso = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      .toISOString();
    const { data: predictionsData, error: predictionsError } =
      await supabaseAdmin
        .from("predicted_outcomes")
        .select(
          "id, prediction_type, title, description, probability_score, generated_at, expires_at",
        )
        .eq("user_id", user.id)
        .gte("generated_at", sinceIso)
        .order("generated_at", { ascending: true });
    if (predictionsError) {
      console.warn(
        "[Report-API] Tahminler çekilirken uyarı:",
        predictionsError.message,
      );
    }
    const predictions = (predictionsData || []).map((p) => ({
      id: p.id,
      prediction_type: p.prediction_type,
      title: p.title,
      description: p.description,
      probability_score: p.probability_score,
      generated_at: p.generated_at,
      expires_at: p.expires_at,
    }));

    // --- CASUS 1 BİTTİ ---

    // ŞİMDİ O VERİYLE GERÇEK RAPORU OLUŞTUR (JSON paket)
    const reportPayload = await generateElegantReport(
      vault || {},
      memories || [],
      days,
      predictions,
    );

    const { error: insertError } = await supabaseAdmin
      .from("analysis_reports")
      .insert({
        user_id: user.id,
        content: reportPayload, // Tüm JSON'ı kaydet
        days_analyzed: days,
      });

    if (insertError) {
      console.error(
        "[Report-API] Veritabanı kaydetme hatası:",
        insertError.message,
      );
      throw new Error(
        `Rapor üretildi ancak kaydedilemedi: ${insertError.message}`,
      );
    }

    // 5. BAŞARILI SONUÇ: JSON veriyi gönder.
    return new Response(JSON.stringify(reportPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("[Report-API] KRİTİK HATA:", errorMessage);

    // HATA DURUMU: Bir şeyler patlarsa, frontend'e düzgün bir hata mesajı gönder.
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
