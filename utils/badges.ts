import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Badge {
  id: string;
  name: string;
  description: string;
  howTo: string;
  icon: string;
  category: 'daily' | 'session' | 'ai' | 'profile' | 'streak';
  unlocked: boolean;
  unlockedAt?: string;
  requirements: {
    type: 'count' | 'streak' | 'profile' | 'ai' | 'session_type' | 'duration' | 'weekly';
    value: number | string;
  };
}

// Sadeleştirilmiş rozetler
export const defaultBadges: Badge[] = [
  // Günlük Yazma Rozetleri
  {
    id: 'first_diary',
    name: 'İlk Günlük',
    description: 'İlk günlüğünü yazdın',
    howTo: 'Uygulamada ilk defa günlük yazıp kaydet.',
    icon: 'book-open-variant',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 1 }
  },
  {
    id: 'diary_5',
    name: '5 Günlük',
    description: '5 günlük yazdın',
    howTo: 'Toplamda 5 farklı gün günlük yaz.',
    icon: 'book-multiple',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 5 }
  },
  {
    id: 'diary_10',
    name: '10 Günlük',
    description: '10 günlük yazdın',
    howTo: 'Toplamda 10 farklı gün günlük yaz.',
    icon: 'book-multiple',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 10 }
  },
  {
    id: 'diary_25',
    name: '25 Günlük',
    description: '25 günlük yazdın',
    howTo: 'Toplamda 25 farklı gün günlük yaz.',
    icon: 'book-account',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 25 }
  },
  {
    id: 'diary_50',
    name: '50 Günlük',
    description: '50 günlük yazdın',
    howTo: 'Toplamda 50 farklı gün günlük yaz.',
    icon: 'book-check-outline',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 50 }
  },
  {
    id: 'diary_100',
    name: '100 Günlük',
    description: '100 günlük yazdın',
    howTo: 'Toplamda 100 farklı gün günlük yaz.',
    icon: 'book-check-outline',
    category: 'daily',
    unlocked: false,
    requirements: { type: 'count', value: 100 }
  },

  // Arka Arkaya Günlük (Streak) Rozetleri
  {
    id: 'streak_3',
    name: '3 Günlük Seri',
    description: '3 gün arka arkaya günlük yazdın',
    howTo: '3 gün boyunca hiç ara vermeden günlük yaz.',
    icon: 'fire',
    category: 'streak',
    unlocked: false,
    requirements: { type: 'streak', value: 3 }
  },
  {
    id: 'streak_7',
    name: '7 Günlük Seri',
    description: '7 gün arka arkaya günlük yazdın',
    howTo: '7 gün boyunca hiç ara vermeden günlük yaz.',
    icon: 'fire',
    category: 'streak',
    unlocked: false,
    requirements: { type: 'streak', value: 7 }
  },
  {
    id: 'streak_14',
    name: '14 Günlük Seri',
    description: '14 gün arka arkaya günlük yazdın',
    howTo: '14 gün boyunca hiç ara vermeden günlük yaz.',
    icon: 'fire',
    category: 'streak',
    unlocked: false,
    requirements: { type: 'streak', value: 14 }
  },
  {
    id: 'streak_30',
    name: '30 Günlük Seri',
    description: '30 gün arka arkaya günlük yazdın',
    howTo: '30 gün boyunca hiç ara vermeden günlük yaz.',
    icon: 'fire',
    category: 'streak',
    unlocked: false,
    requirements: { type: 'streak', value: 30 }
  },
  {
    id: 'streak_60',
    name: '60 Günlük Seri',
    description: '60 gün arka arkaya günlük yazdın',
    howTo: '60 gün boyunca hiç ara vermeden günlük yaz.',
    icon: 'fire',
    category: 'streak',
    unlocked: false,
    requirements: { type: 'streak', value: 60 }
  },

  // AI Özeti Rozetleri
  {
    id: 'first_ai',
    name: 'İlk AI Özeti',
    description: 'İlk AI özetini aldın',
    howTo: 'AI ile ilk ruh hali özetini oluştur.',
    icon: 'robot',
    category: 'ai',
    unlocked: false,
    requirements: { type: 'ai', value: 1 }
  },
  {
    id: 'ai_5',
    name: '5 AI Özeti',
    description: '5 AI özeti aldın',
    howTo: 'Toplamda 5 farklı AI özeti oluştur.',
    icon: 'robot-happy',
    category: 'ai',
    unlocked: false,
    requirements: { type: 'ai', value: 5 }
  },
  {
    id: 'ai_10',
    name: '10 AI Özeti',
    description: '10 AI özeti aldın',
    howTo: 'Toplamda 10 farklı AI özeti oluştur.',
    icon: 'robot-happy',
    category: 'ai',
    unlocked: false,
    requirements: { type: 'ai', value: 10 }
  },
  {
    id: 'ai_25',
    name: '25 AI Özeti',
    description: '25 AI özeti aldın',
    howTo: 'Toplamda 25 farklı AI özeti oluştur.',
    icon: 'robot-happy',
    category: 'ai',
    unlocked: false,
    requirements: { type: 'ai', value: 25 }
  },
  {
    id: 'ai_50',
    name: '50 AI Özeti',
    description: '50 AI özeti aldın',
    howTo: 'Toplamda 50 farklı AI özeti oluştur.',
    icon: 'robot-happy',
    category: 'ai',
    unlocked: false,
    requirements: { type: 'ai', value: 50 }
  },

  // Profil Rozetleri
  {
    id: 'profile_photo',
    name: 'Profil Fotoğrafı',
    description: 'Profil fotoğrafı ekledin',
    howTo: 'Profiline bir fotoğraf yükle.',
    icon: 'account',
    category: 'profile',
    unlocked: false,
    requirements: { type: 'profile', value: 1 }
  },
  {
    id: 'complete_profile',
    name: 'Tam Profil',
    description: 'Profilini tamamladın',
    howTo: 'Profilindeki tüm alanları doldur.',
    icon: 'account-check',
    category: 'profile',
    unlocked: false,
    requirements: { type: 'profile', value: 1 }
  },
  {
    id: 'profile_goal',
    name: 'Hedef Belirleyici',
    description: 'Terapi hedefi ekledin',
    howTo: 'Profiline terapi hedefi ekle.',
    icon: 'flag-checkered',
    category: 'profile',
    unlocked: false,
    requirements: { type: 'profile', value: 1 }
  },

  // Seans Rozetleri
  {
    id: 'first_session',
    name: 'İlk Seans',
    description: 'İlk terapi seansını tamamladın',
    howTo: 'Uygulamada ilk defa bir terapi seansı başlat.',
    icon: 'message-text',
    category: 'session',
    unlocked: false,
    requirements: { type: 'count', value: 1 }
  },
  {
    id: 'session_10',
    name: '10 Seans',
    description: '10 terapi seansı tamamladın',
    howTo: 'Toplamda 10 terapi seansı tamamla.',
    icon: 'chat',
    category: 'session',
    unlocked: false,
    requirements: { type: 'count', value: 10 }
  },
  {
    id: 'session_25',
    name: '25 Seans',
    description: '25 terapi seansı tamamladın',
    howTo: 'Toplamda 25 terapi seansı tamamla.',
    icon: 'trophy-outline',
    category: 'session',
    unlocked: false,
    requirements: { type: 'count', value: 25 }
  },
  {
    id: 'session_50',
    name: '50 Seans',
    description: '50 terapi seansı tamamladın',
    howTo: 'Toplamda 50 terapi seansı tamamla.',
    icon: 'trophy',
    category: 'session',
    unlocked: false,
    requirements: { type: 'count', value: 50 }
  },
  {
    id: 'session_types',
    name: 'Çeşitli Seanslar',
    description: 'Farklı seans tiplerini denedin',
    howTo: 'Yazılı, sesli ve görüntülü seansların her birinden en az bir kez yap.',
    icon: 'star-check-outline',
    category: 'session',
    unlocked: false,
    requirements: { type: 'session_type', value: 'all' }
  },
  {
    id: 'long_session',
    name: 'Uzun Seans',
    description: '45 dakikadan uzun bir seans yaptın',
    howTo: 'Tek bir seansı 45 dakikadan uzun sürdür.',
    icon: 'timer-outline',
    category: 'session',
    unlocked: false,
    requirements: { type: 'duration', value: 45 }
  },
  {
    id: 'weekly_sessions',
    name: 'Haftalık Düzen',
    description: '4 hafta üst üste her hafta en az 1 seans yaptın',
    howTo: '4 hafta boyunca her hafta en az bir seans tamamla.',
    icon: 'calendar-outline',
    category: 'session',
    unlocked: false,
    requirements: { type: 'weekly', value: 4 }
  },
  {
    id: 'monday_session',
    name: 'Seans Günü',
    description: 'Pazartesi günü seans yaptın',
    howTo: 'Herhangi bir Pazartesi günü bir seans başlat.',
    icon: 'calendar-outline',
    category: 'session',
    unlocked: false,
    requirements: { type: 'session_type', value: 'monday' }
  }
];

