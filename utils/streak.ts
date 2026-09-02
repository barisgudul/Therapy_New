// utils/streak.ts
//
// Günlük yansıma "serisi" (streak) için SAF, test edilebilir mantık.
// Vault yalnızca son yansıma tarihini + güncel seri sayısını tutar; geçmiş tutmaz.
// Seri artımlı olarak hesaplanır ve vault.metadata içinde saklanır.

const MS_PER_DAY = 86_400_000;

/** Bir Date'i YYYY-MM-DD anahtarına çevirir (UTC). */
export function toDateKey(d: Date = new Date()): string {
  return d.toISOString().split("T")[0];
}

/** İki gün-anahtarı (YYYY-MM-DD) arasındaki tam gün farkı (b - a). */
function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(`${aKey}T00:00:00Z`).getTime();
  const b = new Date(`${bKey}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Bugün bir yansıma tamamlandığında yeni seri değeri.
 * - Kayıt yoksa: 1
 * - Bugün zaten yapılmışsa: mevcut seri (en az 1)
 * - Dün yapılmışsa: seri + 1
 * - Daha eski (boşluk): 1 (yeniden başlar)
 */
export function computeNextStreak(
  lastDateKey: string | null | undefined,
  todayKey: string,
  currentStreak: number,
): number {
  const safeStreak = Number.isFinite(currentStreak) && currentStreak > 0
    ? Math.floor(currentStreak)
    : 0;
  if (!lastDateKey) return 1;
  const diff = daysBetween(lastDateKey, todayKey);
  if (diff <= 0) return Math.max(safeStreak, 1);
  if (diff === 1) return safeStreak + 1;
  return 1;
}

/**
 * Ekranda gösterilecek GÜNCEL seri. Kullanıcı bir günden fazla ara verdiyse
 * seri kopmuştur ve 0 döner (bugün veya dün yapılmışsa korunur).
 */
export function getEffectiveStreak(
  lastDateKey: string | null | undefined,
  todayKey: string,
  storedStreak: number,
): number {
  const safeStreak = Number.isFinite(storedStreak) && storedStreak > 0
    ? Math.floor(storedStreak)
    : 0;
  if (!lastDateKey || safeStreak <= 0) return 0;
  const diff = daysBetween(lastDateKey, todayKey);
  return diff <= 1 ? safeStreak : 0;
}

/** Kutlama eşikleri. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365] as const;

export function isMilestone(streak: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(streak);
}
