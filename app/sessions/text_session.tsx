// app/sessions/text_session.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import {
  ActivityIndicator,
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
import { PremiumGate } from '../../components/PremiumGate';
import SessionTimer from '../../components/SessionTimer';
import { Colors } from '../../constants/Colors';
import { ALL_THERAPISTS, getTherapistById } from '../../data/therapists';
import { useFeatureAccess } from '../../hooks/useSubscription';
import { incrementFeatureUsage } from '../../services/api.service';
import { EventPayload } from '../../services/event.service';
import { processUserMessage } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';


export default function TextSessionScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  // therapistId'nin yanına mood'u da ekle
  const { therapistId, mood } = useLocalSearchParams<{ therapistId: string; mood?: string; }>();
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false); // YENİ: Seans sonlandırma kilidi
  const [isSaving, setIsSaving] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [intraSessionSummary, setIntraSessionSummary] = useState('');
  const messageCountForSummary = useRef(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);

  // Feature Access Hook
  const { can_use, loading, refresh, used_count, limit_count } = useFeatureAccess('text_sessions');

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
  const handleSessionEnd = useCallback(() => {
    // YENİ: Eğer zaten sonlandırma işlemi başladıysa, tekrar çalıştırma
    if (isEnding) return;
    setIsEnding(true); // Kilidi aktif et

    // Önce seansın ham kaydını her zamanki gibi tut. Bu, transkriptler için gerekli.
    if (messages.length > 2) {
      // Sadece Orkestratör'ü bilgilendir. logEvent yok!
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const sessionEndPayload: EventPayload = {
            type: 'text_session',
            data: {
              therapistId,
              initialMood: mood,
              finalMood: currentMood,
              transcript: messages.map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`).join('\n'),
              messages,
              isSessionEnd: true
            }
          };
          // Bu fonksiyon artık arka planda çalışıyor, await'e gerek yok.
          processUserMessage(user.id, sessionEndPayload);
          // Kullanım sayısını artır
          incrementFeatureUsage('text_sessions');
          console.log('✅ [USAGE] text_sessions kullanımı başarıyla artırıldı.');
        }
      });
    }

    // Kullanıcıyı ANINDA bir sonraki ekrana yönlendir.
    router.replace('/feel/after_feeling');
  }, [isEnding, messages, therapistId, mood, currentMood, router]);

  const onBackPress = useCallback(() => {
    // YENİ: Eğer zaten sonlandırma işlemi başladıysa, uyarıyı tekrar gösterme
    if (isEnding) return true;
    
    Alert.alert(
      'Seansı Sonlandır',
      'Seansı sonlandırmak istediğinizden emin misiniz? Sohbetiniz kaydedilecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: handleSessionEnd,
        },
      ]
    );
    return true;
  }, [isEnding, handleSessionEnd]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [onBackPress]);

  // Sayfa yüklendiğinde ve odaklandığında erişimi yenile
  useEffect(() => {
    refresh();
  }, []);

  // Mood ve terapist bilgisini parametrelerden alıp state'e ata
  useEffect(() => {
    // 1. Mood'u parametreden alıp state'e ata
    if (mood) {
        setCurrentMood(mood);
    }

    // 2. Terapist bilgisini merkezi 'ALL_THERAPISTS' dizisinden ID ile bul
    if (therapistId) {
        const therapist = getTherapistById(therapistId);
        setSelectedTherapist(therapist);
    } else {
        // ID gelmezse bir varsayılan ata (güvenlik önlemi)
        setSelectedTherapist(ALL_THERAPISTS[0]);
    }
  }, [therapistId, mood]);

  // text_session.tsx içindeki sendMessage fonksiyonunu bununla değiştirin.
const sendMessage = async () => {
  const trimmedInput = input.trim();
  if (!trimmedInput || isTyping) return;

  setInput('');

  const userMessage = { sender: 'user' as const, text: trimmedInput };
  setMessages(prev => [...prev, userMessage]);
  setIsTyping(true);

  // Tüm konuşma geçmişini hazırla
  const fullConversationHistory = [...messages, userMessage]
    .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
    .join('\n');

  const eventToProcess: EventPayload = {
    type: 'text_session',
    data: {
      userMessage: trimmedInput,
      intraSessionChatHistory: fullConversationHistory,
      therapistId,
      therapistPersona: selectedTherapist?.personaKey,
      initialMood: mood,
    }
  };

  const { data: { user } } = await supabase.auth.getUser();
  if(!user) {
    setIsTyping(false);
    return;
  }

  const aiReplyText = await processUserMessage(user.id, eventToProcess);

  if (!aiReplyText) {
    console.error("[sendMessage API] Hatası: Yanıt alınamadı");
    const errorMessage = { sender: 'ai' as const, text: "Bir sorun oluştu." };
    setMessages(prev => [...prev, errorMessage]);
  } else {
    const aiMessage = { sender: 'ai' as const, text: aiReplyText };
    setMessages(prev => [...prev, aiMessage]);
  }
  setIsTyping(false);
};

  return (
    <PremiumGate featureType="text_sessions" premiumOnly={false}>
      <LinearGradient 
          colors={isDark ? ['#232526', '#414345'] : ['#F4F6FF', '#FFFFFF']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.container}
      >
      
        {/*
          Yükleme durumu hala önemli, bu yüzden bu kontrol kalıyor.
          PremiumGate, bu 'loading' durumu bittikten sonra kendi kontrolünü yapacak.
        */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : Colors.light.tint} />
          </View>
        ) : (
          // Yükleme bittikten sonra, direkt olarak sayfanın başarılı halini render et.
          // Eğer yetki yoksa (can_use === false), PremiumGate bu kısmı zaten göstermeyecek
          // ve kendi şık modal'ını ekrana getirecek.
          <>
            <TouchableOpacity onPress={onBackPress} style={styles.back}>
              <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : Colors.light.tint} />
            </TouchableOpacity>

            <SessionTimer onSessionEnd={handleSessionEnd} />

            <View style={styles.therapistHeaderRow}>
              <View style={styles.avatarGradientBox}>
                <LinearGradient colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.avatarGradient}>
                  <Image
                    source={selectedTherapist?.thumbnail || ALL_THERAPISTS[0].thumbnail}
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
          </>
        )}
      </LinearGradient>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 0, // Adjust for status bar
  },
  back: {
    position: 'absolute',
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPrompt: {
    marginTop: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  premiumCard: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  premiumDescription: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
    marginRight: 5,
  },
  therapistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarGradientBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginRight: 15,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistAvatarXL: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  therapistInfoBoxRow: {
    flex: 1,
  },
  therapistNameRow: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  therapistTitleRow: {
    fontSize: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  messages: {
    paddingBottom: 100, // Input bar height
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#E0E0E0', // Light grey for user messages
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#F4F6FF', // Light blue for AI messages
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F4F6FF', // Light background for input bar
    borderRadius: 25,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

