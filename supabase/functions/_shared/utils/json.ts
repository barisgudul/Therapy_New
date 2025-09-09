// supabase/functions/_shared/utils/json.ts

/**
 * Safely parses JSON from a raw string, extracting the first valid JSON block.
 * This is useful when AI responses might contain extra text before/after the JSON.
 *
 * @param raw - The raw string that may contain JSON
 * @returns The parsed JSON object or null if parsing fails
 */
export function safeParseJsonBlock<T = unknown>(raw: string): T | null {
  try {
    // Try to match the last complete JSON object first (most common case)
    const lastJsonMatch = raw.match(/\{[\s\S]*\}\s*$/m);
    if (lastJsonMatch) {
      return JSON.parse(lastJsonMatch[0]) as T;
    }

    // Fallback: try to match the first complete JSON object
    const firstJsonMatch = raw.match(/\{[\s\S]*?\}/m);
    if (firstJsonMatch) {
      return JSON.parse(firstJsonMatch[0]) as T;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Safely parses JSON with a fallback default value
 *
 * @param raw - The raw string that may contain JSON
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed JSON object or the default value
 */
export function safeParseJsonWithDefault<T>(
  raw: string,
  defaultValue: T,
): T {
  return safeParseJsonBlock<T>(raw) ?? defaultValue;
}
