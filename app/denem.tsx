import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { analyzeDiaryEntry } from '../hooks/useGemini';

// Android'de LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- YENİ PREMIUM TASARIM TEMASI ----
const theme = {
  // Sakin, havadar ve lüks bir his veren açık mavi tonları
  backgroundGradient: ['#F7F9FF', '#E9EFFC'] as [string, string], 
  card: '#FFFFFF',
  // Daha modern ve enerjik bir mavi
  primary: '#3D5AFE', 
  primaryGradient: ['#3D5AFE', '#5C6BC0'] as [string, string],
  // Okunabilirlik için yüksek kontrastlı metin
  text: '#0D1117', 
  textLight: '#586069',
  textSubtle: '#8B949E',
  // Kullanıcı balonu için daha yumuşak bir arka plan
  userBubble: '#F1F3F5', 
  // Yapay zeka balonu için ana renkten türetilmiş sofistike bir gradyan
  aiBubbleGradient: ['rgba(61, 90, 254, 0.05)', 'rgba(92, 107, 192, 0.1)'] as [string, string],
  // Ana renkle uyumlu, daha yumuşak bir gölge
  shadow: 'rgba(61, 90, 254, 0.12)', 
  success: '#28A745',
  // Analiz kutusunun kenarlığı için ince bir vurgu
  analysisBorder: 'rgba(61, 90, 254, 0.15)',
  iconBackground: 'rgba(61, 90, 254, 0.08)',
};

// ---- ARAYÜZ BİLEŞENLERİ (UI Components) ----

interface SessionEvent {
  id: string;
  type: string;
  timestamp: number;
  mood?: 'happy' | 'neutral' | 'sad'; // Örnek ruh hali verisi
  data: {
    messages: { sender: string; text: string }[];
    [key: string]: any;
  };
}

// Seans tipine göre ikon döndürür
const getSessionIcon = (type: string) => {
  switch (type) {
    case 'text_session': return 'edit';
    case 'voice_session': return 'mic';
    case 'video_session': return 'video';
    default: return 'message-circle';
  }
};

// Ruh haline göre ikon ve renk döndürür (Premium bir detay!)
const getMoodDetails = (mood?: string) => {
  switch (mood) {
    case 'happy': return { icon: 'smile', color: '#4CAF50' };
    case 'neutral': return { icon: 'meh', color: '#FFC107' };
    case 'sad': return { icon: 'frown', color: '#F44336' };
    default: return null;
  }
};

// Mesaj Baloncuğu Bileşeni
const MessageBubble: React.FC<{ message: { sender: string; text: string } }> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  if (isUser) {
    return (
      <View style={[styles.bubbleContainer, styles.userBubbleContainer]}>
        <Text style={styles.userText}>{message.text}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={theme.aiBubbleGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.bubbleContainer, styles.aiBubbleContainer]}
    >
      <Text style={styles.aiText}>{message.text}</Text>
    </LinearGradient>
  );
};

