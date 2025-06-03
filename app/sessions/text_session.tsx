import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { generateTherapistReply } from '../../hooks/useGemini';

// --- EKLENDİ: Merkezi session kaydetme fonksiyonu --- //
import { checkAndUpdateBadges } from '../../utils/badges';
import { getSessionStats } from '../../utils/helpers';
import { saveToSessionData } from '../../utils/sessionData';

// --- DEBUG IMPORT: Gerçekten var mı kontrolü --- //
import * as sessionData from '../../utils/sessionData';
console.log('DEBUG sessionData:', sessionData);
console.log('DEBUG saveToSessionData:', saveToSessionData);

export default function TextSessionScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();

  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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
    }, 300);
  };

  // --- Geri tuşuna basınca ve ekrandan çıkarken sohbeti kaydet (merkezi olarak) --- //
  // ! Doğru kullanım için: aboneyi kaydet ve .remove() ile temizle !
  const latestMessages = useRef(messages);
  latestMessages.current = messages;

  useEffect(() => {
    const saveSession = async () => {
      if (latestMessages.current.length > 0 && typeof saveToSessionData === "function") {
        await saveToSessionData({
          sessionType: "text",
          newMessages: latestMessages.current,
        });
        
        // Seans tamamlandığında rozet kontrolü
        const stats = await getSessionStats();
        await checkAndUpdateBadges('session', {
          textSessions: stats.textSessions,
          videoSessions: stats.videoSessions,
          voiceSessions: stats.voiceSessions,
          totalSessions: stats.totalSessions,
          diverseSessionCompleted: stats.textSessions > 0 && stats.videoSessions > 0 && stats.voiceSessions > 0
        });
      } else {
        console.error("saveToSessionData fonksiyonu YOK veya geçersiz!");
      }
    };

    const onBackPress = () => {
      saveSession();
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      saveSession();
      subscription.remove(); // <-- Doğru kullanım!
    };
    // useRef sayesinde messages'ın en güncel halini kullanır.
  }, []);

  const sendMessage = async () => {
  const trimmed = input.trim();
  if (!trimmed || isTyping) return;

  // --- 1. Tüm geçmişi chatHistory olarak oluştur
  const fullHistory = [
    ...messages,
    { sender: 'user', text: trimmed }
  ];
  const chatHistory = fullHistory
    .map(m => m.sender === 'user' ? `Kullanıcı: ${m.text}` : `Terapist: ${m.text}`)
    .join('\n');

  // --- 2. Mesaj sayısı (yeni mesajla toplam mesaj)
  const messageCount = fullHistory.length;

  setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
  setInput('');
  setIsTyping(true);

  try {
    // --- 3. Fonksiyona messageCount parametresi ekleniyor
    const aiReply = await generateTherapistReply(
      therapistId ?? "therapist1",
      trimmed,
      "",
      chatHistory,
      messageCount      // 👈 5. parametre olarak gönder
    );
    setMessages(prev => [
      ...prev,
      { sender: 'ai', text: aiReply }
    ]);
  } catch (err) {
    setMessages(prev => [
      ...prev,
      { sender: 'ai', text: "Şu anda bir sorun oluştu, lütfen tekrar dene." }
    ]);
  } finally {
    setIsTyping(false);
  }
};

  async function saveSession() {
    try {
      await saveToSessionData({
        sessionType: "text",
        newMessages: messages,
      });

      // Rozetleri kontrol et ve güncelle
      const stats = await getSessionStats();
      
      await checkAndUpdateBadges('session', {
        textSessions: stats.textSessions,
        voiceSessions: stats.voiceSessions,
        videoSessions: stats.videoSessions,
        totalSessions: stats.totalSessions,
        diverseSessionCompleted: stats.textSessions > 0 && stats.voiceSessions > 0 && stats.videoSessions > 0
      });

      router.back();
    } catch (error) {
      console.error('Seans kaydedilirken hata:', error);
    }
  }

  const handleBack = () => {
    if (messages.length > 0 && typeof saveToSessionData === "function") {
      saveToSessionData({
        sessionType: "text",
        newMessages: messages,
      }).finally(() => {
        router.back();
      });
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <LinearGradient colors={['#F9FAFB', '#ECEFF4']} style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.back}>
                <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
              </TouchableOpacity>
              <Text style={styles.logo}>
                therapy<Text style={styles.dot}>.</Text>
              </Text>
            </View>

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
                placeholder="Mesajınızı yazın..."
                value={input}
                onChangeText={setInput}
                multiline
                editable={!isTyping}
                onFocus={handleFocus}
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={isTyping || !input.trim()}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    marginRight: 6,
  },
  logo: {
    fontSize: 22,
    fontWeight: '600',
    textTransform: 'lowercase',
    color: Colors.light.tint,
  },
  dot: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5DA1D9',
  },
  messages: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D4E7F9',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAEFF4',
  },
  bubbleText: {
    color: '#333',
    fontSize: 15,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 32 : 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: '#000',
    backgroundColor: 'transparent',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    padding: 10,
    marginLeft: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
  },
});