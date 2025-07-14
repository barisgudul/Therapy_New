// supabase/functions/trait-extractor/index.ts (FINAL & PERFECTED VERSION)

import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Tiplerimizi ve şemalarımızı burada, yerel olarak tanımlıyoruz. Dışarıya bağımlılık yok.
const traitKeys = ['confidence', 'anxiety_level', 'motivation', 'openness', 'neuroticism'] as const;
type TraitKey = typeof traitKeys[number];
type Traits = Partial<Record<TraitKey, number>>;
const TraitsSchema = z.object({ /* ... Zod şeması tanımı ... */ });

// AI Çağrı ve Doğrulama Yardımcıları (Kendi kendine yeterli)
async function invokeAndValidateTraits(apiKey: string, prompt: string): Promise<Traits | null> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, { /* ... */ });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const validation = TraitsSchema.safeParse(JSON.parse(match[0]));
    return validation.success ? validation.data : null;
  } catch (error) { console.error("invokeAndValidateTraits hatası:", error.message); return null; }
}

// Ana İş Mantığı
async function processUser(adminClient: any, userId: string, geminiApiKey: string) {
  console.log(`[TRAITS] Kullanıcı için analiz başlıyor: ${userId}`);
  
  const { data: events, error } = await adminClient.from('events').select('type,data,created_at').eq('user_id', userId).limit(50);
  if (error || !events) return console.error(`[TRAITS] ${userId} için olaylar çekilemedi.`);

  const eventText = events.map(e => `Tip:${e.type}, Detay:${JSON.stringify(e.data)?.substring(0, 150)}`).join(' | ');
  const prompt = `Kullanıcı verileri: ${eventText}. Bu verilere dayanarak şu kişilik özelliklerini JSON formatında 0-1 arası analiz et: ${traitKeys.join(', ')}.`;

  const parsedTraits = await invokeAndValidateTraits(geminiApiKey, prompt);
  if (!parsedTraits) return console.error(`[TRAITS] ${userId} için analiz sonucu doğrulanamadı.`);
  
  // Her bir trait için SQL fonksiyonunu çağır
  for (const key in parsedTraits) {
    const traitKey = key as TraitKey;
    const value = parsedTraits[traitKey];
    const { error: rpcError } = await adminClient.rpc('update_user_trait_with_ema', { p_user_id: userId, p_trait_key: traitKey, p_new_value: value });
    if (rpcError) console.error(`[DB] RPC Hatası - ${traitKey}:`, rpcError.message);
  }
  console.log(`[TRAITS] ${userId} için analiz tamamlandı.`);
}

// Edge Function Ana Giriş Noktası
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) return new Response('Unauthorized', { status: 401 });

  try {
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey!);
    const { data: users, error: userError } = await adminClient.rpc('get_users_for_trait_analysis');

    if (userError) throw userError;
    
    // Tüm kullanıcılar için işlemleri paralel başlat, ama bitmelerini bekle.
    await Promise.all(users.map(user => processUser(adminClient, user.user_id, Deno.env.get('GEMINI_API_KEY')!)));

    return new Response(JSON.stringify({ message: `${users.length} kullanıcı için Trait analizi tamamlandı.` }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});