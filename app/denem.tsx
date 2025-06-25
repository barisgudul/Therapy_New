import * as React from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // İkon kütüphanesi
import { analyzeDiaryEntry } from '../hooks/useGemini';

// Android'de LayoutAnimation'ı etkinleştirmek için
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- TASARIM TEMASI ----
const theme = {
  background: '#F8F9FE', // Çok açık, soğuk bir arka plan
  card: '#FFFFFF',
  primary: '#5A67D8',     // Sakin ve güvenilir bir mor/mavi tonu
  primaryLight: 'rgba(90, 103, 216, 0.1)',
  text: '#2D3748',        // Koyu gri (saf siyahtan daha yumuşak)
  textLight: '#718096',   // Daha açık tonlu metinler için
  userBubble: '#E2E8F0',  // Kullanıcı mesaj balonu
  aiBubble: 'rgba(90, 103, 216, 0.15)', // Terapist mesaj balonu
  shadow: '#A0AEC0',
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
    case 'text_session':
      return 'edit-3';
    case 'voice_session':
      return 'mic';
    case 'video_session':
      return 'video';
    default:
      return 'message-circle';
  }
};

// Mesaj Baloncuğu Bileşeni
const MessageBubble: React.FC<{ message: { sender: string; text: string } }> = ({ message }) => {
  const isUser = message.sender === 'user';
  return (
    <View style={[
      styles.bubbleContainer,
      isUser ? styles.userBubbleContainer : styles.aiBubbleContainer,
    ]}>
      <Text style={isUser ? styles.userText : styles.aiText}>
        {message.text}
      </Text>
    </View>
  );
};

// Seans Kartı Bileşeni
const SessionCard: React.FC<{ event: SessionEvent }> = ({ event }) => {
  const [analysis, setAnalysis] = React.useState<{ loading: boolean; result: string | null }>({
    loading: false,
    result: null,
  });

  const handleAnalyze = async () => {
    setAnalysis({ loading: true, result: null });
    try {
      const fullText = event.data.messages.map(m => m.text).join('\n\n');
      const result = await analyzeDiaryEntry(fullText);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAnalysis({ loading: false, result: result.feedback });
    } catch (e) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAnalysis({ loading: false, result: 'AI analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
    }
  };

  return (
    <View style={styles.card}>
      {/* Kart Başlığı */}
      <View style={styles.cardHeader}>
        <View style={styles.sessionTypeContainer}>
          <Icon name={getSessionIcon(event.type)} size={16} color={theme.primary} />
          <Text style={styles.sessionType}>
            {event.type === 'text_session' ? 'Yazılı Seans' : event.type === 'voice_session' ? 'Sesli Seans' : 'Görüntülü Seans'}
          </Text>
        </View>
        <Text style={styles.sessionDate}>
          {new Date(event.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </Text>
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
          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={analysis.loading}>
            {analysis.loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="sparkles" size={18} color="#fff" />
                <Text style={styles.analyzeBtnText}>AI ile Analiz Et</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {analysis.result && (
          <View style={styles.analysisBox}>
            <Text style={styles.analysisHeader}>Yapay Zeka Değerlendirmesi</Text>
            <Text style={styles.analysisText}>{analysis.result}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ---- ANA EKRAN ----
export default function ElegantHistoryScreen(props: any) {
  const params = props.route?.params || {};
  let events: SessionEvent[] = [];
  try {
    events = params.events ? JSON.parse(params.events as string) : [];
  } catch {
    events = [];
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Seans Geçmişim</Text>
      <Text style={styles.subheader}>
        Geçmiş seans dökümlerinizi ve yapay zeka analizlerini burada bulabilirsiniz.
      </Text>
      
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="archive" size={48} color={theme.textLight} />
          <Text style={styles.emptyStateText}>Henüz kayıtlı bir seansınız yok.</Text>
        </View>
      ) : (
        events.sort((a,b) => b.timestamp - a.timestamp).map((event) => <SessionCard key={event.id} event={event} />)
      )}
    </ScrollView>
  );
}

// ---- STİLLER (Styles) ----
const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.background,
  },
  container: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: theme.textLight,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  // Kart Stilleri
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionType: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  sessionDate: {
    fontSize: 13,
    color: theme.textLight,
  },
  // Mesaj Stilleri
  messagesContainer: {
    gap: 12, // Baloncuklar arası boşluk
  },
  bubbleContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    maxWidth: '85%',
  },
  userBubbleContainer: {
    backgroundColor: theme.userBubble,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubbleContainer: {
    backgroundColor: theme.aiBubble,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: theme.text,
    fontSize: 15,
  },
  aiText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  // Aksiyon ve Analiz Stilleri
  actionSection: {
    marginTop: 20,
  },
  analyzeBtn: {
    backgroundColor: theme.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  analysisBox: {
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  analysisHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 8,
  },
  analysisText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 22, // Okunabilirliği artırmak için satır yüksekliği
  },
  // Boş Durum Stilleri
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    opacity: 0.7,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 17,
    color: theme.textLight,
  },
  emptyText: {
    color: theme.textLight,
    fontStyle: 'italic',
  }
});