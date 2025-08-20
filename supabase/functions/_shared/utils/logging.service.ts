// supabase/functions/_shared/utils/logging.service.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logRagInvocation(
  adminClient: SupabaseClient,
  details: {
    transaction_id?: string;
    user_id: string;
    source_function:
      | "diary_conclusion"
      | "dream_analysis"
      | "ai_summary"
      | "daily_reflection";
    search_query: string;
    retrieved_memories: unknown[];
  },
) {
  try {
    await adminClient.from("rag_invocation_logs").insert({
      transaction_id: details.transaction_id,
      user_id: details.user_id,
      source_function: details.source_function,
      search_query: details.search_query,
      retrieved_memories: details.retrieved_memories,
      retrieved_count: details.retrieved_memories.length,
    });
  } catch (error) {
    console.error(`[RAG-Logger] Kanıt kaydı başarısız oldu:`, error);
    // Bu kritik bir işlem değil, ana akışı durdurmamalı.
  }
}
