// supabase/functions/embed-memory/index.ts (YENİ VE SAĞLAM VERSİYON)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_EMBEDDING_MODEL = "embedding-001";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const { content, user_id, metadata = {} } = await req.json();
    if (!content || !user_id) throw new Error('content and user_id are required');

    // --- MANUEL API ÇAĞRISI ---
    // LangChain'i tamamen devreden çıkardık.
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

    const apiResponse = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: content }] }
      }),
    });
    
    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        throw new Error(`Google API error: ${apiResponse.status} ${apiResponse.statusText} - ${JSON.stringify(errorBody)}`);
    }

    const responseJson = await apiResponse.json();
    const embeddingVector = responseJson.embedding?.values;
    if (!embeddingVector) throw new Error("Google API response did not contain an embedding vector.");
    // --- MANUEL API ÇAĞRISI BİTTİ ---

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error } = await supabaseAdmin.from('memory_embeddings').insert({
      user_id, content, embedding: embeddingVector, metadata
    });
    if (error) throw error;

    return new Response(JSON.stringify({ message: "Embedding successful (Manual)" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});