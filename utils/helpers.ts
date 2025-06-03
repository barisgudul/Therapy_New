import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionStats {
  totalSessions: number;
  textSessions: number;
  voiceSessions: number;
  videoSessions: number;
}

export interface HistoryItem {
  date: string;
  mood?: string;
  reflection?: string;
  activityType: string;
  sessionType?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
}

// Günlük yazma yardımcıları
export async function calculateStreak(): Promise<StreakData> {
  const keys = await AsyncStorage.getAllKeys();
  const moodKeys = keys.filter(k => k.startsWith('mood-'));
  
  if (moodKeys.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastEntryDate: null };
  }

  const moodHistory = await Promise.all(
    moodKeys.map(async key => {
      const mood = await AsyncStorage.getItem(key);
      const date = key.replace('mood-', '');
      let moodData = { mood: '', reflection: '', activityType: 'Günlük Yazıldı' };
      try {
        const parsed = JSON.parse(mood || '{}');
        moodData = {
          mood: parsed.mood || '',
          reflection: parsed.reflection || '',
          activityType: 'Günlük Yazıldı',
        };
      } catch {
        moodData = { mood: '', reflection: mood || '', activityType: 'Günlük Yazıldı' };
      }
      return { date, ...moodData };
    }),
  );

  // Tarihleri sırala (en yeniden en eskiye)
  moodHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastEntry = new Date(moodHistory[0].date);
  lastEntry.setHours(0, 0, 0, 0);

  // Bugün yazılmamışsa streak 0
  if (lastEntry.getTime() !== today.getTime()) {
    return { currentStreak: 0, longestStreak: 0, lastEntryDate: moodHistory[0].date };
  }

  let current = 1;
  let longest = 1;
  let cursor = new Date(lastEntry);

  // En uzun seriyi hesapla
  let tempStreak = 1;
  for (let i = 1; i < moodHistory.length; i++) {
    const d = new Date(moodHistory[i].date);
    d.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
      cursor = d;
    } else {
      tempStreak = 1;
      cursor = d;
    }
  }

  // Mevcut seriyi hesapla
  cursor = new Date(lastEntry);
  for (let i = 1; i < moodHistory.length; i++) {
    const d = new Date(moodHistory[i].date);
    d.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      current++;
      cursor = d;
    } else {
      break;
    }
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    lastEntryDate: moodHistory[0].date
  };
}

export async function getTotalEntries(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(k => k.startsWith('mood-')).length;
  } catch (error) {
    console.error('Toplam günlük sayısı alınırken hata:', error);
    return 0;
  }
}

// Seans yardımcıları
export async function getSessionStats(): Promise<SessionStats> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sessionKeys = keys.filter(k => k.startsWith('session-'));
    
    const stats: SessionStats = {
      totalSessions: 0,
      textSessions: 0,
      voiceSessions: 0,
      videoSessions: 0
    };

    for (const key of sessionKeys) {
      const session = await AsyncStorage.getItem(key);
      if (session) {
        const data = JSON.parse(session);
        if (data.sessions) {
          data.sessions.forEach((s: any) => {
            stats.totalSessions++;
            switch (s.type) {
              case 'text':
                stats.textSessions++;
                break;
              case 'voice':
                stats.voiceSessions++;
                break;
              case 'video':
                stats.videoSessions++;
                break;
            }
          });
        }
      }
    }

    return stats;
  } catch (error) {
    console.error('Seans istatistikleri alınırken hata:', error);
    return {
      totalSessions: 0,
      textSessions: 0,
      voiceSessions: 0,
      videoSessions: 0
    };
  }
}

// AI özet yardımcıları
export async function getTotalSummaries(): Promise<number> {
  try {
    const summaries = await AsyncStorage.getItem('ai-summaries');
    return summaries ? JSON.parse(summaries).length : 0;
  } catch (error) {
    console.error('Toplam özet sayısı alınırken hata:', error);
    return 0;
  }
}

// Profil yardımcıları
export async function getProfileData() {
  try {
    const profile = await AsyncStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : {};
  } catch (error) {
    console.error('Profil verileri alınırken hata:', error);
    return {};
  }
}

export function isProfileComplete(profile: any): boolean {
  return !!(
    profile.name &&
    profile.birthDate &&
    profile.gender &&
    profile.relationshipStatus &&
    profile.photo &&
    profile.bio
  );
} 