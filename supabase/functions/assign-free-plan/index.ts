// supabase/functions/assign-free-plan/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS için gerekli başlıklar
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonksiyonun ana mantığı
serve(async (req: Request) => {
  // OPTIONS isteği (pre-flight) için CORS başlıklarını döndür
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Sunucu tarafı Supabase istemcisini oluştur (SERVICE_ROLE_KEY ile)
    // Bu, RLS politikalarını atlayarak işlem yapmamızı sağlar.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // İstek başlığından kullanıcının kimlik doğrulama token'ını al
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    // 1. Kullanıcının mevcut bir aboneliği var mı diye kontrol et
    const { data: existingSubscription, error: selectError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (selectError) throw selectError;

    // Eğer zaten bir aboneliği varsa, işlemi bitir.
    if (existingSubscription) {
      return new Response(JSON.stringify({ message: 'User already has a subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. "Free" planının ID'sini al
    const { data: freePlan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Free')
      .single();

    if (planError) throw planError;
    if (!freePlan) throw new Error('Free plan not found');

    // 3. Kullanıcıya yeni "Free" aboneliğini ata
    const { error: insertError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: freePlan.id,
        status: 'active',
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 gün sonrası
        auto_renew: false,
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: 'Free plan assigned successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 