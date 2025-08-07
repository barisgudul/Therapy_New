// supabase/functions/trait-extractor/index.ts (FINAL & PERFECTED VERSION)

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
// 🔥 DÜZELTME 1: SupabaseClient tipini import ediyoruz. 'any' kullanmayacağız.
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Hata mesajlarını güvenli bir şekilde almak için yardımcı fonksiyon
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Tiplerimiz ve şemalarımız (Bunlar zaten iyiydi)
const traitKeys = [
  "confidence",
  "anxiety_level",
  "motivation",
  "openness",
  "neuroticism",
] as const;
type TraitKey = typeof traitKeys[number];
type Traits = Partial<Record<TraitKey, number>>;
const TraitsSchema = z.object({
  confidence: z.number().min(0).max(1),
  anxiety_level: z.number().min(0).max(1),
  motivation: z.number().min(0).max(1),
  openness: z.number().min(0).max(1),
  neuroticism: z.number().min(0).max(1),
});

// AI Çağrı ve Doğrulama Yardımcıları
async function invokeAndValidateTraits(
  apiKey: string,
  prompt: string,
): Promise<Traits | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const validation = TraitsSchema.safeParse(JSON.parse(match[0]));
    return validation.success ? validation.data : null;
  } catch (error: unknown) { // 🔥 DÜZELTME 2: 'error' artık 'unknown' tipinde.
    console.error("invokeAndValidateTraits hatası:", getErrorMessage(error));
    return null;
  }
}

// 🔥 DÜZELTME 3: Gelen parametrelerin tiplerini belirtiyoruz. Gevşekliğe son.
interface SimpleEvent {
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}
interface UserToProcess {
  user_id: string;
}

// Ana İş Mantığı
async function processUser(
  adminClient: SupabaseClient,
  userId: string,
  geminiApiKey: string,
) {
  console.log(`[TRAITS] Kullanıcı için analiz başlıyor: ${userId}`);

  const { data: events, error } = await adminClient.from("events").select(
    "type,data,created_at",
  ).eq("user_id", userId).limit(50);
  if (error || !events) {
    return console.error(`[TRAITS] ${userId} için olaylar çekilemedi.`);
  }

  const eventText = (events as SimpleEvent[]).map((e) =>
    `Tip:${e.type}, Detay:${JSON.stringify(e.data)?.substring(0, 150)}`
  ).join(" | ");
  const prompt =
    `Kullanıcı verileri: ${eventText}. Bu verilere dayanarak şu kişilik özelliklerini JSON formatında 0-1 arası analiz et: ${
      traitKeys.join(", ")
    }.`;

  const parsedTraits = await invokeAndValidateTraits(geminiApiKey, prompt);
  if (!parsedTraits) {
    return console.error(
      `[TRAITS] ${userId} için analiz sonucu doğrulanamadı.`,
    );
  }

  for (const key in parsedTraits) {
    const traitKey = key as TraitKey;
    const value = parsedTraits[traitKey];
    const { error: rpcError } = await adminClient.rpc(
      "update_user_trait_with_ema",
      { p_user_id: userId, p_trait_key: traitKey, p_new_value: value },
    );
    if (rpcError) {
      console.error(
        `[DB] RPC Hatası - ${traitKey}:`,
        getErrorMessage(rpcError),
      );
    }
  }
  console.log(`[TRAITS] ${userId} için analiz tamamlandı.`);
}

// Edge Function Ana Giriş Noktası
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey!,
    );
    const BATCH_SIZE = 50;
    let offset = 0;
    let usersProcessed = 0;

    while (true) {
      const { data: users, error: userError } = await adminClient.rpc(
        "get_users_for_trait_analysis",
        {
          limit_count: BATCH_SIZE,
          offset_count: offset,
        },
      );
      if (userError) throw userError;
      if (!users || users.length === 0) break;

      const results = await Promise.allSettled(
        (users as UserToProcess[]).map((user) =>
          processUser(
            adminClient,
            user.user_id,
            Deno.env.get("GEMINI_API_KEY")!,
          )
        ),
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[TRAITS] Kullanıcı işlenirken hata oluştu: ${
              (users as UserToProcess[])[index].user_id
            }`,
            result.reason,
          );
        }
      });

      usersProcessed += users.length;
      offset += BATCH_SIZE;
    }

    return new Response(
      JSON.stringify({
        message: `${usersProcessed} kullanıcı için Trait analizi tamamlandı.`,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: unknown) { // 🔥 DÜZELTME 4: 'error' artık 'unknown' tipinde.
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
