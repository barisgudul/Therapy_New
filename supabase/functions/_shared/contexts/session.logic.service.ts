// supabase/functions/_shared/contexts/session.logic.service.ts

import { RecentActivity } from "./session.data.service.ts";

// Normalizes text for comparison
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFC") // Compose characters (I + ̇ -> İ)
    .replace(/['']/g, "'")
    .replace(/[""„«»‹›]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Extract themes from content using simple keyword detection
export function extractThemes(content: string): string[] {
  const normalizedContent = content.toLowerCase();
  const themePatterns = {
    "iş/kariyer":
      /(^|\s)(iş|proje|müdür|patron|ofis|toplantı|maaş|kariyer|meslek)(\s|$)/gi,
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
    if (pattern.test(normalizedContent)) {
      themes.push(theme);
    }
  }
  return themes;
}

// Build a richer context string from recent activities
export function buildActivityContext(activities: RecentActivity[]): string {
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
export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} gün önce`;
  if (diffHours > 0) return `${diffHours} saat önce`;
  return "Az önce";
}

// Smart RAG filtering based on relevance and recency
export function smartFilterMemories(
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
