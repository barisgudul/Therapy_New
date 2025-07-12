// hooks/useThemeColor.ts
import { Colors } from '../constants/Colors';
// BURASI EN KRİTİK KISIM: .ts veya .web.ts UZANTISI OLMADAN, KÖK ADIYLA ÇAĞIR.
// Expo, platforma göre doğru dosyayı kendisi seçecektir.
import { useColorScheme } from './useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}