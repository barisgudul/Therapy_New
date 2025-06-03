import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { Badge, checkAndUpdateBadges, defaultBadges } from '../utils/badges';
import { calculateStreak, getSessionStats, getTotalEntries, getTotalSummaries, isProfileComplete } from '../utils/helpers';

const { width } = Dimensions.get('window');

// Badge kartları için sabit boyutlar tanımlayalım
const BADGE_CARD_WIDTH = width * 0.42; // Ekran genişliğinin %42'si (daha önce %75'ti)
const BADGE_CARD_HEIGHT = 170;

// ---------- Types -------------------------------------------------------------
interface HistoryItem {
  date: string;
  mood?: string;
  reflection?: string;
  activityType: string;
  sessionType?: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
}

interface SessionStats {
  totalSessions: number;
  textSessions: number;
  voiceSessions: number;
  videoSessions: number;
}

interface StatBoxProps {
  label: string;
  value: number;
}

// Rozet kazanma koşulları açıklamaları
const badgeRequirements: Record<string, string> = {
  // Günlük Rozetleri
  'first_diary': 'İlk günlüğünü yaz ve kaydet',
  'regular_writer': 'En az 10 günlük giriş yap',
  'diary_master': 'En az 50 günlük giriş yap',
  'diary_expert': 'En az 100 günlük giriş yap',
  'diary_legend': 'Tam bir yıl boyunca 365 günlük giriş yap',
  'mood_tracker': 'En az 5 günlüğüne duygu durumu ekle',
  'reflection_master': 'En az 10 günlüğüne detaylı düşüncelerini ekle',
  'daily_writer_novice': 'En az 3 gün günlük yazmaya başla',
  'daily_writer_expert': 'En az 15 farklı günde günlük yaz',
  
  // Streak Rozetleri
  'streak_3': 'Üst üste 3 gün günlük yaz',
  'streak_7': 'Üst üste 7 gün günlük yaz',
  'streak_14': 'Üst üste 14 gün günlük yaz',
  'streak_21': 'Üst üste 21 gün günlük yaz',
  'streak_30': 'Üst üste 30 gün günlük yaz',
  'streak_60': 'Üst üste 60 gün günlük yaz',
  'streak_90': 'Üst üste 90 gün günlük yaz',
  'streak_180': 'Üst üste 180 gün günlük yaz',
  'streak_365': 'Üst üste 365 gün günlük yaz - Tam bir yıl!',
  'streak_recovery': 'Kaçırılan bir günden sonra günlük yazmaya devam et',
  'streak_weekend': 'En az 5 hafta sonu üst üste günlük yaz',
  'streak_consecutive_monday': '8 pazartesi üst üste günlük yaz',
  'streak_comeback': 'Bir aylık aradan sonra günlük yazmaya devam et',
  'streak_midnight': 'Gece yarısı (00:00-01:00) günlük yaz',
  
  // Seans Rozetleri
  'first_session': 'İlk terapi seansını tamamla',
  'text_expert': 'En az 10 yazılı terapi seansı tamamla',
  'voice_expert': 'En az 10 sesli terapi seansı tamamla',
  'video_expert': 'En az 10 görüntülü terapi seansı tamamla',
  'session_master': 'Toplam 25 terapi seansı tamamla',
  'diverse_therapy': 'Her tipte (yazılı, sesli, görüntülü) en az bir terapi seansı tamamla',
  'therapy_dedication': 'Toplam 50 terapi seansı tamamla',
  'therapy_master': 'Toplam 100 terapi seansı tamamla',
  'text_communicator': 'Bir yazılı seansta 300+ mesaj alışverişi yap',
  'session_consistency_1m': 'Bir ay boyunca haftada en az 1 seans yap (toplam 4 seans)',
  'session_consistency_3m': 'Üç ay boyunca düzenli seanslar yap (toplam 12 seans)',
  'session_consistency_6m': 'Altı ay boyunca düzenli seanslar yap (toplam 24 seans)',
  'session_anniversary': 'Bir yıl boyunca düzenli seanslar yap (toplam 48 seans)',
  
  // AI Rozetleri
  'first_ai': 'İlk AI özetini al',
  'ai_supporter': '5 AI özeti al',
  'ai_master': '25 AI özeti al',
  'ai_insights': '5 farklı duygu durumu için AI özeti al',
  'ai_prompt_master': 'Yapay zekaya 15+ farklı soru sor',
  'ai_data_analyzer': 'Yapay zeka ile 3 aylık veri analizini tamamla',
  'ai_creative_collaborator': 'Yapay zeka ile yaratıcı bir proje oluştur',
  'ai_diary_starter': 'İlk yapay zeka destekli günlük yazımını tamamla',
  'diary_analyzer': 'En az 5 günlüğünü yapay zeka ile analiz et',
  'diary_connoisseur': 'En az 1000 kelimelik bir günlük girişi yaz',
  'diary_consistency_1w': '7 gün boyunca günlük yaz',
  'diary_consistency_2w': '15 gün boyunca günlük yaz',
  'diary_consistency_1m': '30 gün boyunca günlük yaz',
  'diary_consistency_2m': '60 gün boyunca günlük yaz',
  'diary_consistency_3m': '90 gün boyunca günlük yaz',
  'diary_consistency_6m': '180 gün boyunca günlük yaz',
  'diary_yearly_review': '365 gün boyunca günlük yaz - Tam bir yıl!',
  'diary_structured': 'Şablonlu günlük kullan',
  'diary_gratitude': 'Minnet günlüğü tut',
  'diary_goals': 'Hedef günlüğü tut',
  'diary_mood_tracker': 'Duygu izleme günlüğü tut',
  
  // Profil Rozetleri
  'profile_starter': 'Profilinize temel bilgileri ekleyin',
  'profile_photo': 'Profilinize fotoğraf yükleyin',
  'profile_complete': 'Profilinizin tüm alanlarını doldurun',
  'profile_goals': 'Terapi hedeflerinizi belirleyin',
  'profile_customizer': 'Profilinizi kişiselleştirin (fotoğraf, takma ad)',
  'badges_10': '10 rozet kazanın',
  'badges_25': '25 rozet kazanın',
  'badges_50': '50 rozet kazanın',
  'badges_75': '75 rozet kazanın',
  'badges_100': 'Tüm 100 rozeti kazanın'
};

