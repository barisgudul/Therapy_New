// supabase/functions/_shared/contexts/session.context.service.ts
import { supabase as adminClient } from "../supabase-admin.ts";
import * as RagService from "../rag.service.ts";

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

interface RecentActivity {
  event_type: string;
  content: string;
  mood: string | null;
  event_time: string;
  themes: string[];
}

// Normalizes text for comparison
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""„«»‹›]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Extract themes from content using simple keyword detection
function extractThemes(content: string): string[] {
  const themePatterns = {
    "iş/kariyer":
      /\b(iş|proje|müdür|patron|ofis|toplantı|maaş|kariyer|meslek)\b/gi,
    "ilişkiler": /\b(sevgili|eş|anne|baba|arkadaş|dost|aile|çocuk|kardeş)\b/gi,
    "sağlık":
      /\b(hasta|doktor|ağrı|tedavi|ilaç|hastane|sağlık|yorgun|uykusuz)\b/gi,
    "duygular": /\b(mutlu|üzgün|kaygı|stres|korku|öfke|kızgın|huzur|sakin)\b/gi,
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

// Get user's recent activities from cognitive_memories
async function getUserRecentActivities(
  userId: string,
  limit: number = 10,
): Promise<RecentActivity[]> {
  try {
    const { data, error } = await adminClient
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

// Build a richer context string from recent activities
function buildActivityContext(activities: RecentActivity[]): string {
  if (activities.length === 0) return "";

  const lines: string[] = [];

  // Group activities by type and extract patterns
  const byType: Record<string, RecentActivity[]> = {};
  for (const act of activities) {
    if (!byType[act.event_type]) byType[act.event_type] = [];
    byType[act.event_type].push(act);
  }

  // Find recurring themes
  const allThemes = activities.flatMap((a) => a.themes);
  const themeCounts: Record<string, number> = {};
  for (const theme of allThemes) {
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  }
  const dominantThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme);

  if (dominantThemes.length > 0) {
    lines.push(
      `Son zamanlarda çok bahsettiği konular: ${dominantThemes.join(", ")}`,
    );
  }

  // Recent mood pattern
  const recentMoods = activities
    .filter((a) => a.mood)
    .slice(0, 5)
    .map((a) => a.mood);
  if (recentMoods.length > 2) {
    const uniqueMoods = [...new Set(recentMoods)];
    lines.push(`Son ruh halleri: ${uniqueMoods.slice(0, 3).join(" → ")}`);
  }

  // Most recent meaningful interaction
  const lastMeaningful = activities.find((a) => a.content.length > 50);
  if (lastMeaningful) {
    const preview = lastMeaningful.content.slice(0, 100);
    const timeAgo = getTimeAgo(new Date(lastMeaningful.event_time));
    lines.push(`${timeAgo} şundan bahsetti: "${preview}..."`);
  }

  return lines.join("\n");
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

// Smart RAG filtering based on relevance and recency
function smartFilterMemories(
  memories: { content: unknown; similarity?: number }[],
  userMessage: string,
  recentTopics: string[],
): { content: unknown; similarity?: number }[] {
  const filtered = memories.filter((m) => {
    const content = String(m?.content ?? "");
    const sim = m?.similarity ?? 0;

    // High similarity always passes
    if (sim > 0.85) return true;

    // Check topic relevance
    const memoryThemes = extractThemes(content);
    const hasRelevantTopic = memoryThemes.some((t) => recentTopics.includes(t));
    if (hasRelevantTopic && sim > 0.7) return true;

    // Check lexical overlap for medium similarity
    const words = new Set(
      norm(userMessage).split(/\s+/).filter((w) => w.length > 3),
    );
    const memWords = new Set(
      norm(content).split(/\s+/).filter((w) => w.length > 3),
    );
    let overlap = 0;
    words.forEach((w) => {
      if (memWords.has(w)) overlap++;
    });

    return overlap >= 2 && sim > 0.65;
  });

  // If nothing passes, take top 2
  return filtered.length > 0 ? filtered : memories.slice(0, 2);
}

// Main function to build text session context
export async function buildTextSessionContext(
  userId: string,
  userMessage: string,
  pendingSessionId?: string | null,
) {
  // Warm start context if available
  const warmStartContext = pendingSessionId
    ? await prepareWarmStartContext(userId, pendingSessionId)
    : null;

  // Get recent activities to understand user's current state
  const recentActivities = await getUserRecentActivities(userId, 15);

  // Extract recent topics for better context matching
  const recentTopics = [...new Set(recentActivities.flatMap((a) => a.themes))];

  // Get user dossier with enhanced recent activity info
  const userDossier = await prepareEnhancedUserDossier(
    userId,
    recentActivities,
  );

  // Retrieve memories with better context
  const searchQuery = warmStartContext
    ? `${warmStartContext.originalNote} ${userMessage}`.slice(0, 200)
    : userMessage;

  const retrievedMemories = warmStartContext
    ? [] // Skip RAG for warm start
    : await RagService.retrieveContext(userId, searchQuery, {
      threshold: 0.65, // Lower threshold for more results
      count: 8, // Get more candidates for filtering
    });

  // Smart filter memories based on relevance
  const filteredMemories = warmStartContext
    ? []
    : smartFilterMemories(retrievedMemories, userMessage, recentTopics);

  // Build activity context
  const activityContext = buildActivityContext(recentActivities);

  // Format RAG results for prompt
  const ragForPrompt = filteredMemories.length > 0
    ? filteredMemories
      .slice(0, 4)
      .map((m, i) => `[${i + 1}] ${String(m.content).slice(0, 150)}`)
      .join("\n")
    : activityContext; // Use activity context if no RAG results

  return {
    userDossier,
    retrievedMemories: filteredMemories,
    warmStartContext,
    ragForPrompt,
    recentActivities,
    activityContext,
  };
}

// Enhanced user dossier with recent activity insights
async function prepareEnhancedUserDossier(
  userId: string,
  recentActivities: RecentActivity[],
): Promise<UserDossier> {
  try {
    const { data, error } = await adminClient
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

async function prepareWarmStartContext(
  userId: string,
  pendingSessionId: string,
): Promise<WarmStartContext | null> {
  try {
    const { data: pendingData, error: fetchError } = await adminClient
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
