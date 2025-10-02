// supabase/functions/_shared/contexts/session.data.service.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface UserDossier {
  nickname: string | null;
  dnaSummary: string | null;
  recentMood: string | null;
  recentTopics: string[];
  lastInteractionType: string | null;
  lastInteractionTime: string | null;
}

export interface WarmStartContext {
  originalNote: string;
  aiReflection: string;
  theme: string;
  source: string;
}

export interface RecentActivity {
  event_type: string;
  content: string;
  mood: string | null;
  event_time: string;
  themes: string[];
}

// Get user's recent activities from cognitive_memories
export async function getUserRecentActivities(
  supabaseClient: SupabaseClient,
  userId: string,
  limit: number = 10,
): Promise<RecentActivity[]> {
  try {
    const { data, error } = await supabaseClient
      .from("cognitive_memories")
      .select("event_type, content, mood, event_time, sentiment_data")
      .eq("user_id", userId)
      .order("event_time", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((item) => ({
      event_type: item.event_type || "unknown",
      content: item.content || "",
      mood: item.mood ||
        (item.sentiment_data as { dominant_emotion?: string })
          ?.dominant_emotion ||
        null,
      event_time: item.event_time,
      themes: extractThemes(item.content || ""),
    }));
  } catch (error) {
    console.warn(
      `[RecentActivities] Error fetching recent activities: ${error}`,
    );
    return [];
  }
}

// Extract themes from content using simple keyword detection
function extractThemes(content: string): string[] {
  const themePatterns = {
    "iş/kariyer":
      /(^|\s)(iş|İş|proje|müdür|patron|ofis|toplantı|maaş|kariyer|meslek)(\s|$)/gi,
    "ilişkiler":
      /\b(sevgili|sevgilimle|eş|anne|baba|arkadaş|dost|aile|ailemle|çocuk|kardeş)\b/gi,
    "sağlık":
      /\b(hasta|doktor|ağrı|tedavi|ilaç|hastane|sağlık|yorgun|uykusuz)\b/gi,
    "duygular":
      /\b(mutlu|üzgün|kaygı|kaygılı|stres|stresli|korku|öfke|kızgın|huzur|sakin)\b/gi,
    "gelecek": /\b(yarın|gelecek|plan|hedef|umut|hayal|istek|arzu)\b/gi,
    "geçmiş": /\b(eskiden|geçmiş|hatıra|anı|özle|pişman|keşke)\b/gi,
  };

  const themes: string[] = [];
  for (const [theme, pattern] of Object.entries(themePatterns)) {
    if (pattern.test(content)) {
      themes.push(theme);
    }
  }
  return themes;
}

// Enhanced user dossier with recent activity insights
export async function prepareEnhancedUserDossier(
  supabaseClient: SupabaseClient,
  userId: string,
  recentActivities: RecentActivity[],
): Promise<UserDossier> {
  try {
    const { data, error } = await supabaseClient
      .from("user_vaults")
      .select("vault_data")
      .eq("user_id", userId)
      .single();

    if (error || !data || !data.vault_data) {
      return createDefaultDossier(recentActivities);
    }

    const vault = data.vault_data as {
      profile?: { nickname?: string };
      dna_summary?: string;
      metadata?: { lastInteractionType?: string };
    };

    // Get recent topics from activities
    const recentTopics = [
      ...new Set(
        recentActivities.slice(0, 5).flatMap((a) => a.themes),
      ),
    ].slice(0, 3);

    // Get most recent mood
    const recentMood = recentActivities.find((a) => a.mood)?.mood || null;

    // Get last interaction info
    const lastActivity = recentActivities[0];

    return {
      nickname: vault.profile?.nickname || null,
      dnaSummary: vault.dna_summary || null,
      recentMood,
      recentTopics,
      lastInteractionType: lastActivity?.event_type || null,
      lastInteractionTime: lastActivity
        ? getTimeAgo(new Date(lastActivity.event_time))
        : null,
    };
  } catch (error) {
    console.warn(`[Dossier] User dossier could not be prepared: ${error}`);
    return createDefaultDossier(recentActivities);
  }
}

// Create default dossier from activities when vault is not available
function createDefaultDossier(activities: RecentActivity[]): UserDossier {
  const recentTopics = [
    ...new Set(
      activities.slice(0, 5).flatMap((a) => a.themes),
    ),
  ].slice(0, 3);

  const recentMood = activities.find((a) => a.mood)?.mood || null;
  const lastActivity = activities[0];

  return {
    nickname: null,
    dnaSummary: null,
    recentMood,
    recentTopics,
    lastInteractionType: lastActivity?.event_type || null,
    lastInteractionTime: lastActivity
      ? getTimeAgo(new Date(lastActivity.event_time))
      : null,
  };
}

// Convert date to human-readable time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} gün önce`;
  if (diffHours > 0) return `${diffHours} saat önce`;
  return "Az önce";
}

export async function prepareWarmStartContext(
  supabaseClient: SupabaseClient,
  userId: string,
  pendingSessionId: string,
): Promise<WarmStartContext | null> {
  try {
    const { data: pendingData, error: fetchError } = await supabaseClient
      .from("pending_text_sessions")
      .delete()
      .match({ id: pendingSessionId, user_id: userId })
      .select("context_data")
      .single();

    if (fetchError || !pendingData) return null;
    return pendingData.context_data as WarmStartContext;
  } catch (error) {
    console.warn(
      `[WarmStart] Temporary memory could not be retrieved: ${error}`,
    );
    return null;
  }
}
