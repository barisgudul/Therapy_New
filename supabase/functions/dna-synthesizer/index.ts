// supabase/functions/dna-synthesizer/index.ts

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { getUserVault } from "../_shared/vault.service.ts";

// Zod şemamız. AI'dan tam olarak bu yapıda bir JSON bekleyeceğiz.
const DnaSchema = z.object({
  traits: z.object({
    confidence: z.number().min(0).max(1),
    anxiety_level: z.number().min(0).max(1),
    motivation: z.number().min(0).max(1),
    openness: z.number().min(0).max(1),
    neuroticism: z.number().min(0).max(1),
  }),
  dna_summary: z.string().min(20),
});

async function synthesizeDnaForUser(
  adminClient: SupabaseClient,
  userId: string,
) {
  try {
    console.log(
      `[DNA-Synth] Kullanıcı ${userId} için BİRLEŞİK analiz başlıyor...`,
    );

    // 1) Gerekli tüm verileri topla (Bu kısım zaten iyiydi)
    const vault = await getUserVault(userId, adminClient);
    const { data: memories } = await adminClient.from("cognitive_memories")
      .select("content, event_type").eq("user_id", userId).order("event_time", {
        ascending: false,
      }).limit(25);
    const formattedMemories = (memories || []).map((m) =>
      `[${m.event_type}] ${m.content.substring(0, 100)}...`
    ).join("\n");

    // 2) TEK, GÜÇLÜ PROMPT
    const prompt = `
    ### GÖREV: BÜTÜNSEL PSİKOLOJİK DNA ANALİZİ ###
    Aşağıdaki verilerden yola çıkarak, bu kişinin hem sayısal kişilik özelliklerini (traits) hem de insani bir dille yazılmış psikolojik özetini (dna_summary) içeren TEK BİR JSON objesi üret.

    ### VERİLER ###
    - Profil & Hedefler: ${JSON.stringify(vault?.profile || {})}
    - Temel İnançlar: ${JSON.stringify(vault?.coreBeliefs || {})}
    - Son Anılar:
    ${formattedMemories || "Anı yok."}

    ### İSTENEN JSON ÇIKTI YAPISI (KESİNLİKLE UYULMALIDIR) ###
    {
      "traits": {
        "confidence": <0-1 arası sayısal değer>,
        "anxiety_level": <0-1 arası sayısal değer>,
        "motivation": <0-1 arası sayısal değer>,
        "openness": <0-1 arası sayısal değer>,
        "neuroticism": <0-1 arası sayısal değer>
      },
      "dna_summary": "<2-3 cümlelik, bir roman karakteri analizi gibi yazılmış, jargon içermeyen psikolojik profil özeti.>"
    }
    `;

    // 3) TEK AI ÇAĞRISI
    const rawResponse = await invokeGemini(prompt, "gemini-1.5-pro", {
      responseMimeType: "application/json",
    });
    const validation = DnaSchema.safeParse(JSON.parse(rawResponse));
    if (!validation.success) {
      throw new Error(
        `AI'dan dönen DNA verisi geçersiz: ${validation.error.message}`,
      );
    }
    const { traits, dna_summary } = validation.data;

    // 4) VERİTABANINA ATOMİK YAZMA
    // Promise.allSettled ile iki işlemi de dene, biri patlarsa diğeri etkilenmesin.
    const traitsPromises = Object.entries(traits).map(([key, value]) =>
      adminClient.rpc("update_user_trait_with_ema", {
        p_user_id: userId,
        p_trait_key: key,
        p_new_value: value,
      })
    );

    const [traitsResults, vaultResult] = await Promise.allSettled([
      Promise.all(traitsPromises),
      adminClient.rpc("update_vault_field", {
        p_user_id: userId,
        p_field_key: "dna_summary",
        p_field_value: JSON.stringify(dna_summary),
      }),
    ]);

    // Hataları logla
    if (vaultResult.status === "rejected") {
      console.error(`[DNA-Synth] Vault güncellenemedi:`, vaultResult.reason);
    }
    if (traitsResults.status === "rejected") {
      console.error(`[DNA-Synth] Traits güncellenemedi:`, traitsResults.reason);
    }

    console.log(
      `✅ [DNA-Synth] Kullanıcı ${userId} için DNA sentezi tamamlandı.`,
    );
    return { status: "success", userId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [DNA-Synth] Kullanıcı ${userId} işlenirken hata oluştu:`,
      errorMessage,
    );
    return { status: "failed", userId, error: errorMessage };
  }
}

// Ana handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // CORS headers
    const headers = { ...corsHeaders, "Content-Type": "application/json" };

    // Admin client oluştur
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Request body'den userId'yi al
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId gerekli" }),
        { status: 400, headers },
      );
    }

    // DNA sentezini başlat
    const result = await synthesizeDnaForUser(adminClient, userId);

    if (result.status === "success") {
      return new Response(
        JSON.stringify({
          message: "DNA sentezi başarıyla tamamlandı",
          userId: result.userId,
        }),
        { status: 200, headers },
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "DNA sentezi başarısız",
          details: result.error,
        }),
        { status: 500, headers },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DNA-Synthesizer] Kritik hata:", errorMessage);
    return new Response(
      JSON.stringify({
        error: "Beklenmeyen hata oluştu",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
