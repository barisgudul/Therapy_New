// supabase/functions/_shared/cors.ts
const ALLOWED = (Deno.env.get("CORS_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED.includes(origin) ? origin : (ALLOWED[0] ?? origin);
  return {
    "Access-Control-Allow-Origin": allow || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-correlation-id, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Eski importları kırmamak için:
export const corsHeaders = cors(new Request("http://local"));
