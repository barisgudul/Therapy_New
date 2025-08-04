// constants/Colors.ts
const tintColorLight = '#3E6B89'; // Soft mavi
const tintColorDark = '#7FB3D5';  // Hafif parlak mavi (dark tema için)

export const Colors = {
  light: {
    text: '#2C2C2C',
    softText: '#6B7280',
    background: '#F6F8FA',
    card: '#FFFFFF',
    tint: tintColorLight,
    accent: '#D9E6F2',
    icon: '#3E6B89',
    tabIconDefault: '#B0BEC5',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    softText: '#A0A0A0',
    background: '#121212',
    card: '#1E1E1E',
    tint: tintColorDark,
    accent: '#2C3E50',
    icon: '#7FB3D5',
    tabIconDefault: '#555',
    tabIconSelected: tintColorDark,
  },
};


export const COSMIC_COLORS = {
  background: ['#0d1117', '#1A2947'],
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  textPrimary: '#EFEFEF',
  textSecondary: '#A9B4C8',
  accent: '#5DA1D9',
  inputBg: 'rgba(0,0,0,0.2)',
} as const;