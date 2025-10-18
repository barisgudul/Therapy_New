// supabase/functions/_shared/contexts/session.context.builder.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as RagService from "../services/rag.service.ts";
import * as AiService from "../services/ai.service.ts";
import {
  getUserRecentActivities,
  prepareEnhancedUserDossier,
  prepareWarmStartContext,
  RecentActivity,
  UserDossier,
  WarmStartContext,
} from "./session.data.service.ts";
import {
  buildActivityContext,
  smartFilterMemories,
} from "./session.logic.service.ts";

export interface TextSessionContext {
  userDossier: UserDossier;
  retrievedMemories: { content: unknown; similarity?: number }[];
  warmStartContext: WarmStartContext | null;
  ragForPrompt: string;
  recentActivities: RecentActivity[];
  activityContext: string;
}

// Main function to build text session context
export async function buildTextSessionContext(
  dependencies: {
    supabaseClient: SupabaseClient;
    ragService: typeof RagService;
  },
  userId: string,
  userMessage: string,
  pendingSessionId?: string | null,
): Promise<TextSessionContext> {
  // Warm start context if available
  const warmStartContext = pendingSessionId
    ? await prepareWarmStartContext(
      dependencies.supabaseClient,
      userId,
      pendingSessionId,
    )
    : null;

  // Get recent activities to understand user's current state
  const recentActivities = await getUserRecentActivities(
    dependencies.supabaseClient,
    userId,
    15,
  );

  // Extract recent topics for better context matching
  const recentTopics = [...new Set(recentActivities.flatMap((a) => a.themes))];

  // Get user dossier with enhanced recent activity info
  const userDossier = await prepareEnhancedUserDossier(
    dependencies.supabaseClient,
    userId,
    recentActivities,
  );

  // Retrieve memories with better context
  const searchQuery = warmStartContext
    ? `${warmStartContext.originalNote} ${userMessage}`.slice(0, 200)
    : userMessage;

  const retrievedMemories = warmStartContext
    ? [] // Skip RAG for warm start
    : await dependencies.ragService.retrieveContext(
      {
        supabaseClient: dependencies.supabaseClient,
        aiService: AiService,
      },
      userId,
      searchQuery,
      {
        threshold: 0.65, // Lower threshold for more results
        count: 8, // Get more candidates for filtering
      },
    );

  // Smart filter memories based on relevance
  const filteredMemories = warmStartContext
    ? []
    : smartFilterMemories(retrievedMemories, userMessage, recentTopics);

  // Build activity context
  const activityContext = buildActivityContext(recentActivities);

  // Format RAG results for prompt - Enhanced fallback strategy
  let ragForPrompt: string;
  const filteredMemoriesContent = filteredMemories.length > 0
    ? filteredMemories
      .slice(0, 4)
      .map((m, i) => `[${i + 1}] ${String(m.content).slice(0, 150)}`)
      .join("\n")
    : null;

  if (filteredMemoriesContent) {
    // Primary: Use filtered memories
    ragForPrompt = filteredMemoriesContent;
  } else if (activityContext) {
    // Fallback: Use enriched activity context when RAG fails
    // This provides more dynamic context than just a static summary
    ragForPrompt = `📋 Kullanıcının son aktiviteleri:\n${activityContext}`;
  } else {
    // Last resort: No context available
    ragForPrompt = "Henüz kayıtlı bağlam yok";
  }

  return {
    userDossier,
    retrievedMemories: filteredMemories,
    warmStartContext,
    ragForPrompt,
    recentActivities,
    activityContext,
  };
}
