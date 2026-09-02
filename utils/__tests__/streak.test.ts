// utils/__tests__/streak.test.ts
import {
  computeNextStreak,
  getEffectiveStreak,
  isMilestone,
  STREAK_MILESTONES,
  toDateKey,
} from "../streak";

describe("computeNextStreak", () => {
  it("kayıt yoksa 1 döner", () => {
    expect(computeNextStreak(null, "2026-06-17", 0)).toBe(1);
    expect(computeNextStreak(undefined, "2026-06-17", 5)).toBe(1);
  });

  it("dün yapılmışsa seriyi artırır", () => {
    expect(computeNextStreak("2026-06-16", "2026-06-17", 4)).toBe(5);
  });

  it("bugün zaten yapılmışsa seriyi korur (en az 1)", () => {
    expect(computeNextStreak("2026-06-17", "2026-06-17", 4)).toBe(4);
    expect(computeNextStreak("2026-06-17", "2026-06-17", 0)).toBe(1);
  });

  it("bir günden fazla boşluk varsa seriyi sıfırlar (1)", () => {
    expect(computeNextStreak("2026-06-14", "2026-06-17", 9)).toBe(1);
  });

  it("geçersiz mevcut seriyi güvenle ele alır", () => {
    expect(computeNextStreak("2026-06-16", "2026-06-17", NaN)).toBe(1);
    expect(computeNextStreak("2026-06-16", "2026-06-17", -3)).toBe(1);
  });
});

describe("getEffectiveStreak", () => {
  it("bugün yapılmışsa seriyi gösterir", () => {
    expect(getEffectiveStreak("2026-06-17", "2026-06-17", 7)).toBe(7);
  });

  it("dün yapılmışsa seri hâlâ canlıdır", () => {
    expect(getEffectiveStreak("2026-06-16", "2026-06-17", 7)).toBe(7);
  });

  it("iki+ gün boşlukta seri kopar (0)", () => {
    expect(getEffectiveStreak("2026-06-15", "2026-06-17", 7)).toBe(0);
  });

  it("kayıt/seri yoksa 0 döner", () => {
    expect(getEffectiveStreak(null, "2026-06-17", 0)).toBe(0);
    expect(getEffectiveStreak("2026-06-17", "2026-06-17", 0)).toBe(0);
  });
});

describe("isMilestone", () => {
  it("eşik değerlerinde true döner", () => {
    STREAK_MILESTONES.forEach((m) => expect(isMilestone(m)).toBe(true));
  });
  it("eşik dışında false döner", () => {
    expect(isMilestone(1)).toBe(false);
    expect(isMilestone(8)).toBe(false);
  });
});

describe("toDateKey", () => {
  it("YYYY-MM-DD formatı verir", () => {
    expect(toDateKey(new Date("2026-06-17T15:30:00Z"))).toBe("2026-06-17");
  });
});
