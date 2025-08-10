// app/utils/color.utils.ts

// Renk koyuluk kontrolü için yardımcı fonksiyon
export function isColorDark(hexColor: string): boolean {
  const color = hexColor.charAt(0) === "#"
    ? hexColor.substring(1, 7)
    : hexColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 186;
}

// Hex rengi RGB formatına çeviren yardımcı fonksiyon
export function hexToRgb(hex: string): string {
  // GERÇEK DÜZELTME
  if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex)) {
    let c: string[] | string;
    c = hex.trim().substring(1).split(""); // Temizlenmiş halini kullan
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255].join(",");
  }
  // Varsayılan bir renk döndür, eğer hex geçersizse
  return "99, 102, 241";
}

// İki hex renk arasında yumuşak bir geçiş sağlayan interpolasyon fonksiyonu
export function interpolateColor(
  color1: string,
  color2: string,
  factor: number,
): string {
  const hex = (c: number) => c.toString(16).padStart(2, "0");
  const c1 = parseInt(color1.substring(1), 16);
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  const c2 = parseInt(color2.substring(1), 16);
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
