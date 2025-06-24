import * as React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeDiaryEntry } from '../hooks/useGemini';

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

export default function DenemScreen(props: any) {
  const params = props.route?.params || {};
  let events: SessionEvent[] = [];
  try {
    events = params.events ? JSON.parse(params.events as string) : [];
  } catch {
    events = [];
  }

  // Her transcript için ayrı analiz state'i
  const [analyses, setAnalyses] = React.useState<{ [id: string]: { loading: boolean; result: string | null } }>({});

  const handleAnalyze = async (event: SessionEvent) => {
    setAnalyses(prev => ({ ...prev, [event.id]: { loading: true, result: null } }));
    try {
      const fullText = event.data.messages.map(m => m.text).join('\n');
      const result = await analyzeDiaryEntry(fullText);
      setAnalyses(prev => ({ ...prev, [event.id]: { loading: false, result: result.feedback } }));
    } catch (e) {
      setAnalyses(prev => ({ ...prev, [event.id]: { loading: false, result: 'AI analizi sırasında hata oluştu.' } }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Seans Transcriptleri</Text>
      {events.length === 0 ? (
        <Text style={styles.empty}>Hiç transcript bulunamadı.</Text>
      ) : (
        events.map((event, idx) => (
          <View key={event.id} style={styles.transcriptBox}>
            <Text style={styles.sessionInfo}>
              {new Date(event.timestamp).toLocaleString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {'  |  '}
              {event.type === 'text_session' ? 'Yazılı Seans' : event.type === 'voice_session' ? 'Sesli Seans' : 'Görüntülü Seans'}
              {event.mood ? `  |  Ruh Hali: ${event.mood}` : ''}
            </Text>
            {event.data?.messages?.length ? (
              event.data.messages.map((m, i) => (
                <Text key={i} style={m.sender === 'user' ? styles.user : styles.ai}>
                  {m.sender === 'user' ? 'Danışan' : 'Terapist'}: {m.text}
                </Text>
              ))
            ) : (
              <Text style={styles.empty}>Transcript yok.</Text>
            )}
            <TouchableOpacity style={styles.analyzeBtn} onPress={() => handleAnalyze(event)} disabled={analyses[event.id]?.loading}>
              <Text style={styles.analyzeBtnText}>{analyses[event.id]?.loading ? 'Analiz Ediliyor...' : 'Duygu Analizi Yap'}</Text>
            </TouchableOpacity>
            {analyses[event.id]?.loading && <ActivityIndicator style={{ marginTop: 10 }} />}
            {analyses[event.id]?.result && (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisHeader}>AI Duygu Analizi</Text>
                <Text style={styles.analysisText}>{analyses[event.id]?.result}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8FAFF',
    minHeight: '100%',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#3B82F6',
    textAlign: 'center',
  },
  transcriptBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionInfo: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  user: {
    color: '#222',
    marginBottom: 6,
    fontWeight: '500',
  },
  ai: {
    color: '#4988e5',
    marginBottom: 6,
    fontWeight: '500',
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  analyzeBtn: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  analysisBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 6,
  },
  analysisText: {
    color: '#222',
    fontSize: 14,
  },
});