// Animasyonlu Seans Kartı Bileşeni
const AnimatedSessionCard: React.FC<{ event: SessionEvent; index: number }> = ({ event, index }) => {
  const [analysis, setAnalysis] = React.useState({ loading: false, result: null as string | null });
  const moodDetails = getMoodDetails(event.mood);

  // Kartların ekrana gelirken animasyonlu girişi için
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100, // Kartların art arda gelmesi için
      useNativeDriver: true,
    }).start();
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim, index]);


  const handleAnalyze = async () => {
    setAnalysis({ loading: true, result: null });
    try {
      const fullText = event.data.messages.map(m => m.text).join('\n\n');
      const result = await analyzeDiaryEntry(fullText);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setAnalysis({ loading: false, result: result.feedback });
    } catch (e) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setAnalysis({ loading: false, result: 'Yapay zeka analizi sırasında bir hata oluştu.' });
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.card}>
        {/* Kart Başlığı - Daha dengeli ve şık bir yerleşim */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.sessionTypeContainer}>
              <Icon name={getSessionIcon(event.type)} size={16} color={theme.primary} />
              <Text style={styles.sessionType}>
                {event.type === 'text_session' ? 'Yazı Terapisi' : event.type === 'voice_session' ? 'Sesli Terapi' : 'Görüntülü Terapi'}
              </Text>
            </View>
            <Text style={styles.sessionDate}>
              {new Date(event.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          {moodDetails && (
            <View style={[styles.moodIconContainer, { backgroundColor: moodDetails.color + '1A' }]}>
              <Icon name={moodDetails.icon} size={24} color={moodDetails.color} />
            </View>
          )}
        </View>
        
        {/* Mesajlar */}
        <View style={styles.messagesContainer}>
          {event.data?.messages?.length ? (
            event.data.messages.map((m, i) => <MessageBubble key={i} message={m} />)
          ) : (
            <Text style={styles.emptyText}>Bu seans için döküm bulunamadı.</Text>
          )}
        </View>
        
        {/* Analiz Bölümü */}
        <View style={styles.actionSection}>
          {!analysis.result && (
            <Pressable onPress={handleAnalyze} disabled={analysis.loading} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <LinearGradient
                colors={analysis.loading ? ['#BDBDBD', '#9E9E9E'] : theme.primaryGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.analyzeBtn}
              >
                {analysis.loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="sparkles" size={20} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.analyzeBtnText}>Zeka ile Değerlendir</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}

          {analysis.result && (
            <LinearGradient colors={theme.aiBubbleGradient} style={styles.analysisBox}>
              <View style={styles.analysisHeaderContainer}>
                  <Icon name="brain" size={18} color={theme.primary} />
                  <Text style={styles.analysisHeader}>Yapay Zeka Analizi</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.result}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// ---- ANA EKRAN ----
export default function PremiumHistoryScreen(props: any) {
  const params = props.route?.params || {};
  let events: SessionEvent[] = [];
  try {
    // Örnek mood verisi ekleyelim
    const parsedEvents = params.events ? JSON.parse(params.events as string) : [];
    events = parsedEvents.map((e: SessionEvent, i: number) => ({
      ...e,
      mood: i % 3 === 0 ? 'happy' : i % 3 === 1 ? 'neutral' : 'sad' // Demo için rastgele mood
    }));
  } catch {
    events = [];
  }

  return (
    <LinearGradient colors={theme.backgroundGradient} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
            <Text style={styles.header}>Yolculuğum</Text>
            <Text style={styles.subheader}>
            Geçmiş seanslarınıza göz atın ve içgörülerinizi keşfedin.
            </Text>
        </View>
        
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={theme.primaryGradient} style={styles.emptyStateIconContainer}>
                <Icon name="award" size={48} color="white" />
            </LinearGradient>
            <Text style={styles.emptyStateHeader}>Henüz Bir Anı Yok</Text>
            <Text style={styles.emptyStateText}>İlk seansınız tamamlandığında yolculuğunuz burada başlayacak.</Text>
          </View>
        ) : (
          events
            .sort((a,b) => b.timestamp - a.timestamp)
            .map((event, index) => <AnimatedSessionCard key={event.id} event={event} index={index} />)
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ---- STİLLER (Styles) ----
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: 'center',
    maxWidth: '85%',
  },
  // Kart Stilleri
  card: {
    backgroundColor: theme.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.iconBackground,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100, // Tam yuvarlak kapsül
  },
  sessionType: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  sessionDate: {
    fontSize: 13,
    color: theme.textSubtle,
    marginTop: 10,
    marginLeft: 4
  },
  moodIconContainer: {
      padding: 12,
      borderRadius: 18,
  },
  // Mesaj Stilleri
  messagesContainer: {
    gap: 14,
  },
  bubbleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    maxWidth: '85%',
  },
  userBubbleContainer: {
    backgroundColor: theme.userBubble,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubbleContainer: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  // Aksiyon ve Analiz Stilleri
  actionSection: {
    marginTop: 24,
  },
  analyzeBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  analysisBox: {
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  analysisHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  analysisHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  analysisText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 24,
  },
  // Boş Durum Stilleri
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateIconContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
  },
  emptyStateHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyText: {
    color: theme.textLight,
    fontStyle: 'italic',
    padding: 10,
    textAlign: 'center',
  }
});