// supabase/functions/execute-scheduled-deletions/handler.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const USER_DATA_TABLES = [
  "cognitive_memories",
  "events",
  "profiles",
  "user_vaults",
  "user_traits",
  "ai_decision_log",
  "ai_logs",
  "ai_simulations",
  "analysis_reports",
  "app_logs",
  "journey_logs",
  "payment_history",
  "pending_text_sessions",
  "predicted_outcomes",
  "rag_invocation_logs",
  "simulations",
  "system_logs",
  "usage_stats",
  "user_reports",
  "user_subscriptions",
  "ai_interactions",
];

const handler = async (req: Request): Promise<Response> => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
      return new Response("Unauthorized", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const GRACE_PERIOD_DAYS = 7;
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - GRACE_PERIOD_DAYS);

    const { data: usersToDelete, error: listError } = await supabaseAdmin.auth
      .admin.listUsers();
    if (listError) throw listError;

    const scheduledForDeletion = usersToDelete.users.filter((user) =>
      user.user_metadata?.status === "pending_deletion" &&
      new Date(user.user_metadata?.deletion_scheduled_at) <= cutOffDate
    );

    if (scheduledForDeletion.length === 0) {
      console.log("Silinmesi planlanan kullanıcı bulunamadı.");
      return new Response(
        JSON.stringify({ message: "İşlem tamam, silinecek kullanıcı yok." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    console.log(
      `${scheduledForDeletion.length} kullanıcının verileri silinecek...`,
    );

    for (const user of scheduledForDeletion) {
      console.log(`Kullanıcı ${user.id} için silme işlemi başlıyor...`);
      const deletionPromises = USER_DATA_TABLES.map((tableName) => {
        const column = tableName === "profiles" ? "id" : "user_id";
        return supabaseAdmin.from(tableName).delete().eq(column, user.id);
      });
      await Promise.all(deletionPromises);

      await supabaseAdmin.auth.admin.deleteUser(user.id);
      console.log(`Kullanıcı ${user.id} başarıyla silindi.`);
    }

    return new Response(
      JSON.stringify({
        message: `${scheduledForDeletion.length} kullanıcı başarıyla silindi.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Zamanlanmış silme hatası:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
};

export default handler;
