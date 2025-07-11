// app/sessions/text_session.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import SessionTimer from '../../components/SessionTimer';
import { Colors } from '../../constants/Colors';
import {
  analyzeSessionForMemory,
  generateCumulativeSummary,
  generateTherapistReply,
  mergeVaultData,
} from '../../hooks/useGemini';
import {
  addJourneyLogEntry,
  getUserVault,
  logEvent,
  updateUserVault,
} from '../../utils/eventLogger';
import { avatars } from '../therapy/avatar';

const therapistImages: Record<string, any> = {
  therapist1: require('../../assets/Terapist_1.jpg'),
  therapist2: require('../../assets/Terapist_2.jpg'),
  therapist3: require('../../assets/Terapist_3.jpg'),
  coach1: require('../../assets/coach-can.jpg'),
};

export default function TextSessionScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  // therapistId'nin yanına mood'u da ekle
  const { therapistId, mood } = useLocalSearchParams<{ therapistId: string; mood?: string; }>();
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [intraSessionSummary, setIntraSessionSummary] = useState('');
  const messageCountForSummary = useRef(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);

  // Typing animation state
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDots = () => {
    Animated.loop(
      Animated.stagger(150, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  useEffect(() => {
    setTimeout(() => {
      setMessages([
        { sender: 'ai', text: "Merhaba, ben buradayım. Hazır olduğunda seninle konuşmaya hazırım." }
      ]);
    }, 500);
  }, []);

  useEffect(() => {
    if (isTyping) animateDots();
  }, [isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const handleFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Move onBackPress and handleSessionEnd to top-level
  const handleSessionEnd = async () => {
    // Önce seansın ham kaydını her zamanki gibi tut. Bu, transkriptler için gerekli.
    if (messages.length > 2) {
      await logEvent({
        type: 'text_session',
        mood: currentMood,
        data: { therapistId, messages }
      });
    } else {
      router.replace('/feel/after_feeling');
      return;
    }

    // --- MAKRO HAFIZA İŞLEME RİTÜELİ ---
    // Arka planda çalışması için bu bloğu bir try-catch içine alabiliriz.
    try {
      console.log("Hafıza işleme ritüeli başlıyor...");
      const fullTranscript = messages.map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`).join('\n');

      // 1. Bilinci Damıt: AI'dan hafıza parçacıklarını iste
      const memoryPieces = await analyzeSessionForMemory(fullTranscript);
      if (!memoryPieces) throw new Error("Hafıza parçacıkları oluşturulamadı.");

      // 2. Seyir Defterine Not Düş
      await addJourneyLogEntry(memoryPieces.log);

      // 3. Kasayı Güncelle
      const currentVault = await getUserVault() || {};
      const newVault = mergeVaultData(currentVault, memoryPieces.vaultUpdate);
      await updateUserVault(newVault);

      console.log("Hafıza işleme ritüeli başarıyla tamamlandı.");
    } catch (error) {
      console.error("Seans sonu hafıza işleme hatası:", error);
      // Bu hata, kullanıcının akışını engellememeli.
    }
    
    // Kullanıcıyı bir sonraki ekrana yönlendir.
    router.replace('/feel/after_feeling');
  };

  const onBackPress = () => {
    Alert.alert(
      'Seansı Sonlandır',
      'Seansı sonlandırmak istediğinizden emin misiniz? Sohbetiniz kaydedilecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: async () => {
            await handleSessionEnd();
          },
        },
      ]
    );
    return true;
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [messages, router, therapistId, currentMood]);

  // Mood ve terapist bilgisini parametrelerden alıp state'e ata
  useEffect(() => {
    // 1. Mood'u parametreden alıp state'e ata
    if (mood) {
        setCurrentMood(mood);
    }

    // 2. Terapist bilgisini merkezi 'avatars' dizisinden ID ile bul
    if (therapistId) {
        const therapist = avatars.find(a => a.imageId === therapistId);
        setSelectedTherapist(therapist);
    } else {
        // ID gelmezse bir varsayılan ata (güvenlik önlemi)
        setSelectedTherapist(avatars[0]); 
    }
  }, [therapistId, mood]);

  // text_session.tsx içindeki sendMessage fonksiyonunu bununla değiştirin.
const sendMessage = async () => {
  const trimmedInput = input.trim();
  if (!trimmedInput || isTyping) return;

  setInput(''); // Input'u hemen temizle

  const userMessage = { sender: 'user' as const, text: trimmedInput };
  const newMessagesForUI = [...messages, userMessage];
  
  // UI'ı anında kullanıcı mesajıyla güncelle
  setMessages(newMessagesForUI);
  setIsTyping(true);

  // --- MİKRO YÖNETİM (SEANS İÇİ ÖZETLEME) ---
  let currentChatHistoryForPrompt = '';
  const summaryTrigger = 7; // Her 7 mesajda bir

  // Mevcut seans içindeki tüm mesajlar AI'a gönderilmeden önce özetleniyor
  if (newMessagesForUI.length > messageCountForSummary.current + summaryTrigger) {
      const conversationChunk = newMessagesForUI
          .slice(messageCountForSummary.current)
          .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
          .join('\n');
      
      const updatedSummary = await generateCumulativeSummary(intraSessionSummary, conversationChunk);
      setIntraSessionSummary(updatedSummary);
      messageCountForSummary.current = newMessagesForUI.length;
      currentChatHistoryForPrompt = updatedSummary; // Prompt'a sadece güncel özete gönder
  } else {
      // Henüz özetleme zamanı gelmediyse, önceki özete son mesajları ekle
      const recentMessages = newMessagesForUI
          .slice(messageCountForSummary.current)
          .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
          .join('\n');
      currentChatHistoryForPrompt = `${intraSessionSummary}\n${recentMessages}`;
  }
  
  // --- AI YANITINI AL ---
  try {
    const validTherapistId = (therapistId === "therapist1" || therapistId === "therapist3" || therapistId === "coach1") 
      ? therapistId as "therapist1" | "therapist3" | "coach1" 
      : "therapist1";
    
    const aiReplyText = await generateTherapistReply(
      validTherapistId,
      trimmedInput,
      currentChatHistoryForPrompt
    );

    const aiMessage = { 
      sender: 'ai' as const, 
      text: aiReplyText || "Kusura bakma, bir yanıt oluşturamadım."
    };
    
    // Şimdi de AI'ın yanıtını ekleyerek UI'ı tekrar güncelle
    setMessages(prev => [...prev, aiMessage]);

  } catch (err) {
    console.error("generateTherapistReply hatası:", err);
    const errorMessage = { 
      sender: 'ai' as const, 
      text: "Üzgünüm, bir sorunla karşılaştım."
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsTyping(false);
  }
};

  return (
    <LinearGradient colors={isDark ? ['#232526', '#414345'] : ['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      <TouchableOpacity onPress={onBackPress} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : Colors.light.tint} />
      </TouchableOpacity>

      {/* Session Timer */}
      <SessionTimer onSessionEnd={handleSessionEnd} />

      {/* Terapist avatar ve adı */}
      <View style={styles.therapistHeaderRow}>
        <View style={styles.avatarGradientBox}>
          <LinearGradient colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 1}} 
              style={styles.avatarGradient}>
            <Image 
              source={selectedTherapist?.thumbnail || therapistImages[therapistId] || therapistImages.therapist1} 
              style={styles.therapistAvatarXL}
            />
          </LinearGradient>
        </View>
        <View style={styles.therapistInfoBoxRow}>
          <Text style={[styles.therapistNameRow, { color: isDark ? '#fff' : Colors.light.tint }]}> 
            {selectedTherapist?.name || 'Terapist'}
          </Text>
          <Text style={[styles.therapistTitleRow, { color: isDark ? '#fff' : '#5D6D7E' }]}>
            {selectedTherapist?.title}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
      >
        <View style={styles.content}>
          {/* MESSAGES */}
          <FlatList
            ref={flatListRef}
            data={isTyping ? [...messages, { sender: 'ai', text: '...' }] : messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => {
              if (item.text === '...') {
                return (
                  <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 6 }]}>
                    {[dot1, dot2, dot3].map((dot, i) => (
                      <Animated.Text
                        key={i}
                        style={[
                          styles.bubbleText,
                          {
                            opacity: dot,
                            transform: [
                              {
                                scale: dot.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.7, 1.2],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        ●
                      </Animated.Text>
                    ))}
                  </View>
                );
              }
              const isAI = item.sender === 'ai';
              return (
                <View
                  key={index}
                  style={[
                    styles.bubble,
                    isAI ? styles.aiBubble : styles.userBubble,
                  ]}
                >
                  <Text style={styles.bubbleText}>{item.text}</Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {/* INPUT FIELD */}
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Düşüncelerini paylaş..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              editable={!isTyping}
              onFocus={handleFocus}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
              returnKeyType="default"
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]} 
              disabled={isTyping || !input.trim()}
            >
              <LinearGradient
                colors={['#F8FAFF', '#FFFFFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color={Colors.light.tint} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 20,
    zIndex: 100,
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
  },
  content: {
    flex: 1,
    marginTop: 130,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  messagesContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  messageBlock: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    maxWidth: '85%',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  messageText: {
    color: '#2C3E50',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  aiMessageText: {
    color: '#2C3E50',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  typingDots: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9CA3AF',
    marginLeft: 4,
  },
  typingDotsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messages: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubble: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    maxWidth: '90%',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  bubbleText: {
    color: '#2C3E50',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.2)',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistHeaderRow: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 32,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  therapistInfoBoxRow: {
    marginLeft: 12,
    alignItems: 'flex-start',
    maxWidth: '60%',
  },
  therapistNameRow: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  therapistTitleRow: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    opacity: 0.8,
  },
  avatarGradientBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2.5,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  therapistAvatarXL: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
});