// ---------- Weekly Streak Dots ------------------------------------------------
function WeeklyStreakDots({ refreshKey }: { refreshKey: number }) {
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const tint = Colors.light.tint;

  const weekKeys = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [refreshKey]);

  // Haftanın günleri Türkçe kısaltmalar
  const weekDays = ["Pts", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];

  useEffect(() => {
    (async () => {
      const done = new Set<string>();
      for (const k of weekKeys) if (await AsyncStorage.getItem(`mood-${k}`)) done.add(k);
      setFilled(done);
    })();
  }, [weekKeys]);

  return (
    <View style={styles.streakBarWrapper}>
      <View style={styles.streakBarRow}>
        {weekKeys.map((k, i) => (
          <View key={k} style={styles.dayColumn}>
            <Text style={styles.dayLabel}>{weekDays[i]}</Text>
            {filled.has(k) ? (
              <Animatable.View
                animation="zoomIn"
                duration={450}
                useNativeDriver
                style={styles.dotShadow}
              >
                <LinearGradient
                  colors={[tint, `${tint}88`]} 
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dotActive}
                />
              </Animatable.View>
            ) : (
              <View style={styles.dotInactive} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Types -------------------------------------------------------------
/** @typedef {{ date: string; mood: string; reflection: string; activityType: string; sessionType?: string; }} HistoryItem */
/** @typedef {{ currentStreak: number; longestStreak: number; lastEntryDate: string | null }} StreakData */
/** @typedef {{ id: string; name: string; description: string; icon: string; unlocked: boolean; unlockedAt?: string }} Badge */

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastEntryDate: null,
  });
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    textSessions: 0,
    voiceSessions: 0,
    videoSessions: 0,
  });
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [animatedStreak, setAnimatedStreak] = useState(0);
  const fireScale = useRef(new Animated.Value(1)).current;
  const [totalBadgesCount, setTotalBadgesCount] = useState(100); // Toplam rozet sayısı
  const [unlockedBadgesCount, setUnlockedBadgesCount] = useState(0); // Açılan rozet sayısı
  const [badgeProgress, setBadgeProgress] = useState(0); // İlerleme yüzdesi (0-1 arası)
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Rozet detay modalı için state
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation refs
  const streakScale = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);
  const refreshBar = useRef(Date.now());

  useEffect(() => {
    loadData();
  }, []);

  // Streak sayısı için animasyon
  useEffect(() => {
    if (streakData.currentStreak > 0) {
      // Streak animasyonu
      let startValue = 0;
      const duration = 1500; // ms
      const interval = 50; // ms
      const step = streakData.currentStreak / (duration / interval);
      
      const timer = setInterval(() => {
        startValue += step;
        if (startValue >= streakData.currentStreak) {
          clearInterval(timer);
          setAnimatedStreak(streakData.currentStreak);
          
          // Fire animasyonu
          Animated.sequence([
            Animated.timing(fireScale, {
              toValue: 1.3,
              duration: 300,
              useNativeDriver: true
            }),
            Animated.timing(fireScale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true
            })
          ]).start();
        } else {
          setAnimatedStreak(Math.floor(startValue));
        }
      }, interval);
      
      return () => clearInterval(timer);
    } else {
      setAnimatedStreak(0);
    }
  }, [streakData.currentStreak]);

  useEffect(() => {
    if (badgeProgress > 0) {
      // İlerleme çubuğu animasyonu
      Animated.timing(progressAnim, {
        toValue: badgeProgress,
        duration: 1500,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic)
      }).start();
    }
  }, [badgeProgress]);

  async function loadData() {
    try {
      setIsLoading(true);

      // Önce mevcut rozetleri yükle
      const stored = await AsyncStorage.getItem('user_badges');
      let previousBadges: Badge[] = stored ? JSON.parse(stored) : [...defaultBadges];
      const previousUnlockedCount = previousBadges.filter((b: Badge) => b.unlocked).length;
      
      // Seans istatistiklerini al
      const stats = await getSessionStats();
      setSessionStats(stats);

      // Günlük sayısını al
      const entries = await getTotalEntries();
      setTotalEntries(entries);

      // AI özet sayısını al
      const totalSummaries = await getTotalSummaries();

      // Profil verilerini al
      const profile = await AsyncStorage.getItem('userProfile');
      const profileData = profile ? JSON.parse(profile) : {};
      const profileComplete = isProfileComplete(profileData);
      const hasPhoto = !!profileData.profileImage;
      const hasBio = !!(profileData.expectation || profileData.therapyGoals);
      const hasGoals = !!profileData.therapyGoals;
      const customizedProfile = !!profileData.profileImage || !!profileData.nickname;

      // Streak verilerini al
      const streak = await calculateStreak();
      setStreakData(streak);

      // Tüm rozet kontrolleri
      // 1. Günlük Writing Rozetleri
      await checkAndUpdateBadges('daily', {
        totalEntries: entries
      });

      // 2. Özel Daily Writer rozetleri
      if (entries >= 3) {
        await checkAndUpdateBadges('daily', {
          dailyWriterNovice: true
        });
      }
      
      if (entries >= 15) {
        await checkAndUpdateBadges('daily', {
          dailyWriterExpert: true
        });
      }

      // 3. Seans Rozetleri
      await checkAndUpdateBadges('session', {
        textSessions: stats.textSessions,
        voiceSessions: stats.voiceSessions,
        videoSessions: stats.videoSessions,
        totalSessions: stats.totalSessions,
        diverseSessionCompleted: (stats.textSessions > 0 && stats.voiceSessions > 0 && stats.videoSessions > 0)
      });

      // 4. Streak Rozetleri
      await checkAndUpdateBadges('streak', {
        streak: streak.currentStreak,
        longestStreak: streak.longestStreak
      });

      // 5. Profil Rozetleri
      await checkAndUpdateBadges('profile', {
        profileComplete,
        hasPhoto,
        hasBio,
        hasGoals,
        customizedProfile
      });

      // 6. AI ve Günlük Rozetleri
      // 6.1 AI Özetleri
      await checkAndUpdateBadges('ai', {
        aiSummaries: totalSummaries,
        aiInsights: true
      });

      // 6.2 Günlük Analizi
      await checkAndUpdateBadges('diary', {
        aiDiaryCompleted: totalSummaries
      });

      // Güncellenmiş rozetleri yükle
      const newStored = await AsyncStorage.getItem('user_badges');
      const updatedBadges = newStored ? JSON.parse(newStored) : [...defaultBadges];
      setBadges(updatedBadges);
      
      // Açılan rozet sayısını ve ilerleme durumunu hesapla
      const currentUnlockedCount = updatedBadges.filter((b: Badge) => b.unlocked).length;
      setUnlockedBadgesCount(currentUnlockedCount);
      
      // Varsayılan rozetlerin gerçek sayısını kullan
      const totalCount = updatedBadges.length;
      setTotalBadgesCount(totalCount);
      setBadgeProgress(currentUnlockedCount / totalCount);
      
      // Yeni açılan rozetleri kontrol et
      const hasNewUnlocks = currentUnlockedCount > previousUnlockedCount;
      
      if (hasNewUnlocks) {
        const newlyUnlocked = updatedBadges.filter(
          (badge: Badge) => badge.unlocked && !previousBadges.find((b: Badge) => b.id === badge.id && b.unlocked)
        );
        setNewBadges(newlyUnlocked);
        
        // Yeni rozet kazanıldıysa konfeti göster
        if (newlyUnlocked.length > 0) {
          setTimeout(() => {
            setShowConfetti(true);
            
            // Streak kartını hafifçe animasyonlandır
            Animated.sequence([
              Animated.timing(streakScale, {
                toValue: 1.05,
                duration: 300,
                useNativeDriver: true
              }),
              Animated.timing(streakScale, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
              })
            ]).start();
          }, 800);
        }
      }

      // Refresh dot bar
      refreshBar.current = Date.now();
      
      // Debug bilgisi
      console.log('Toplam rozet sayısı:', updatedBadges.length);
      console.log('Açılmış rozet sayısı:', currentUnlockedCount);
      
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Rozetleri kategorilere göre grupla
  const groupedBadges = useMemo(() => {
    // Kategorileri belirli bir sırada düzenle
    const orderedBadges = badges.reduce((acc: Record<string, Badge[]>, badge: Badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    }, {});

    // Kategorileri istenen sırada düzenle
    const orderedCategories = ['daily', 'streak', 'session', 'ai', 'diary', 'profile'];
    const result: Record<string, Badge[]> = {};
    
    // Sıralı kategorileri ekle
    orderedCategories.forEach(category => {
      if (orderedBadges[category] && orderedBadges[category].length > 0) {
        result[category] = orderedBadges[category];
      }
    });
    
    // Sıralanmamış diğer kategorileri ekle (gelecekte yeni kategori eklenirse)
    Object.keys(orderedBadges).forEach(category => {
      if (!orderedCategories.includes(category) && orderedBadges[category].length > 0) {
        result[category] = orderedBadges[category];
      }
    });
    
    return result;
  }, [badges]);

  // Kategori başlıkları - emojileri kaldırıyorum
  const categoryTitles: Record<string, string> = {
    daily: 'Günlük Yazma Başarıları',
    session: 'Terapi Seansı Başarıları',
    ai: 'Yapay Zeka Kullanımı',
    profile: 'Profil Tamamlama',
    streak: 'Günlük Seri Başarıları',
    diary: 'AI Destekli Günlük'
  };

  // Kategori ikonları
  const categoryIcons: Record<string, string> = {
    daily: 'book-outline',
    session: 'chatbubble-outline',
    ai: 'cloud-outline',
    profile: 'person-outline',
    streak: 'flame-outline',
    diary: 'journal-outline'
  };

  // İlerleme çubuğu değerinden genişlik hesapla
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  // Rozet detaylarını gösterme fonksiyonu
  const showBadgeDetails = (badge: Badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  // Rozet detay modalını kapatma
  const closeBadgeModal = () => {
    setModalVisible(false);
  };

  // ---------- Render ----------------------------------------------------------
  const tint = Colors[colorScheme ?? 'light'].tint;

  // Kategori başlıklarının sabit kalması için düzenleme
  const renderBadgeCategories = () => {
    // Önce kazanılmış rozet bölümünü ekleyelim
    const unlockedBadges = badges.filter(badge => badge.unlocked);
    
    // Ardından kategorileri render edelim
    return (
      <View>
        {/* Kazanılmış Rozetler Bölümü */}
        {unlockedBadges.length > 0 && (
          <View style={styles.badgeSection}>
            <View style={styles.categoryHeaderContainer}>
              <View style={[styles.categoryHeader, styles.unlockedCategoryHeader]}>
                <View style={[styles.categoryIconContainer, styles.unlockedIconContainer]}>
                  <Ionicons name="trophy" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.categoryTitle, styles.unlockedCategoryTitle]}>Kazanılmış Rozetler</Text>
              </View>
            </View>
            
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeListContainer}
              snapToInterval={BADGE_CARD_WIDTH + 10}
              decelerationRate={0.95}
              snapToAlignment="start"
              data={unlockedBadges}
              initialNumToRender={3}
              maxToRenderPerBatch={5}
              windowSize={5}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Animatable.View
                  animation="fadeIn"
                  duration={800}
                  useNativeDriver
                  style={styles.badgeCardWrapper}
                >
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => showBadgeDetails(item)}
                    style={[styles.badgeCard, styles.unlockedBadgeCard]}
                  >
                    <View style={[styles.badgeIconBg, styles.badgeIconUnlocked]}>
                      <Ionicons
                        name={convertMaterialIconToIonicon(item.icon)}
                        size={22}
                        color={Colors.light.tint}
                      />
                    </View>
                    <View style={styles.badgeTextContainer}>
                      <Text style={[styles.badgeCardName, { color: '#1c1c1e' }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.badgeCardDesc, { color: '#7a7f87' }]}>
                        {item.description}
                      </Text>
                      {item.unlockedAt && (
                        <Text style={styles.badgeUnlockedDate}>
                          {new Date(item.unlockedAt).toLocaleDateString('tr-TR')}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              )}
            />
          </View>
        )}
        
        {/* Kategori Bazlı Rozetler */}
        {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <View key={category} style={styles.badgeSection}>
            <View style={styles.categoryHeaderContainer}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={categoryIcons[category] as any} size={18} color={Colors.light.tint} />
                </View>
                <Text style={styles.categoryTitle}>{categoryTitles[category]}</Text>
              </View>
            </View>
            
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeListContainer}
              snapToInterval={BADGE_CARD_WIDTH + 10}
              decelerationRate={0.95}
              snapToAlignment="start"
              data={categoryBadges}
              initialNumToRender={3}
              maxToRenderPerBatch={5}
              windowSize={5}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isNewlyUnlocked = newBadges.some(badge => badge.id === item.id);
                return (
                  <Animatable.View
                    animation={isNewlyUnlocked ? 'fadeIn' : undefined}
                    delay={isNewlyUnlocked ? 600 : 0}
                    useNativeDriver
                    style={styles.badgeCardWrapper}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => showBadgeDetails(item)}
                      style={[
                        styles.badgeCard,
                        isNewlyUnlocked && { borderColor: Colors.light.tint, borderWidth: 1.5 }
                      ]}
                    >
                      {isNewlyUnlocked && (
                        <View style={styles.newBadgeIndicator}>
                          <Text style={styles.newText}>Yeni</Text>
                        </View>
                      )}
                      <View style={[
                        styles.badgeIconBg,
                        item.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked
                      ]}>
                        <Ionicons
                          name={convertMaterialIconToIonicon(item.icon)}
                          size={22}
                          color={item.unlocked ? Colors.light.tint : '#D8D8D8'}
                        />
                      </View>
                      <View style={styles.badgeTextContainer}>
                        <Text style={[styles.badgeCardName, { color: item.unlocked ? '#1c1c1e' : '#A8A8A8' }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.badgeCardDesc, { color: item.unlocked ? '#7a7f87' : '#BDBDBD' }]}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animatable.View>
                );
              }}
            />
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#F9FAFB', '#ECEFF4']} style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.brand}>
        therapy<Text style={styles.dot}>.</Text>
      </Text>

      <Text style={styles.title}>Başarılarım</Text>
      <Text style={styles.subtitle}>İlerleme durumunu takip et ve kazandığın rozetleri keşfet.</Text>

      {/* Rozet İlerleme Çubuğu */}
      <Animatable.View animation="fadeIn" duration={800} style={styles.progressContainer}>
        <View style={styles.progressInfoContainer}>
          <Text style={styles.progressText}>
            {unlockedBadgesCount}/{totalBadgesCount} Rozet Tamamlandı
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.round(badgeProgress * 100)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <Animated.View 
            style={[
              styles.progressBarFill,
              { width: progressWidth }
            ]} 
          />
          
          {/* Eğer ilerleme %25'in üzerindeyse içine yıldız ikonu ekleyelim */}
          {badgeProgress > 0.25 && (
            <Animated.View style={styles.progressBarStars}>
              <Ionicons name="star" size={18} color="#FFFFFF" style={{opacity: 0.7}} />
            </Animated.View>
          )}
          
          {/* Eğer ilerleme %50'nin üzerindeyse içine yıldız ikonu ekleyelim */}
          {badgeProgress > 0.5 && (
            <Animated.View style={[styles.progressBarStars, {left: '45%'}]}>
              <Ionicons name="star" size={18} color="#FFFFFF" style={{opacity: 0.8}} />
            </Animated.View>
          )}
          
          {/* Eğer ilerleme %75'in üzerindeyse içine yıldız ikonu ekleyelim */}
          {badgeProgress > 0.75 && (
            <Animated.View style={[styles.progressBarStars, {left: '80%'}]}>
              <Ionicons name="star" size={18} color="#FFFFFF" style={{opacity: 0.9}} />
            </Animated.View>
          )}
        </View>
        
        {/* İlerleme seviyesi tablosu */}
        <View style={styles.progressLevels}>
          <View style={styles.progressLevel}>
            <View style={[styles.levelDot, badgeProgress >= 0.25 ? styles.levelDotActive : null]} />
            <Text style={[styles.levelText, badgeProgress >= 0.25 ? styles.levelTextActive : null]}>
              Başlangıç
            </Text>
          </View>
          <View style={styles.progressLevel}>
            <View style={[styles.levelDot, badgeProgress >= 0.5 ? styles.levelDotActive : null]} />
            <Text style={[styles.levelText, badgeProgress >= 0.5 ? styles.levelTextActive : null]}>
              Orta
            </Text>
          </View>
          <View style={styles.progressLevel}>
            <View style={[styles.levelDot, badgeProgress >= 0.75 ? styles.levelDotActive : null]} />
            <Text style={[styles.levelText, badgeProgress >= 0.75 ? styles.levelTextActive : null]}>
              İleri
            </Text>
          </View>
          <View style={styles.progressLevel}>
            <View style={[styles.levelDot, badgeProgress >= 1 ? styles.levelDotActive : null]} />
            <Text style={[styles.levelText, badgeProgress >= 1 ? styles.levelTextActive : null]}>
              Uzman
            </Text>
          </View>
        </View>
      </Animatable.View>

      {/* Confetti */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          fadeOut
          explosionSpeed={200}
          fallSpeed={3000}
          origin={{ x: width / 2, y: 0 }}
          onAnimationEnd={() => setShowConfetti(false)}
          colors={['#94C9F9', '#5DA1D9', '#67B8F8', '#8FDDFE', '#C0DEFF']}
        />
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[]}
        nestedScrollEnabled={true}
      >
        {/* Streak Card */}
        <Animated.View style={[styles.streakCard, { transform: [{ scale: streakScale }] }]}>
          <View style={styles.streakHeader}>
            <Animated.View style={{ transform: [{ scale: fireScale }] }}>
              <Ionicons name="flame" size={24} color={Colors.light.tint} />
            </Animated.View>
            <Text style={styles.streakTitle}>Günlük Seri</Text>
          </View>
          <Text style={styles.streakNumber}>{animatedStreak}</Text>
          <Text style={styles.streakDesc}>
            {streakData.currentStreak > 0
              ? 'Harika gidiyorsun!'
              : 'İlk günlüğü yazmaya başla.'}
          </Text>
          <WeeklyStreakDots refreshKey={refreshBar.current} />
        </Animated.View>

        {/* Yeni rozetler bildirimi */}
        {newBadges.length > 0 && (
          <Animatable.View 
            animation="fadeIn" 
            duration={800} 
            style={styles.newBadgeAlert}
          >
            <Ionicons name="trophy-outline" size={20} color={Colors.light.tint} />
            <Text style={styles.newBadgeText}>
              {newBadges.length === 1 
                ? 'Yeni bir rozet kazandın!' 
                : `${newBadges.length} yeni rozet kazandın!`}
            </Text>
          </Animatable.View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <StatBox label="Toplam Günlük" value={totalEntries} />
          <View style={styles.statDivider} />
          <StatBox label="En Uzun Seri" value={streakData.longestStreak} />
          <View style={styles.statDivider} />
          <StatBox label="Toplam Seans" value={sessionStats.totalSessions} />
        </View>

        {/* Kategoriler ve rozetler */}
        {renderBadgeCategories()}
      </ScrollView>

      {/* Rozet Detay Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeBadgeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeBadgeModal}>
              <Ionicons name="close" size={24} color="#555" />
            </TouchableOpacity>

            {selectedBadge && (
              <View style={styles.badgeDetailContent}>
                <View style={[
                  styles.badgeIconBgLarge,
                  selectedBadge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked
                ]}>
                  <Ionicons
                    name={convertMaterialIconToIonicon(selectedBadge.icon)}
                    size={42}
                    color={selectedBadge.unlocked ? Colors.light.tint : '#D8D8D8'}
                  />
                </View>

                <Text style={styles.badgeDetailName}>
                  {selectedBadge.name}
                </Text>

                <Text style={styles.badgeDetailDesc}>
                  {selectedBadge.description}
                </Text>

                {selectedBadge.unlocked ? (
                  <View style={styles.badgeUnlockedInfo}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.badgeUnlockedText}>
                      {selectedBadge.unlockedAt 
                        ? `${new Date(selectedBadge.unlockedAt).toLocaleDateString('tr-TR')} tarihinde kazanıldı` 
                        : 'Kazanıldı'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.badgeRequirement}>
                    <Text style={styles.badgeRequirementTitle}>Nasıl Kazanılır?</Text>
                    <View style={styles.badgeRequirementContent}>
                      <Ionicons name="trophy-outline" size={20} color={Colors.light.tint} style={styles.badgeRequirementIcon} />
                      <Text style={styles.badgeRequirementText}>
                        {badgeRequirements[selectedBadge.id] || 'Uygulama kullanımın devam ettikçe kazanılır.'}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={closeBadgeModal}
                >
                  <Text style={styles.modalCloseBtnText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ---------- Small component: StatBox -----------------------------------------
function StatBox({ label, value }: StatBoxProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------- Styles ------------------------------------------------------------
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    backgroundColor: '#F9FAFB',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 5,
  },
  brand: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    marginBottom: 10,
  },
  dot: {
    color: '#5DA1D9',
    fontSize: 26,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1c1e',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6c7580',
    marginBottom: 30,
  },
  scrollContent: { 
    paddingBottom: 100, // Daha fazla alt boşluk ekliyoruz
    paddingHorizontal: 6,
  },

  // ----- Streak Card --------------------------------------------------------
  streakCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 8,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1c1e',
    marginBottom: 6,
  },
  streakDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6c7580',
    marginBottom: 20,
    textAlign: 'center',
  },
  streakBarWrapper: { 
    alignItems: 'center', 
    width: '100%',
    marginTop: 8,
  },
  streakBarRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: '85%',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    color: '#A8A8A8',
    marginBottom: 6,
  },
  dotShadow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: Colors.light.tint,
  },
  dotActive: { flex: 1 },
  dotInactive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },

  // ----- New Badge Alert --------------------------------------------------- 
  newBadgeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E1F0FF',
  },
  newBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 10,
  },

  // ----- Stats --------------------------------------------------------------
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EAEAEA',
  },
  statBox: { 
    alignItems: 'center', 
    flex: 1 
  },
  statNumber: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1a1c1e',
    marginBottom: 4,
  },
  statLabel: { 
    fontSize: 13, 
    color: '#7a7f87', 
    fontWeight: '500', 
  },

  // ----- Categories Styles -----------------------------------------------
  categoryHeaderContainer: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    paddingVertical: 3,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1c1e',
  },
  badgeSection: { 
    marginBottom: 20,
  },
  badgeListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingRight: 8, // Sağ tarafta daha az boşluk bırakalım
  },
  badgeCardWrapper: {
    marginRight: 10, // Kartlar arası boşluğu azaltalım (daha önce 14'tü)
    width: BADGE_CARD_WIDTH,
  },
  
  // ----- Badges -------------------------------------------------------------
  badgeCard: {
    width: '100%',
    height: BADGE_CARD_HEIGHT,
    borderRadius: 24,
    padding: 12, // Padding'i azalt (daha önce 16'ydı)
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
    paddingVertical: 16, // Padding'i azalt (daha önce 20'ydi)
  },
  badgeIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeIconUnlocked: {
    backgroundColor: '#F0F9FF',
    borderWidth: 0,
  },
  badgeIconLocked: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  newBadgeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E1F0FF',
  },
  newText: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  badgeTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2, // Daha az yatay padding (daha önce 4'tü)
    flex: 1,
  },
  badgeCardName: { 
    fontSize: 13, // Daha küçük font boyutu (daha önce 15'ti)
    fontWeight: '600', 
    marginBottom: 4, // Daha az alt boşluk (daha önce 6'ydı)
    textAlign: 'center',
  },
  badgeCardDesc: {
    fontSize: 11, // Daha küçük font boyutu (daha önce 12'ydi)
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 14, // Daha az satır yüksekliği (daha önce 16'ydı)
  },
  badgeCardDate: { 
    fontSize: 10, 
    color: '#A8A8A8', 
    marginTop: 6,
  },

  // Kazanılmış rozetler için özel stiller
  unlockedCategoryHeader: {
    borderBottomColor: Colors.light.tint + '40',
    borderBottomWidth: 2,
  },
  unlockedIconContainer: {
    backgroundColor: Colors.light.tint,
  },
  unlockedCategoryTitle: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  unlockedBadgeCard: {
    borderWidth: 1,
    borderColor: '#F0F9FF',
    shadowOpacity: 0.06,
  },
  badgeUnlockedDate: {
    fontSize: 11,
    color: '#A8A8A8',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Rozet ilerleme çubuğu için stiller
  progressContainer: {
    marginHorizontal: 22,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  progressInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1e',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E1E7EF',
    borderRadius: 6,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.light.tint,
    borderRadius: 6,
  },
  progressBarStars: {
    position: 'absolute',
    top: -3,
    left: '20%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  progressLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  progressLevel: {
    alignItems: 'center',
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E1E7EF',
    marginBottom: 4,
  },
  levelDotActive: {
    backgroundColor: Colors.light.tint,
  },
  levelText: {
    fontSize: 10,
    color: '#A8A8A8',
  },
  levelTextActive: {
    color: Colors.light.tint,
    fontWeight: '600',
  },

  // Rozet Detay Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 10,
  },
  badgeDetailContent: {
    width: '100%',
    alignItems: 'center',
  },
  badgeIconBgLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  badgeDetailName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1c1e',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeDetailDesc: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  badgeUnlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  badgeUnlockedText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
  },
  badgeRequirement: {
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  badgeRequirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5AFE',
    marginBottom: 10,
  },
  badgeRequirementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badgeRequirementIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  badgeRequirementText: {
    flex: 1,
    fontSize: 14,
    color: '#5C6BC0',
    lineHeight: 20,
  },
  modalCloseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    marginTop: 10,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// MaterialCommunityIcons ve Ionicons arasında ikon adlarını dönüştüren yardımcı fonksiyon
function convertMaterialIconToIonicon(materialIcon: string): any {
  // Basit ikon eşleme tablosu
  const iconMap: Record<string, string> = {
    'notebook': 'journal-outline',
    'notebook-edit': 'journal-outline',
    'notebook-check': 'journal-outline',
    'message-text': 'chatbubble-outline',
    'message-video': 'videocam-outline',
    'microphone': 'mic-outline',
    'account': 'person-outline',
    'account-check': 'person-outline',
    'account-edit': 'create-outline',
    'robot': 'cloud-outline',
    'robot-happy': 'cloud-outline',
    'book-open-variant': 'book-outline',
    'book-open-page-variant': 'book-outline',
    'fire': 'flame-outline',
    'trophy': 'trophy-outline',
    'trophy-outline': 'trophy-outline',
    'star': 'star-outline',
    'heart': 'heart-outline',
    'check': 'checkmark-outline',
    'check-circle': 'checkmark-circle-outline',
    'information': 'information-circle-outline',
    'calendar': 'calendar-outline',
    'clock': 'time-outline'
  };

  // Eşlenik ikon varsa kullan, yoksa varsayılan ikon
  return iconMap[materialIcon] || 'ribbon-outline';
}