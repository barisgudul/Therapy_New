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

// ---- YENİ PREMIUM & ZARİF TASARIM TEMASI ----
const theme = {
  // Sakin, havadar ve lüks bir his veren açık mavi tonları
  backgroundGradient: ['#F7F9FF', '#E9EFFC'] as [string, string], 
  card: '#FFFFFF',
  // Daha derin, sofistike ve sakin bir mavi
  primary: '#4A69E2', 
  primaryGradient: ['#4A69E2', '#6A82E8'] as [string, string],
  // Okunabilirlik için yüksek kontrastlı metin
  text: '#1C202B', 
  textLight: '#5A6474',
  textSubtle: '#8A94A4',
  // Kullanıcı balonu için daha yumuşak bir arka plan
  userBubble: '#F1F4F8', 
  // Yapay zeka balonu için ana renkten türetilmiş sofistike bir gradyan
  aiBubbleGradient: ['rgba(74, 105, 226, 0.05)', 'rgba(106, 130, 232, 0.1)'] as [string, string],
  // Ana renkle uyumlu, daha yumuşak ve yayvan bir gölge
  shadow: 'rgba(74, 105, 226, 0.15)', 
  success: '#28A745',
  // Analiz kutusunun kenarlığı için ince bir vurgu
  analysisBorder: 'rgba(74, 105, 226, 0.2)',
  iconBackground: 'rgba(74, 105, 226, 0.08)',
  divider: '#EFF2F7',
};

// ---- ARAYÜZ BİLEŞENLERİ (UI Components) ----

interface SessionEvent {
  id: string;
  type: string;
  timestamp: number;
  mood?: 'happy' | 'neutral' | 'sad';
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

// Ruh haline göre ikon ve renk döndürür
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

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      velocity: 3,
      tension: 2,
      friction: 8,
      delay: index * 120,
      useNativeDriver: true,
    }).start();
    Animated.spring(slideAnim, {
      toValue: 0,
      velocity: 3,
      tension: 2,
      friction: 8,
      delay: index * 120,
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
        {/* Kart Başlığı */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 16 }}>
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
              <Icon name={moodDetails.icon} size={26} color={moodDetails.color} />
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
            <Pressable onPress={handleAnalyze} disabled={analysis.loading} style={({ pressed }) => [
              styles.analyzeBtnContainer,
              { transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}>
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
            <View style={styles.analysisBox}>
              <View style={styles.analysisHeaderContainer}>
                  <Icon name="brain" size={20} color={theme.primary} />
                  <Text style={styles.analysisHeader}>Yapay Zeka Analizi</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.result}</Text>
            </View>
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
    const parsedEvents = params.events ? JSON.parse(params.events as string) : [];
    events = parsedEvents.map((e: SessionEvent, i: number) => ({
      ...e,
      mood: i % 3 === 0 ? 'happy' : i % 3 === 1 ? 'neutral' : 'sad'
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
                <Icon name="award" size={52} color="white" />
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
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: Platform.OS === 'android' ? 50 : 70,
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  header: {
    fontSize: 34,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 12,
  },
  subheader: {
    fontSize: 17,
    color: theme.textLight,
    textAlign: 'center',
    maxWidth: '90%',
    lineHeight: 26,
  },
  // Kart Stilleri
  card: {
    backgroundColor: theme.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.iconBackground,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  sessionType: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  sessionDate: {
    fontSize: 14,
    color: theme.textSubtle,
    marginTop: 12,
    marginLeft: 4,
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
    borderRadius: 22,
    maxWidth: '85%',
  },
  userBubbleContainer: {
    backgroundColor: theme.userBubble,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  aiBubbleContainer: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  userText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 24,
  },
  aiText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 24,
  },
  // Aksiyon ve Analiz Stilleri
  actionSection: {
    marginTop: 24,
  },
  analyzeBtnContainer: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  analyzeBtn: {
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 17,
  },
  analysisBox: {
    backgroundColor: 'rgba(74, 105, 226, 0.04)',
    borderRadius: 22,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.analysisBorder,
  },
  analysisHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analysisHeader: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.primary,
  },
  analysisText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 25,
  },
  // Boş Durum Stilleri
  emptyState: {
    flex: 1,
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyStateIconContainer: {
      width: 110,
      height: 110,
      borderRadius: 55,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
  },
  emptyStateHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 17,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 26,
  },
  emptyText: {
    color: theme.textSubtle,
    fontStyle: 'italic',
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 15,
  }
});