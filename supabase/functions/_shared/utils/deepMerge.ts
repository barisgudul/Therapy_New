// supabase/functions/_shared/utils/deepMerge.ts
export function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(base) || Array.isArray(patch)) return (patch as T) ?? base;
  if (typeof base !== "object" || base === null) return (patch as T) ?? base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch ?? {})) {
    out[k] = k in out ? deepMerge(out[k] as T, v as Partial<T>) : v;
  }
  return out as T;
}