export interface BadgeUpdateData {
  // Günlük rozetleri
  totalEntries?: number;

  // Seans rozetleri
  textSessions?: number;
  voiceSessions?: number;
  videoSessions?: number;
  totalSessions?: number;
  
  // Özel durumlar için
  diverseSessionCompleted?: boolean;
  aiDiaryCompleted?: number;
  dailyWriterNovice?: boolean;
  dailyWriterExpert?: boolean;

  // Seri rozetleri
  streak?: number;
  longestStreak?: number;

  // Profil rozetleri
  profileComplete?: boolean;
  hasPhoto?: boolean;
  hasBio?: boolean;
  hasGoals?: boolean;
  customizedProfile?: boolean;

  // AI rozetleri
  aiSummaries?: number;
  diaryAnalysis?: number;
  aiInsights?: boolean;
}

export async function checkAndUpdateBadges(type: string, data: BadgeUpdateData): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('user_badges');
    const badges = stored ? JSON.parse(stored) : defaultBadges;
    let updated = false;

    for (const badge of badges) {
      if (badge.unlocked || !badge.requirements) continue;

      let shouldUnlock = false;

      switch (badge.requirements.type) {
        case 'count':
          if (type === 'daily' && badge.category === 'daily') {
            if (badge.id === 'daily_writer_novice') {
              shouldUnlock = data.dailyWriterNovice || false;
            } else if (badge.id === 'daily_writer_expert') {
              shouldUnlock = data.dailyWriterExpert || false;
            } else {
            shouldUnlock = (data.totalEntries || 0) >= badge.requirements.value;
            }
          } else if (type === 'session' && badge.category === 'session') {
            switch (badge.id) {
              case 'first_session':
                shouldUnlock = (data.totalSessions || 0) >= badge.requirements.value;
                break;
              case 'text_expert':
                shouldUnlock = (data.textSessions || 0) >= badge.requirements.value;
                break;
              case 'voice_expert':
                shouldUnlock = (data.voiceSessions || 0) >= badge.requirements.value;
                break;
              case 'video_expert':
                shouldUnlock = (data.videoSessions || 0) >= badge.requirements.value;
                break;
              case 'session_master':
                shouldUnlock = (data.totalSessions || 0) >= badge.requirements.value;
                break;
              case 'therapy_dedication':
                shouldUnlock = (data.totalSessions || 0) >= badge.requirements.value;
                break;
              case 'therapy_master':
                shouldUnlock = (data.totalSessions || 0) >= badge.requirements.value;
                break;
              case 'diverse_therapy':
                shouldUnlock = data.diverseSessionCompleted || false;
                break;
              case 'session_consistency_1m':
              case 'session_consistency_3m':
              case 'session_consistency_6m':
              case 'session_anniversary':
                // Bu rozetler özel kontrol gerektirir - Şimdilik varsayılan kontroller kullanılır
                shouldUnlock = (data.totalSessions || 0) >= badge.requirements.value;
                break;
            }
          } else if ((type === 'diary' || type === 'ai') && badge.category === 'diary') {
            if (badge.id === 'ai_diary_starter') {
              shouldUnlock = (data.aiDiaryCompleted || 0) >= badge.requirements.value;
            } else if (badge.id === 'diary_analyzer') {
              shouldUnlock = (data.diaryAnalysis || 0) >= badge.requirements.value;
            } else if (badge.id === 'first_ai' || badge.id === 'ai_supporter' || badge.id === 'ai_master') {
              shouldUnlock = (data.aiSummaries || 0) >= badge.requirements.value;
            } else if (badge.id.startsWith('diary_consistency_')) {
              // Düzenlilik rozetleri toplam giriş sayısına göre kontrol edilir
              shouldUnlock = (data.totalEntries || 0) >= badge.requirements.value;
            }
          } else if (type === 'ai' && badge.category === 'ai') {
            if (badge.id === 'first_ai' || badge.id === 'ai_supporter' || badge.id === 'ai_master') {
              shouldUnlock = (data.aiSummaries || 0) >= badge.requirements.value;
            } else if (badge.id === 'ai_insights') {
              shouldUnlock = data.aiInsights || false;
            }
          }
          break;

        case 'streak':
          if (type === 'streak' && badge.category === 'streak' && data.streak) {
            shouldUnlock = data.streak >= badge.requirements.value;
          }
          break;

        case 'profile':
          if (type === 'profile' && badge.category === 'profile') {
            if (badge.id === 'profile_photo') {
              shouldUnlock = data.hasPhoto || false;
            } else if (badge.id === 'complete_profile') {
              shouldUnlock = data.profileComplete || false;
            } else if (badge.id === 'profile_storyteller') {
              shouldUnlock = data.hasBio || false;
            } else if (badge.id === 'profile_goals') {
              shouldUnlock = data.hasGoals || false;
            } else if (badge.id === 'profile_customizer') {
              shouldUnlock = data.customizedProfile || false;
            }
          }
          break;

        case 'ai':
          if (type === 'ai' && badge.category === 'ai') {
            if (badge.id === 'first_ai' || badge.id === 'ai_supporter' || badge.id === 'ai_master') {
              shouldUnlock = (data.aiSummaries || 0) >= badge.requirements.value;
            } else if (badge.id === 'ai_insights') {
              shouldUnlock = data.aiInsights || false;
            }
          }
          break;
      }

      if (shouldUnlock) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      await AsyncStorage.setItem('user_badges', JSON.stringify(badges));
    }
  } catch (error) {
    console.error('Rozetler güncellenirken hata:', error);
  }
} 