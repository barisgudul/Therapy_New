// app/diary.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { analyzeSessionForMemory, generateDiaryNextQuestions, generateDiaryStart, mergeVaultData } from '../hooks/useGemini';
import { addJourneyLogEntry, AppEvent, canUserWriteNewDiary, deleteEventById, getEventsForLast, getUserVault, logEvent, updateUserVault } from '../utils/eventLogger';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function DiaryScreen() {
  const router = useRouter();
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [isViewingDiary, setIsViewingDiary] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<AppEvent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [step, setStep] = useState(0); // 0: İlk yazı, 1: 1. soru seti, 2: 2. soru seti, 3: 3. soru seti, 4: Tamamlama
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Tek bir loading state yeterli
  const [diaryEvents, setDiaryEvents] = useState<AppEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const modalPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadDiaryEvents();
  }, []);

  useEffect(() => {
    if (isSaving) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isSaving]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const loadDiaryEvents = async () => {
    try {
      const allEvents = await getEventsForLast(365); // last 1 year
      const diaryOnlyEvents = allEvents.filter(event => event.type === 'diary_entry');
      setDiaryEvents(diaryOnlyEvents);
    } catch (error) {
      console.error('Günlük olayları yüklenirken hata:', error);
      Alert.alert('Hata', 'Günlük olayları yüklenirken bir hata oluştu.');
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      text,
      isUser,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // İlk Adım: handleInitialEntry - Kullanıcı ilk metnini modal'dan gönderdiğinde çalışır.
  const handleInitialEntry = async () => {
    if (!currentInput.trim()) return;

    setIsLoading(true); // ActivityIndicator'ı tetikler
    addMessage(currentInput, true); // Kullanıcının ilk yazısını ekrana bas
    
    const { mood, questions } = await generateDiaryStart(currentInput);
    // Gelen mood'u bir state'te tutabiliriz, kaydederken kullanmak üzere.
    // setDiaryMood(mood); 

    setCurrentQuestions(questions); // AI'dan gelen 3 soruyu state'e ata
    setStep(1); // Bir sonraki adıma geç
    setCurrentInput(''); // Input'u temizle
    setIsLoading(false);
    handleModalClose(); // Modalı kapatıp, ana ekranda soru butonlarını göster
  };

  // Orta Adımlar: handleQuestionResponse - Kullanıcı bir soru seçip modal'dan cevap verdiğinde çalışır.
  const handleQuestionResponse = async () => {
    if (!currentInput.trim()) return;

    setIsLoading(true);
    // Seçilen soruyu ve kullanıcının cevabını ekrana bas
    addMessage(selectedQuestion, false); // Soruyu AI mesajı gibi göster
    addMessage(currentInput, true);     // Cevabı kullanıcı mesajı gibi göster

    if (step < 3) {
      // Bir sonraki soru setini oluştur
      const conversationHistory = [...messages, {text: currentInput, isUser: true, timestamp: 0}]
        .map(m => `${m.isUser ? 'Kullanıcı' : 'AI'}: ${m.text}`)
        .join('\n');
        
      const nextQuestions = await generateDiaryNextQuestions(conversationHistory);
      setCurrentQuestions(nextQuestions);
      setStep(prev => prev + 1);
    } else {
      // 3. soru da cevaplandı, tamamlama adımına geç.
      setCurrentQuestions([]);
      setStep(4);
    }

    setCurrentInput('');
    setSelectedQuestion('');
    setIsLoading(false);
    handleModalClose();
  };

  // Günlük kaydetme fonksiyonu
  const saveDiary = async () => {
    if (messages.length === 0 || isSaving) return;
    setSaveModalVisible(true);
    setIsSaving(true);
    
    // 1. HAM GÜNLÜĞÜ KAYDET
    // Artık messages dizisi tüm diyalogu içeriyor.
    const loggedEventId = await logEvent({
      type: 'diary_entry',
      mood: 'belirsiz', // Basit mood, daha sonra iyileştirilebilir
      data: { 
        messages: messages // Bu, kullanıcının tekrar okuması için.
      }
    });

    // 2. HASAT: Arka planda Kolektif Bilinç'i besle
    try {
      const fullTranscript = messages.map(m => `${m.isUser ? 'Kullanıcı' : 'AI'}: ${m.text}`).join('\n');
      
      // Bu zenginleştirilmiş metni işlemek için analyzeSessionForMemory kullanabiliriz.
      const memoryPieces = await analyzeSessionForMemory(fullTranscript); 

      if (memoryPieces) {
        const logEntry = `Bir günlük keşfi yapıldı. Ana tema: ${memoryPieces.log}`;
        await addJourneyLogEntry(logEntry);

        const currentVault = await getUserVault() || {};
        const newVault = mergeVaultData(currentVault, memoryPieces.vaultUpdate);
        await updateUserVault(newVault);
      }
    } catch (e) {
      console.error("Günlük sonrası hafıza işleme hatası:", e);
    }
    
    // 3. EKRANI TEMİZLE VE ÇIKIŞ YAP
    await loadDiaryEvents();
    setIsSaving(false);
    setSaveModalVisible(false);
    setIsWritingMode(false);
    setMessages([]);
    setCurrentInput('');
    setCurrentQuestions([]);
    setStep(0);
  };

  // Soru seçildiğinde
  const handleQuestionSelect = (question: string) => {
    setSelectedQuestion(question);
    setIsModalVisible(true);
    // Modal'ı yukarı konumlandır
    Animated.timing(modalPosition, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleModalClose = () => {
    // Modal'ı ortala
    Animated.timing(modalPosition, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  const startNewDiary = async () => {
    try {
      // Yeni, merkezi fonksiyonu çağır
      const { canWrite, message } = await canUserWriteNewDiary(); 
      
      if (!canWrite) {
        Alert.alert('Biraz Dinlenelim', message); // Başlığı daha empatik yapabiliriz
        return;
      }

      setIsWritingMode(true);
      setMessages([]);
      setCurrentInput('');
      setCurrentQuestions([]);
      setStep(0);
    } catch (error) {
      console.error('Yeni günlük başlatma hatası:', error);
      Alert.alert('Hata', 'Yeni günlük başlatılırken bir hata oluştu.');
    }
  };

  const viewDiary = (event: AppEvent) => {
    setSelectedDiary(event);
    setIsViewingDiary(true);
    setIsWritingMode(false);
  };

  const handleDeleteDiary = async (timestamp: number | undefined) => {
    if (!timestamp || !selectedDiary) return;

    Alert.alert(
      'Günlüğü Sil',
      'Bu günlüğü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventById(selectedDiary.id);
              await loadDiaryEvents(); // Listeyi yenile
              setSelectedDiary(null);
              setIsViewingDiary(false);
              Alert.alert('Başarılı', 'Günlük başarıyla silindi.');
            } catch (error) {
              console.error('Günlük silinirken hata:', error);
              Alert.alert('Hata', 'Günlük silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const renderDiaryList = () => (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>therapy<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.title}>Günlüklerim</Text>
        <Text style={styles.subtitle}>Duygularını ve düşüncelerini kaydet.</Text>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.diaryContainer}>
            {diaryEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconContainer}>
                  <LinearGradient
                    colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}} 
                    style={styles.emptyStateIconGradient}
                  >
                    <Ionicons name="journal-outline" size={48} color={Colors.light.tint} />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyStateText}>Henüz günlük yazmamışsın</Text>
                <Text style={styles.emptyStateSubtext}>Yeni bir günlük yazarak başla</Text>
              </View>
            ) : (
              diaryEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.diaryCard}
                  onPress={() => viewDiary(event)}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.diaryCardGradient}
                  >
                    <View style={styles.diaryCardHeader}>
                      <View style={styles.diaryCardDateContainer}>
                        <Ionicons name="calendar" size={20} color={Colors.light.tint} />
                        <Text style={styles.diaryDate}>
                          {new Date(event.timestamp).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                      <Text style={styles.diaryTime}>
                        {new Date(event.timestamp).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.diaryPreview}>
                      <Text style={styles.diaryPreviewText} numberOfLines={2}>
                        {event.data?.messages?.[0]?.text || 'Boş günlük'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.newDiaryButton}
        onPress={startNewDiary}
      >
        <LinearGradient
          colors={['#F8FAFF', '#FFFFFF']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.newDiaryButtonGradient}
        >
          <View style={styles.newDiaryButtonContent}>
            <View style={styles.newDiaryButtonIconCircle}>
              <Ionicons name="add" size={28} color={Colors.light.tint} />
            </View>
            <Text style={styles.newDiaryButtonText}>Yeni Günlük</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderDiaryView = () => (
    <View style={styles.diaryViewContainer}>
      <TouchableOpacity
        onPress={() => {
          setSelectedDiary(null);
          setIsViewingDiary(false);
        }} 
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteDiary(selectedDiary?.timestamp)}
      >
        <Ionicons name="trash-outline" size={24} color="#E53E3E" />
      </TouchableOpacity>

      <Text style={styles.diaryViewTitle}>Günlük</Text>

      <ScrollView style={styles.diaryViewScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.diaryContainer}>
          <View style={styles.writingPageSection}>
            <View style={styles.writingPageHeader}>
              <View style={styles.writingPageInfo}>
                <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                <Text style={styles.writingPageTitle}>Günlük Sayfası</Text>
              </View>
              <Text style={styles.writingPageDate}>
                {selectedDiary ? new Date(selectedDiary.timestamp).toLocaleDateString('tr-TR') : ''}
              </Text>
            </View>
            <View style={styles.writingPageContent}>
              {selectedDiary?.data?.messages?.map((message: any, index: number) => (
                <View key={index} style={styles.writingMessageBlock}>
                  <View style={styles.writingMessageHeader}>
                    <Ionicons 
                      name={message.isUser ? "person-circle" : "sparkles"} 
                      size={20} 
                      color={Colors.light.tint} 
                    />
                    <Text style={styles.writingMessageTitle}>
                      {message.isUser ? "Sen" : "AI Asistan"}
                    </Text>
                    <Text style={styles.writingMessageTime}>
                      {new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[
                    styles.writingMessageText,
                    !message.isUser && styles.writingAiMessageText
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
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.container}>
      <View style={styles.topBar}></View>

      <Text style={styles.headerTitle}>Yeni Günlük</Text>

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.diaryContainer}>
            <View style={styles.writingPageSection}>
              <View style={styles.writingPageHeader}>
                <View style={styles.writingPageInfo}>
                  <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                  <Text style={styles.writingPageTitle}>Günlük Sayfası</Text>
                </View>
                <Text style={styles.writingPageDate}>
                  {new Date().toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={styles.writingPageContent}>
                {messages.map((message, index) => (
                  <View key={index} style={styles.writingMessageBlock}>
                    <View style={styles.writingMessageHeader}>
                      <Ionicons 
                        name={message.isUser ? "person-circle" : "sparkles"} 
                        size={20} 
                        color={Colors.light.tint} 
                      />
                      <Text style={styles.writingMessageTitle}>
                        {message.isUser ? "Sen" : "AI Asistan"}
                      </Text>
                      <Text style={styles.writingMessageTime}>
                        {new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[
                      styles.writingMessageText,
                      !message.isUser && styles.writingAiMessageText
                    ]}>
                      {message.text}
                    </Text>
                  </View>
                ))}

                {isLoading && (
                  <View style={styles.writingAnalyzingContainer}>
                    <ActivityIndicator color={Colors.light.tint} />
                    <Text style={styles.writingAnalyzingText}>Düşüncelerin analiz ediliyor...</Text>
                  </View>
                )}

                {messages.length === 0 && (
                  <TouchableOpacity 
                    style={styles.writingDiaryInputPlaceholder}
                    onPress={() => setIsModalVisible(true)}
                  >
                    <Text style={styles.writingDiaryInputPlaceholderText}>Düşüncelerini yazmaya başla...</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {messages.length > 0 && step === 4 && (
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveDiary}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F8FAFF', '#FFFFFF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.saveButtonGradient}
                >
                  <View style={styles.saveButtonContent}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={Colors.light.tint} />
                    <Text style={styles.saveButtonText}>Günlüğü Tamamla ve Kaydet</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.diaryContainer}>
            {currentQuestions.length > 0 && step > 0 && step < 4 && (
              <View style={styles.writingQuestionsContainer}>
                <Text style={styles.writingQuestionsTitle}>Şimdi bunlardan birini seçerek devam edelim...</Text>
                {currentQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.writingQuestionButton}
                    onPress={() => handleQuestionSelect(question)}
                  >
                    <Text style={styles.writingQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Ionicons name="document-text" size={24} color={Colors.light.tint} />
                  <Text style={styles.modalTitle}>Yeni Günlük</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={handleModalClose}
                >
                  <Ionicons name="close" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {selectedQuestion ? (
                  <View style={styles.selectedQuestionContainer}>
                    <View style={styles.selectedQuestionHeader}>
                      <Ionicons name="sparkles" size={20} color={Colors.light.tint} />
                      <Text style={styles.selectedQuestionTitle}>AI Asistan Sorusu</Text>
                    </View>
                    <Text style={styles.selectedQuestionText}>{selectedQuestion}</Text>
                  </View>
                ) : null}
                <TextInput
                  style={[styles.modalInput, selectedQuestion && styles.modalInputWithQuestion]}
                  placeholder=""
                  value={currentInput}
                  onChangeText={setCurrentInput}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                  blurOnSubmit={true}
                  onBlur={() => Keyboard.dismiss()}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, (!currentInput.trim() || step >= 4) && styles.buttonDisabled]}
                  onPress={() => {
                    if (step === 0) {
                      handleInitialEntry();
                    } else {
                      handleQuestionResponse();
                    }
                  }}
                  disabled={!currentInput.trim() || isLoading || step >= 4}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>
                      {step === 0 ? 'Günlüğü Başlat' : 'Cevabı Gönder'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
  header: {
    alignItems: 'center',
    paddingTop: 120,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  writingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 30,
  },
  writingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  writingBack: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  logo: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.95,
    textAlign: 'center',
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: '900',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  diaryContainer: {
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  emptyStateIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    padding: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  diaryCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  diaryCardGradient: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  diaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  diaryCardDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diaryDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  diaryTime: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  diaryPreview: {
    backgroundColor: 'rgba(248,250,255,0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  diaryPreviewText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  newDiaryButton: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 180,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
    transform: [{ scale: 1.05 }],
  },
  newDiaryButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDiaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDiaryButtonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.4)',
  },
  newDiaryButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  diaryViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(249,250,251,0.95)',
  },
  deleteButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  saveButtonContainer: {
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  saveButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  writingPageSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  writingPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(93,161,217,0.1)',
    paddingBottom: 20,
  },
  writingPageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  writingPageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingPageDate: {
    fontSize: 14,
    color: '#5D6D7E',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  writingPageContent: {
    backgroundColor: 'rgba(248,250,255,0.8)',
    borderRadius: 20,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  writingInput: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C3E50',
    letterSpacing: -0.2,
    textAlignVertical: 'top',
    minHeight: 200,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  writingSendButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.light.tint,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  writingQuestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginTop: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  writingQuestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  writingQuestionButton: {
    backgroundColor: 'rgba(248,250,255,0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  writingQuestionText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  writingDiaryInputPlaceholder: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  writingDiaryInputPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(93,161,217,0.1)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  modalBody: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 20,
    minHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 260,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93,161,217,0.1)',
  },
  modalButton: {
    width: 180,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
    transform: [{ scale: 1.05 }],
  },
  modalButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  selectedQuestionContainer: {
    backgroundColor: 'rgba(93,161,217,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  selectedQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedQuestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 8,
  },
  selectedQuestionText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  modalInputWithQuestion: {
    minHeight: 200,
  },
  questionsContainer: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  questionButton: {
    backgroundColor: 'rgba(248,250,255,0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  questionText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  diaryInputPlaceholder: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  diaryInputPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  writingGradient: {
    flex: 1,
  },
  diaryViewTitle: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 8,
  },
  diaryViewScrollView: {
    flex: 1,
    marginTop: 70,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  brand: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 2,
    opacity: 0.95,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  userMessage: {
    backgroundColor: 'rgba(248,250,255,0.8)',
  },
  aiMessage: {
    backgroundColor: 'rgba(248,250,255,0.8)',
  },
  messageText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
  },
  writingAnalyzingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  writingAnalyzingText: {
    marginTop: 16,
    color: '#5D6D7E',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  writingMessageBlock: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(93,161,217,0.1)',
  },
  writingMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  writingMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  writingMessageTime: {
    fontSize: 14,
    color: '#5D6D7E',
    marginLeft: 'auto',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  writingMessageText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C3E50',
    letterSpacing: -0.2,
  },
  writingAiMessageText: {
    color: '#5D6D7E',
    fontStyle: 'italic',
  },
}); 

