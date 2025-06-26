import { LinearGradient } from 'expo-linear-gradient'; // Gradyanlar için
import * as React from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, // Daha gelişmiş dokunma etkileşimleri için
  UIManager,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { analyzeDiaryEntry } from '../hooks/useGemini';

// Android'de LayoutAnimation'ı etkinleştirmek için
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- PREMIUM TASARIM TEMASI ----
const theme = {
  backgroundGradient: ['#FDFEFF', '#F5F7FA'] as [string, string], // Çok ince, ferah bir gradyan
  card: '#FFFFFF',
  primaryGradient: ['#4361EE', '#5A67D8'] as [string, string], // Canlı ve güvenilir mavi/mor gradyan
  primary: '#4361EE',
  text: '#1A202C', // Daha koyu ve kontrastlı metin
  textLight: '#718096', // İkincil metinler için yumuşak gri
  textSubtle: '#A0AEC0', // En az dikkat çeken metinler
  userBubble: '#F0F2F5',
  aiBubbleGradient: ['rgba(67, 97, 238, 0.05)', 'rgba(90, 103, 216, 0.15)'] as [string, string],
  shadow: 'rgba(67, 97, 238, 0.15)', // Gölge rengini ana renkle uyumlu hale getirme
  success: '#38A169',
  analysisBorder: 'rgba(67, 97, 238, 0.2)',
};

// ---- ARAYÜZ BİLEŞENLERİ (UI Components) ----

interface SessionEvent {
  id: string;
  type: string;
  timestamp: number;
  mood?: string;
  data: {
    messages: { sender: string; text: string }[];
    [key: string]: any;
  };
}

const getSessionIcon = (type: string) => {
  switch (type) {
    case 'text_session': return 'edit-3';
    case 'voice_session': return 'mic';
    case 'video_session': return 'video';
    default: return 'message-circle';
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

// Seans Kartı Bileşeni
const SessionCard: React.FC<{ event: SessionEvent }> = ({ event }) => {
  const [analysis, setAnalysis] = React.useState({ loading: false, result: null as string | null });

  const handleAnalyze = async () => {
    setAnalysis({ loading: true, result: null });
    try {
      const fullText = event.data.messages.map(m => m.text).join('\n\n');
      const result = await analyzeDiaryEntry(fullText);
      // Animasyonu daha akışkan ve "yaylı" bir efekte değiştiriyoruz
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setAnalysis({ loading: false, result: result.feedback });
    } catch (e) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setAnalysis({ loading: false, result: 'AI analizi sırasında bir hata oluştu.' });
    }
  };

  return (
    <View style={styles.card}>
      {/* Kart Başlığı */}
      <View style={styles.cardHeader}>
        <View style={styles.sessionTypeContainer}>
          <Icon name={getSessionIcon(event.type)} size={18} color={theme.primary} />
          <Text style={styles.sessionType}>
            {event.type === 'text_session' ? 'Yazı Terapi' : event.type === 'voice_session' ? 'Sesli Terapi' : 'Görüntülü Terapi'}
          </Text>
        </View>
        <View style={styles.dateContainer}>
           <Icon name="calendar" size={14} color={theme.textSubtle} />
           <Text style={styles.sessionDate}>
            {new Date(event.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
           </Text>
        </View>
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
          <Pressable onPress={handleAnalyze} disabled={analysis.loading}>
            {({ pressed }) => (
              <LinearGradient
                colors={theme.primaryGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.analyzeBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                {analysis.loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="sparkles" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.analyzeBtnText}>Zeka ile Değerlendir</Text>
                  </>
                )}
              </LinearGradient>
            )}
          </Pressable>
        )}

        {analysis.result && (
          <View style={styles.analysisBox}>
            <View style={styles.analysisHeaderContainer}>
                <Icon name="brain" size={18} color={theme.primary} />
                <Text style={styles.analysisHeader}>Yapay Zeka Analizi</Text>
            </View>
            <Text style={styles.analysisText}>{analysis.result}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ---- ANA EKRAN ----
export default function PremiumHistoryScreen(props: any) {
  const params = props.route?.params || {};
  let events: SessionEvent[] = [];
  try {
    events = params.events ? JSON.parse(params.events as string) : [];
  } catch {
    events = [];
  }

  return (
    <LinearGradient colors={theme.backgroundGradient} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Geçmişim</Text>
        <Text style={styles.subheader}>
          Seans dökümlerinizi ve zeka analizlerini keşfedin.
        </Text>
        
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="moon" size={54} color={theme.textSubtle} />
            <Text style={styles.emptyStateHeader}>Henüz Bir Anı Yok</Text>
            <Text style={styles.emptyStateText}>İlk seansınız tamamlandığında burada görünecek.</Text>
          </View>
        ) : (
          events.sort((a,b) => b.timestamp - a.timestamp).map((event) => <SessionCard key={event.id} event={event} />)
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
    paddingVertical: 40,
    paddingTop: 60,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 17,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 40,
  },
  // Kart Stilleri
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 97, 238, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  sessionType: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 13,
    color: theme.textSubtle,
    marginLeft: 6,
    fontWeight: '500',
  },
  // Mesaj Stilleri
  messagesContainer: {
    gap: 14,
  },
  bubbleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 16,
    lineHeight: 24,
  },
  aiText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  // Aksiyon ve Analiz Stilleri
  actionSection: {
    marginTop: 24,
  },
  analyzeBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  analysisBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.analysisBorder,
  },
  analysisHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisHeader: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.primary,
  },
  analysisText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 25,
  },
  // Boş Durum Stilleri
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateHeader: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.textLight,
    fontStyle: 'italic',
    padding: 10,
  }
});