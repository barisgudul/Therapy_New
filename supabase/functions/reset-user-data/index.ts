import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!user) throw new Error('Geçersiz kullanıcı.');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id, { user_metadata: { ...user.user_metadata, status: 'pending_deletion', deletion_scheduled_at: new Date().toISOString() } }
    )
    if (error) throw error;
    return new Response(JSON.stringify({ message: 'Hesap silinme için sıraya alındı.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
  }
})