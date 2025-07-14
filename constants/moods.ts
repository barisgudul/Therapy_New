// constants/moods.ts

export type MoodLevel = { label: string; color: string; shadow: string };

export const MOOD_LEVELS: MoodLevel[] = [
    { label: 'Çok Kötü', color: '#0D1B2A', shadow: '#02040F' },
    { label: 'Kötü',     color: '#1B263B', shadow: '#0D1B2A' },
    { label: 'Üzgün',    color: '#415A77', shadow: '#1B263B' },
    { label: 'Nötr',     color: '#778DA9', shadow: '#415A77' },
    { label: 'İyi',      color: '#3B82F6', shadow: '#778DA9' },
    { label: 'Harika',   color: '#60A5FA', shadow: '#3B82F6' },
    { label: 'Mükemmel', color: '#06B6D4', shadow: '#60A5FA' },
]; 