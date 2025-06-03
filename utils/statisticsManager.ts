import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

interface Statistics {
  totalEntries: number;
  entriesByDay: { [key: string]: number };
  entriesByMonth: { [key: string]: number };
  averageEntryLength: number;
  mostActiveDay: string;
  mostActiveMonth: string;
  totalWords: number;
  moodDistribution: { [key: string]: number };
}

const STATS_KEY = 'user_statistics';
const PROCESSED_MOOD_KEY = 'mood-stats-processed';

async function getProcessedMoodDates(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(PROCESSED_MOOD_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

async function addProcessedMoodDate(date: string) {
  const set = await getProcessedMoodDates();
  set.add(date);
  await AsyncStorage.setItem(PROCESSED_MOOD_KEY, JSON.stringify(Array.from(set)));
}

export const statisticsManager = {
  async updateStatistics(entry: { text: string; mood?: string; date?: string; source?: string }): Promise<Statistics> {
    try {
      // Sadece daily_write'tan gelenler istatistikleri artırsın
      if (entry.source && entry.source !== 'daily_write') {
        // AI analiz veya batch işlemlerinde istatistikleri değiştirme
        const storedStats = await AsyncStorage.getItem(STATS_KEY);
        return storedStats ? JSON.parse(storedStats) : {
          totalEntries: 0,
          entriesByDay: {},
          entriesByMonth: {},
          averageEntryLength: 0,
          mostActiveDay: '',
          mostActiveMonth: '',
          totalWords: 0,
          moodDistribution: {},
        };
      }

      const storedStats = await AsyncStorage.getItem(STATS_KEY);
      let stats: Statistics = storedStats ? JSON.parse(storedStats) : {
        totalEntries: 0,
        entriesByDay: {},
        entriesByMonth: {},
        averageEntryLength: 0,
        mostActiveDay: '',
        mostActiveMonth: '',
        totalWords: 0,
        moodDistribution: {},
      };

      // Use provided date or today
      const entryDate = entry.date || moment().format('YYYY-MM-DD');
      const month = entry.date ? moment(entry.date).format('YYYY-MM') : moment().format('YYYY-MM');
      const wordCount = entry.text.trim().split(/\s+/).length;

      // --- DEDUPLICATION: Only process if not already processed ---
      const processed = await getProcessedMoodDates();
      if (processed.has(entryDate)) {
        return stats; // Already processed, skip
      }

      // Güncellemeler
      stats.totalEntries += 1;
      stats.totalWords += wordCount;
      stats.entriesByDay[entryDate] = (stats.entriesByDay[entryDate] || 0) + 1;
      stats.entriesByMonth[month] = (stats.entriesByMonth[month] || 0) + 1;
      stats.averageEntryLength = stats.totalWords / stats.totalEntries;
      stats.mostActiveDay = Object.entries(stats.entriesByDay)
        .sort((a, b) => b[1] - a[1])[0][0];
      stats.mostActiveMonth = Object.entries(stats.entriesByMonth)
        .sort((a, b) => b[1] - a[1])[0][0];
      if (entry.mood) {
        stats.moodDistribution[entry.mood] = (stats.moodDistribution[entry.mood] || 0) + 1;
      }

      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
      await addProcessedMoodDate(entryDate);
      return stats;
    } catch (error) {
      console.error('İstatistikler güncellenirken hata:', error);
      throw error;
    }
  },

  async getStatistics(): Promise<Statistics> {
    try {
      const storedStats = await AsyncStorage.getItem(STATS_KEY);
      return storedStats ? JSON.parse(storedStats) : {
        totalEntries: 0,
        entriesByDay: {},
        entriesByMonth: {},
        averageEntryLength: 0,
        mostActiveDay: '',
        mostActiveMonth: '',
        totalWords: 0,
        moodDistribution: {},
      };
    } catch (error) {
      console.error('İstatistikler alınırken hata:', error);
      throw error;
    }
  },

  async getWeeklyStats(): Promise<{ date: string; count: number }[]> {
    try {
      const stats = await this.getStatistics();
      const lastWeek = moment().subtract(7, 'days');
      
      return Array.from({ length: 7 }, (_, i) => {
        const date = moment(lastWeek).add(i, 'days').format('YYYY-MM-DD');
        return {
          date,
          count: stats.entriesByDay[date] || 0,
        };
      });
    } catch (error) {
      console.error('Haftalık istatistikler alınırken hata:', error);
      throw error;
    }
  },

  async getMonthlyStats(): Promise<{ month: string; count: number }[]> {
    try {
      const stats = await this.getStatistics();
      const last6Months = moment().subtract(6, 'months');
      
      return Array.from({ length: 6 }, (_, i) => {
        const month = moment(last6Months).add(i, 'months').format('YYYY-MM');
        return {
          month,
          count: stats.entriesByMonth[month] || 0,
        };
      });
    } catch (error) {
      console.error('Aylık istatistikler alınırken hata:', error);
      throw error;
    }
  },

  async getWeeklyMoodTrend(): Promise<{ date: string; moodCounts: { [mood: string]: number } }[]> {
    try {
      const stats = await this.getStatistics();
      const lastWeek = moment().subtract(7, 'days');
      return Array.from({ length: 7 }, (_, i) => {
        const date = moment(lastWeek).add(i, 'days').format('YYYY-MM-DD');
        // Mood dağılımı günlük olarak tutulmuyorsa, moodDistribution genel olur
        // Gelişmiş için: entriesByDay'den mood'ları ayrı kaydetmek gerekir
        // Şimdilik sadece toplam mood dağılımı döndürülür
        return {
          date,
          moodCounts: stats.moodDistribution // Geliştirilebilir: günlük mood kaydı tutulursa burası değişir
        };
      });
    } catch (error) {
      console.error('Haftalık mood trend alınırken hata:', error);
      throw error;
    }
  },

  async getMonthlyMoodTrend(): Promise<{ month: string; moodCounts: { [mood: string]: number } }[]> {
    try {
      const stats = await this.getStatistics();
      const last6Months = moment().subtract(6, 'months');
      return Array.from({ length: 6 }, (_, i) => {
        const month = moment(last6Months).add(i, 'months').format('YYYY-MM');
        return {
          month,
          moodCounts: stats.moodDistribution // Geliştirilebilir: aylık mood kaydı tutulursa burası değişir
        };
      });
    } catch (error) {
      console.error('Aylık mood trend alınırken hata:', error);
      throw error;
    }
  },

  async getMostActiveHour(): Promise<number | null> {
    try {
      // Gelişmiş kullanım için: entry'lere saat bilgisi de kaydedilmeli
      // Şu anki yapıda saat bilgisi yoksa null döner
      // Eğer entry'lerde saat tutuluyorsa burada analiz yapılabilir
      return null;
    } catch (error) {
      console.error('En aktif saat alınırken hata:', error);
      throw error;
    }
  },

  async getMoodDistribution(): Promise<{ [mood: string]: number }> {
    try {
      const stats = await this.getStatistics();
      return stats.moodDistribution;
    } catch (error) {
      console.error('Mood dağılımı alınırken hata:', error);
      throw error;
    }
  },

  async resetProcessedMoodDates() {
    await AsyncStorage.removeItem(PROCESSED_MOOD_KEY);
  },
};