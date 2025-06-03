import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { analyzeDiaryEntry } from '../hooks/useGemini';
import { checkAndUpdateBadges } from '../utils/badges';
import { deleteDiaryEntry, DiaryEntry, getDiaryEntries, saveDiaryEntry } from '../utils/diaryStorage';
import { saveSessionData } from '../utils/sessionStorage';

export default function DiaryScreen() {
  const router = useRouter();
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [isViewingDiary, setIsViewingDiary] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    loadDiaryEntries();
  }, []);

  const loadDiaryEntries = async () => {
    try {
      const entries = await getDiaryEntries();
      // Günlükleri tarihe göre sırala (en yeniden en eskiye)
      const sortedEntries = entries.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setDiaryEntries(sortedEntries);
    } catch (error) {
      console.error('Günlükler yüklenirken hata:', error);
      Alert.alert('Hata', 'Günlükler yüklenirken bir hata oluştu.');
    }
  };

  // AI analiz fonksiyonu
  const analyzeDiary = async () => {
    if (!currentInput.trim() || analysisCount >= 3) return;
    
    setIsAnalyzing(true);
    try {
      // Kullanıcı mesajını ekle
      setMessages(prev => [...prev, { text: currentInput, isUser: true }]);
      
      const analysis = await analyzeDiaryEntry(currentInput);
      
      // AI yanıtını ekle
      setMessages(prev => [...prev, { text: analysis.feedback, isUser: false }]);
      
      setSuggestedQuestions(analysis.questions);
      setAnalysisCount(prev => prev + 1);
      setCurrentInput(''); // Input'u temizle
    } catch (error) {
      console.error('Analiz hatası:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Günlük kaydetme fonksiyonu
  const saveDiary = async () => {
    if (messages.length === 0) return;
    
    try {
      const diaryEntry = {
        messages: messages,
        date: new Date().toISOString(),
      };
      
      // Günlüğü kaydet
      await saveDiaryEntry(diaryEntry);
      
      // AI özeti oluştur
      const userMessages = messages
        .filter(msg => msg.isUser)
        .map(msg => msg.text)
        .join('\n');
      
      const analysis = await analyzeDiaryEntry(userMessages);
      
      // Session verilerini kaydet
      await saveSessionData({
        date: new Date().toISOString(),
        type: 'diary',
        content: userMessages,
        summary: analysis.feedback,
        mood: analysis.mood || 'neutral',
        tags: analysis.tags || [],
      });
      
      // Rozet kontrolü
      // Tüm günlük girdilerini say
      const diaryEntriesCount = await getDiaryEntries().then(entries => entries.length);
      
      // AI destekli günlük rozet kontrolü
      await checkAndUpdateBadges('diary', {
        aiDiaryCompleted: diaryEntriesCount,
        diaryAnalysis: analysisCount
      });
      
      // AI özet rozetlerini kontrol et
      await checkAndUpdateBadges('ai', {
        aiSummaries: diaryEntriesCount
      });
      
      await loadDiaryEntries(); // Günlükleri yeniden yükle
      Alert.alert('Başarılı', 'Günlük kaydınız ve AI özeti oluşturuldu.');
      
      // Yazma modundan çık
      setIsWritingMode(false);
      setMessages([]);
      setCurrentInput('');
      setSuggestedQuestions([]);
      setAnalysisCount(0);
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      Alert.alert('Hata', 'Günlük kaydedilirken bir hata oluştu.');
    }
  };

  // Soru seçildiğinde
  const handleQuestionSelect = (question: string) => {
    // Soruyu direkt olarak AI yanıtı olarak ekle
    setMessages(prev => [...prev, { text: question, isUser: false }]);
    setSuggestedQuestions([]);
  };

  const startNewDiary = async () => {
    try {
      // Son günlük kaydını kontrol et
      const entries = await getDiaryEntries();
      if (entries.length > 0) {
        const lastEntry = entries[0]; // En son kayıt
        const lastEntryDate = new Date(lastEntry.date);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 18) {
          const remainingHours = Math.ceil(18 - hoursDiff);
          Alert.alert(
            'Yeni Günlük',
            `Bir sonraki günlüğü ${remainingHours} saat sonra yazabilirsin.`,
            [{ text: 'Tamam' }]
          );
          return;
        }
      }

      setIsWritingMode(true);
      setIsViewingDiary(false);
      setSelectedDiary(null);
      setMessages([]);
      setCurrentInput('');
      setSuggestedQuestions([]);
      setAnalysisCount(0);
    } catch (error) {
      console.error('Günlük başlatma hatası:', error);
      Alert.alert('Hata', 'Günlük başlatılırken bir hata oluştu.');
    }
  };

  const viewDiary = (diary: DiaryEntry) => {
    setSelectedDiary(diary);
    setIsViewingDiary(true);
    setIsWritingMode(false);
  };

  const renderDiaryList = () => (
    <View style={styles.diaryListContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Günlüklerim</Text>
        <TouchableOpacity
          style={styles.newDiaryButton}
          onPress={startNewDiary}
        >
          <Ionicons name="add-circle" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.diaryContainer}>
          {diaryEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="journal-outline" size={48} color={Colors.light.tint} />
              <Text style={styles.emptyStateText}>Henüz günlük yazmamışsın</Text>
              <Text style={styles.emptyStateSubtext}>Yeni bir günlük yazarak başla</Text>
            </View>
          ) : (
            diaryEntries.map((entry, index) => (
              <TouchableOpacity
                key={index}
                style={styles.diaryCard}
                onPress={() => viewDiary(entry)}
              >
                <View style={styles.diaryCardHeader}>
                  <Text style={styles.diaryDate}>
                    {new Date(entry.date).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.diaryTime}>
                    {new Date(entry.date).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={styles.diaryPreview}>
                  <Text style={styles.diaryPreviewText} numberOfLines={2}>
                    {entry.messages[0]?.text || 'Boş günlük'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderDiaryView = () => (
    <View style={styles.diaryViewContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsViewingDiary(false)} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Günlük Detayı</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Günlüğü Sil',
              'Bu günlüğü silmek istediğinizden emin misiniz?',
              [
                {
                  text: 'İptal',
                  style: 'cancel'
                },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (selectedDiary) {
                        await deleteDiaryEntry(selectedDiary.date);
                        await loadDiaryEntries();
                        setIsViewingDiary(false);
                        Alert.alert('Başarılı', 'Günlük başarıyla silindi.');
                      }
                    } catch (error) {
                      console.error('Silme hatası:', error);
                      Alert.alert('Hata', 'Günlük silinirken bir hata oluştu.');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.diaryContainer}>
          <View style={styles.pageSection}>
            <View style={styles.pageHeader}>
              <View style={styles.pageInfo}>
                <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                <Text style={styles.pageTitle}>Günlük Sayfası</Text>
              </View>
              <Text style={styles.pageDate}>
                {selectedDiary && new Date(selectedDiary.date).toLocaleDateString('tr-TR')}
              </Text>
            </View>
            <View style={styles.pageContent}>
              {selectedDiary?.messages.map((message, index) => (
                <View key={index} style={styles.messageBlock}>
                  <View style={styles.messageHeader}>
                    <Ionicons 
                      name={message.isUser ? "person-circle" : "sparkles"} 
                      size={20} 
                      color={Colors.light.tint} 
                    />
                    <Text style={styles.messageTitle}>
                      {message.isUser ? "Sen" : "AI Asistan"}
                    </Text>
                    <Text style={styles.messageTime}>
                      {new Date(selectedDiary.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[
                    styles.messageText,
                    !message.isUser && styles.aiMessageText
                  ]}>
                    {message.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderWritingMode = () => (
    <LinearGradient colors={['#FFE5F1', '#E0ECFD']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsWritingMode(false)} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Destekli Günlük</Text>
        <TouchableOpacity
          style={[styles.saveButton, messages.length === 0 && styles.buttonDisabled]}
          onPress={saveDiary}
          disabled={messages.length === 0}
        >
          <Ionicons name="save" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.diaryContainer}>
            <View style={styles.pageSection}>
              <View style={styles.pageHeader}>
                <View style={styles.pageInfo}>
                  <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                  <Text style={styles.pageTitle}>Günlük Sayfası</Text>
                </View>
                <Text style={styles.pageDate}>
                  {new Date().toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={styles.pageContent}>
                {messages.map((message, index) => (
                  <View key={index} style={styles.messageBlock}>
                    <View style={styles.messageHeader}>
                      <Ionicons 
                        name={message.isUser ? "person-circle" : "sparkles"} 
                        size={20} 
                        color={Colors.light.tint} 
                      />
                      <Text style={styles.messageTitle}>
                        {message.isUser ? "Sen" : "AI Asistan"}
                      </Text>
                      <Text style={styles.messageTime}>
                        {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[
                      styles.messageText,
                      !message.isUser && styles.aiMessageText
                    ]}>
                      {message.text}
                    </Text>
                  </View>
                ))}

                {isAnalyzing && (
                  <View style={styles.analyzingContainer}>
                    <ActivityIndicator color={Colors.light.tint} />
                    <Text style={styles.analyzingText}>Düşüncelerin analiz ediliyor...</Text>
                  </View>
                )}
              </View>
            </View>

            {suggestedQuestions.length > 0 && (
              <View style={styles.questionsContainer}>
                <Text style={styles.questionsTitle}>Düşünmek İster misin?</Text>
                {suggestedQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.questionButton}
                    onPress={() => handleQuestionSelect(question)}
                  >
                    <Text style={styles.questionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Sayfana yazmaya başla..."
              value={currentInput}
              onChangeText={setCurrentInput}
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              style={[styles.writeButton, (!currentInput.trim() || analysisCount >= 3) && styles.buttonDisabled]}
              onPress={analyzeDiary}
              disabled={!currentInput.trim() || isAnalyzing || analysisCount >= 3}
            >
              <Ionicons name="create" size={24} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );

  if (isViewingDiary) {
    return renderDiaryView();
  }

  return isWritingMode ? renderWritingMode() : renderDiaryList();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  diaryListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FF',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  diaryContainer: {
    padding: 16,
  },
  pageSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FF',
    paddingBottom: 20,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },
  pageDate: {
    fontSize: 14,
    color: '#5D6D7E',
    fontWeight: '500',
  },
  pageContent: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 24,
    minHeight: 300,
  },
  messageBlock: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FF',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },
  messageTime: {
    fontSize: 14,
    color: '#5D6D7E',
    marginLeft: 'auto',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C3E50',
  },
  aiMessageText: {
    color: '#5D6D7E',
    fontStyle: 'italic',
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F4FF',
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: '#2C3E50',
  },
  writeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  analyzingText: {
    marginTop: 16,
    color: '#5D6D7E',
    fontSize: 14,
    fontWeight: '500',
  },
  questionsContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 20,
  },
  questionButton: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
    lineHeight: 22,
  },
  diaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  diaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  diaryDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  diaryTime: {
    fontSize: 14,
    color: '#5D6D7E',
    fontWeight: '500',
  },
  diaryPreview: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 20,
  },
  diaryPreviewText: {
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#5D6D7E',
    marginTop: 12,
    fontWeight: '500',
  },
  diaryViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  newDiaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE5F1',
  },
}); 
