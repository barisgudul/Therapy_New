// supabase/functions/user-dna-synthesizer/index.ts

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { getUserVault } from "../_shared/vault.service.ts";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Tek bir kullanıcı için damıtma işlemi
async function synthesizeDnaForUser(
  adminClient: SupabaseClient,
  userId: string,
) {
  try {
    console.log(
      `[DNA-Synth] Kullanıcı ${userId} için damıtma işlemi başlıyor...`,
    );

    // 1) Gerekli verileri topla
    const vault = await getUserVault(userId, adminClient);
    const traits = (vault?.traits as Record<string, unknown>) || {};

    const { data: memories, error: memoriesError } = await adminClient
      .from("cognitive_memories")
      .select("content, event_type")
      .eq("user_id", userId)
      .order("event_time", { ascending: false })
      .limit(25);
    if (memoriesError) throw memoriesError;

    const formattedMemories = (memories || [])
      .map((m: { content: unknown; event_type: unknown }) => {
        const content = typeof m.content === "string"
          ? m.content
          : String(m.content ?? "");
        const evtType = typeof m.event_type === "string"
          ? m.event_type
          : String(m.event_type ?? "");
        return `[${evtType}] ${content.substring(0, 100)}...`;
      })
      .join("\n");

    // 2) Prompt
    const prompt = `
    ### GÖREV: PSİKOLOJİK DNA ÖZETİ ÇIKAR ###
    Aşağıdaki verilerden yola çıkarak, bu kişinin kim olduğuna dair 2-3 cümlelik, yoğun ve insani bir psikolojik profil çıkar. Jargon kullanma. Bir roman karakteri analizi gibi yaz.

    ### VERİLER ###
    - **Kullanıcı Profili & Hedefleri:** ${JSON.stringify(vault?.profile || {})}
    - **Hesaplanmış Kişilik Özellikleri (0-1 arası):** ${JSON.stringify(traits)}
    - **Temel İnançları:** ${JSON.stringify(vault?.coreBeliefs || {})}
    - **Son Zamanlardaki Anılarından Kesitler:**
    ${formattedMemories || "Henüz belirgin bir anı yok."}

    ### ÇIKTI ###
    Sadece ve sadece o 2-3 cümlelik analizi yaz. Başka hiçbir şey ekleme.
    Örnek: "Bu kişi, dışarıdan özgüvenli görünse de 'yetersizlik' temel inancıyla mücadele eden bir idealist. Hayatındaki ana itici güç, babasıyla olan karmaşık ilişkisini çözme ve kendi değerini yaratıcı projeler üzerinden kanıtlama arzusu gibi görünüyor."
    `;

    // 3) AI çağrısı
    const dnaSummary = await invokeGemini(prompt, "gemini-1.5-pro", {
      temperature: 0.6,
    });
    if (!dnaSummary || dnaSummary.length < 20) {
      throw new Error("AI, geçerli bir DNA özeti üretemedi.");
    }

    // 4) Vault'a yaz
    const { error: updateError } = await adminClient.rpc("update_vault_field", {
      p_user_id: userId,
      p_field_key: "dna_summary",
      p_field_value: JSON.stringify(dnaSummary),
    });
    if (updateError) throw updateError;

    console.log(
      `✅ [DNA-Synth] Kullanıcı ${userId} için DNA özeti başarıyla oluşturuldu ve kaydedildi.`,
    );
    return { status: "success", userId } as const;
  } catch (error) {
    console.error(
      `❌ [DNA-Synth] Kullanıcı ${userId} işlenirken hata oluştu:`,
      getErrorMessage(error),
    );
    return { status: "failed", userId, error: getErrorMessage(error) } as const;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("--- BİLİNÇ DAMITMA OPERASYONU BAŞLADI ---");

    const { data: { users }, error: userError } = await adminClient.auth.admin
      .listUsers();
    if (userError) throw userError;

    const results = await Promise.allSettled(
      (users || []).map((user: { id: string }) =>
        synthesizeDnaForUser(adminClient, user.id)
      ),
    );

    const successCount = results.filter((r) =>
      r.status === "fulfilled" && r.value.status === "success"
    ).length;
    const failedCount = results.length - successCount;

    const summary =
      `--- OPERASYON TAMAMLANDI ---\n- ✅ Başarıyla Damıtılan: ${successCount}\n- ❌ Başarısız: ${failedCount}\n----------------------------`;
    console.log(summary);

    return new Response(
      JSON.stringify({ message: "Damıtma operasyonu tamamlandı.", summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("KRİTİK HATA:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
