// supabase/functions/create-analysis-report/index.ts
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// BURASI ÇOK ÖNEMLİ: O karmaşık beyin servislerini BURADA import edeceksin.
// Frontend'in bu dosyalardan haberi bile olmayacak.
import { getEventsForLastDays } from "../_shared/event.service.ts";
import { generateElegantReport } from "../_shared/ai.service.ts";
import { getUserVault } from "../_shared/vault.service.ts"; // Bunu import et

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

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError) throw new Error(`Yetkilendirme hatası: ${userError.message}`);
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    console.log(`[Report-API] ${user.id} için analiz isteği alındı.`);

    // 2. DOĞRULAMA: Gelen paketin içini kontrol et.
    const body = await req.json();
    const validation = RequestBodySchema.safeParse(body);
    if (!validation.success) {
      // Eğer 'days' sayısı yanlışsa veya yoksa, kapıdan geri çevir.
      throw new Error(`Geçersiz istek: ${validation.error.message}`);
    }
    const { days } = validation.data;
    console.log(`[Report-API] Analiz süresi: ${days} gün.`);

    // 3. HAZIRLIK: Beyni çalıştırmadan önce gerekli malzemeleri topla.
    // Artık sadece olayları çekip AI'a gönderiyoruz.

    // 4. BEYNİ ÇALIŞTIR!
    console.log(`[Report-API] Gelişmiş beyin çalıştırılıyor...`);
    
    // --- CASUS 1: VERİ ÇEKİLİYOR MU? ---
    const events = await getEventsForLastDays(days, user.id, supabaseAdmin);
    const vault = await getUserVault(user.id, supabaseAdmin);

    // Tahminler: dönem içindeki predicted_outcomes kayıtları
    const sinceIso = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
    const { data: predictionsData, error: predictionsError } = await supabaseAdmin
      .from('predicted_outcomes')
      .select('id, prediction_type, title, description, probability_score, generated_at, expires_at')
      .eq('user_id', user.id)
      .gte('generated_at', sinceIso)
      .order('generated_at', { ascending: true });
    if (predictionsError) {
      console.warn('[Report-API] Tahminler çekilirken uyarı:', predictionsError.message);
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
    
    console.log(`[Report-API] Veritabanından ${events.length} olay, ${predictions.length} tahmin ve kullanıcı kasası çekildi.`);
    
    // EĞER HİÇ OLAY YOKSA, KONSOLA BİR ÖRNEK BASALIM Kİ GÖRELİM
    if (events.length > 0) {
        console.log('[Report-API] Çekilen ilk olayın örneği:', JSON.stringify(events[0], null, 2));
    }
    // --- CASUS 1 BİTTİ ---

    // ŞİMDİ O VERİYLE GERÇEK RAPORU OLUŞTUR (JSON paket)
    const reportPayload = await generateElegantReport(events, vault || {}, days, predictions);

    console.log(`[Report-API] AI'dan dönen paket:`, JSON.stringify(reportPayload).substring(0, 200) + '...');

    // Veritabanına kaydet
    console.log(`[Report-API] AI'dan dönen paket alındı. Veritabanına kaydediliyor...`);
    const { error: insertError } = await supabaseAdmin
      .from('analysis_reports')
      .insert({
        user_id: user.id,
        content: reportPayload, // Tüm JSON'ı kaydet
        days_analyzed: days,
      });

    if (insertError) {
      console.error("[Report-API] Veritabanı kaydetme hatası:", insertError.message);
      throw new Error(`Rapor üretildi ancak kaydedilemedi: ${insertError.message}`);
    }

    console.log(`[Report-API] Rapor ${user.id} için başarıyla veritabanına kaydedildi.`);

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