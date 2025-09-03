// supabase/functions/_shared/utils/event-helpers.ts
// Evrensel içerik çıkarıcı: event.data yapısından işlenebilir metni üretir

function getStringField(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const val = obj[key];
  return typeof val === "string" ? val : null;
}

export function extractContentFromEvent(
  event: { type: string; data: Record<string, unknown> | null },
): string | null {
  const data = event.data;
  if (!data) return null;

  switch (event.type) {
    case "dream_analysis": {
      // Doğrudan data objesinden 'dreamText' alanını oku.
      return getStringField(data, "dreamText");
    }
    case "daily_reflection": {
      return getStringField(data, "todayNote");
    }
    case "diary_entry":
    case "text_session":
    case "voice_session": {
      const messages = (data as Record<string, unknown>)["messages"];
      if (Array.isArray(messages)) {
        const parts: string[] = [];
        for (const item of messages as unknown[]) {
          if (item && typeof item === "object") {
            const rec = item as Record<string, unknown>;
            const isUser = rec["isUser"] === true || rec["sender"] === "user";
            const text = typeof rec["text"] === "string"
              ? String(rec["text"])
              : null;
            if (isUser && text && text.length > 0) parts.push(text);
          }
        }
        return parts.length > 0 ? parts.join("\n\n") : null;
      }
      return null;
    }
    default: {
      return (
        getStringField(data, "text") ||
        getStringField(data, "content") ||
        getStringField(data, "userMessage") ||
        getStringField(data, "initialEntry") ||
        getStringField(data, "todayNote") ||
        getStringField(data, "dreamText")
      );
    }
  }
}
