// app/sessions/voice_session.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
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
import { useVoiceSession } from '../../hooks/useVoice';
import {
  addJourneyLogEntry,
  getUserVault,
  logEvent,
  updateUserVault,
} from '../../utils/eventLogger';
import { avatars } from '../avatar';

/* -------------------------------------------------------------------------- */
/* TYPES & CONSTS                                                             */
/* -------------------------------------------------------------------------- */

const { width } = Dimensions.get('window');

const therapistImages: Record<string, any> = {
  therapist1: require('../../assets/Terapist_1.jpg'),
  therapist2: require('../../assets/Terapist_2.jpg'),
  therapist3: require('../../assets/Terapist_3.jpg'),
  coach1: require('../../assets/coach-can.jpg'),
};

const therapistNames: Record<string, string> = {
  therapist1: 'Terapist 1',
  therapist2: 'Terapist 2',
  therapist3: 'Terapist 3',
  coach1: 'Koç 1',
};

export type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function VoiceSessionScreen() {
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [selectedTherapist, setSelectedTherapist] = useState<any>(null);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string>("");
  const [intraSessionSummary, setIntraSessionSummary] = useState('');
  const messageCountForSummary = useRef(0);

  // Terapist bilgisini yükle
  useEffect(() => {
    const loadTherapist = async () => {
      try {
        const savedTherapist = await AsyncStorage.getItem('selectedTherapist');
        if (savedTherapist) {
          setSelectedTherapist(JSON.parse(savedTherapist));
        } else {
          // Eğer kayıtlı terapist yoksa, avatars'dan bul
          const therapist = avatars.find(a => a.imageId === therapistId);
          setSelectedTherapist(therapist);
        }
      } catch (error) {
        console.error('Terapist yüklenirken hata:', error);
      }
    };
    loadTherapist();
  }, [therapistId]);

  // Mood'u yükle
  useEffect(() => {
    const loadMood = async () => {
      try {
        const moodRaw = await AsyncStorage.getItem('before_mood_latest');
        if (moodRaw) {
          const moodData = JSON.parse(moodRaw);
          setCurrentMood(moodData.mood || '');
        }
      } catch (error) {
        console.error('Mood yüklenirken hata:', error);
      }
    };
    loadMood();
  }, []);

  /* ---------------------------- STATE & REFS ---------------------------- */  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* ---------------------------- VOICE HOOK ------------------------------ */  const {
    isRecording,
    isProcessing: isSpeechProcessing,
    startRecording,
    stopRecording,
    cleanup,
    speakText,
  } = useVoiceSession({
    onTranscriptReceived: async (userText) => {
      if (!userText) return;

      // 1. Yeni kullanıcı mesajını oluştur.
      const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userText };
      // 2. Mesaj listesini TEK SEFERDE GÜNCELLE ve bir değişkende tut.
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // --- MİKRO YÖNETİM (SEANS İÇİ ÖZETLEME) ---
      let currentChatHistoryForPrompt = '';
      const summaryTrigger = 7; // Her 7 mesajda bir

      // Mevcut seans içindeki tüm mesajlar AI'a gönderilmeden önce özetleniyor
      if (updatedMessages.length > messageCountForSummary.current + summaryTrigger) {
          const conversationChunk = updatedMessages
              .slice(messageCountForSummary.current)
              .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
              .join('\n');
          
          const updatedSummary = await generateCumulativeSummary(intraSessionSummary, conversationChunk);
          setIntraSessionSummary(updatedSummary);
          messageCountForSummary.current = updatedMessages.length;
          currentChatHistoryForPrompt = updatedSummary; // Prompt'a sadece güncel özeti gönder
      } else {
          // Henüz özetleme zamanı gelmediyse, önceki özete son mesajları ekle
          const recentMessages = updatedMessages
              .slice(messageCountForSummary.current)
              .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
              .join('\n');
          currentChatHistoryForPrompt = `${intraSessionSummary}\n${recentMessages}`;
      }

      try {
        const validTherapistId = (therapistId === "therapist1" || therapistId === "therapist3" || therapistId === "coach1") 
          ? therapistId as "therapist1" | "therapist3" | "coach1" 
          : "therapist1";

        // 5. AI'dan yanıt al.
        const rawAiResponse = await generateTherapistReply(
          validTherapistId,
          userText,
          currentChatHistoryForPrompt
        );

        // 6. ---- ÇÖZÜM BURADA: AI yanıtını temizle ----
        const cleanedAiResponse = rawAiResponse.trim();

        // 7. Temizlenmiş AI yanıtıyla son bir kez mesaj listesini güncelle.
        const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, sender: 'ai', text: cleanedAiResponse };
        setMessages(prev => [...prev, aiMessage]);
        // 8. Temizlenmiş metni seslendir.
        speakText(cleanedAiResponse, validTherapistId);

      } catch (error) {
        console.error('AI yanıt hatası:', error);
        const errorMessage = "Üzgünüm, şu anda bir sorunla karşılaştım. Lütfen biraz sonra tekrar deneyin.".trim();
        const aiErrorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', text: errorMessage };
        setMessages(prev => [...prev, aiErrorMessage]);
        speakText(errorMessage, therapistId as string);
      }
    },
    onSpeechStarted: () => {},
    onSpeechEnded: () => {},
    therapistId: therapistId as string,
  });

  /* ------------------------------ EFFECTS ------------------------------- */  // cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(); // async fonksiyon, promise dönse de burada beklenmez
    };
  }, [cleanup]);

  // Move onBackPress and handleSessionEnd to top-level
  const handleSessionEnd = async () => {
    await stopRecording?.();
    // Önce seansın ham kaydını her zamanki gibi tut. Bu, transkriptler için gerekli.
    if (messages.length > 2) {
      await logEvent({
        type: 'voice_session',
        mood: currentMood,
        data: { therapistId, messages },
      });
      await AsyncStorage.removeItem('before_mood_latest');
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

  const triggerPulse = (start: boolean = true) => {
    if (start) {
      pulseAnim.setValue(1);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]).start();
    } else {
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [messages, router, therapistId, currentMood]);

  /* ---------------------------- HELPERS --------------------------------- */
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------------------------------------------------------------------- */
  /* RENDERERS                                                              */
  /* ---------------------------------------------------------------------- */

  return (
    <LinearGradient colors={isDark ? ['#232526', '#414345'] : ['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      {/* Geri/Kapat butonu */}
      <TouchableOpacity onPress={onBackPress} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : Colors.light.tint} />
      </TouchableOpacity>

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
          <Text style={styles.therapistTitleRow}>{selectedTherapist?.title}</Text>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color="#8A94A6" />
            <SessionTimer onSessionEnd={handleSessionEnd} />
          </View>
        </View>
      </View>

      {/* Lüks ve premium, kart olmayan, markaya uygun alan */}
      <View style={styles.premiumSessionArea}>
        <Text style={styles.logo}>therapy<Text style={styles.dot}>.</Text></Text>
        <Text style={[styles.title, { color: isDark ? '#222' : Colors.light.text }]}>Sesli Terapi</Text>

        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: isRecording ? '#F8FAFF' : '#fff',
              borderColor: isSpeechProcessing ? '#FFD700' : (isRecording ? Colors.light.tint : '#E3E8F0'),
              borderWidth: isRecording || isSpeechProcessing ? 2 : 1,
              shadowColor: isRecording ? Colors.light.tint : '#B0B8C1',
              shadowOpacity: isRecording ? 0.13 : 0.07,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {isSpeechProcessing ? (
            <ActivityIndicator size="large" color={Colors.light.tint} />
          ) : (
            <>
              <Animated.View
                style={[
                  styles.brandWave,
                  {
                    borderColor: isRecording ? Colors.light.tint : '#E3E8F0',
                    opacity: isRecording ? 0.18 : 0.10,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.brandDot} />
            </>
          )}
        </Animated.View>

        <View style={styles.controls}>
          <TouchableOpacity
            disabled={isSpeechProcessing || isRecording}
            onPress={() => {
              if (!isRecording && !isSpeechProcessing) {
                triggerPulse(true);
                startRecording();
              }
            }}
            style={[styles.button, isSpeechProcessing || isRecording ? styles.btnMuted : styles.btnActive]}
            activeOpacity={0.85}
          >
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={32} color={isSpeechProcessing || isRecording ? '#aaa' : Colors.light.tint} />
          </TouchableOpacity>
          {isRecording && (
            <TouchableOpacity
              onPress={() => {
                triggerPulse(false);
                stopRecording();
              }}
              style={[styles.button, styles.btnActive]}
              activeOpacity={0.85}
            >
              <Ionicons name={'stop-circle-outline'} size={32} color={Colors.light.tint} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onBackPress} style={[styles.button, styles.btnMuted]} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: '100%',
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
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
  therapistHeaderRow: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 120,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  avatarGradientBox: {
    borderRadius: 70,
    padding: 3,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  avatarGradient: {
    borderRadius: 70,
    padding: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.4)',
  },
  therapistAvatarXL: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  therapistInfoBoxRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
  },
  therapistNameRow: {
    fontSize: 21,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  therapistTitleRow: {
    fontSize: 15,
    color: '#8A94A6',
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(227, 232, 240, 0.6)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginLeft: 6,
    letterSpacing: 0.5,
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
    marginTop: 10,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: '900',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 0.8,
    opacity: 0.92,
    marginBottom: 32,
    color: '#2D3748',
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  brandWave: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: 'rgba(93,161,217,0.25)',
    zIndex: 1,
    opacity: 0.15,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  brandDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.tint,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    alignSelf: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 36,
    marginBottom: 32,
    gap: 20,
  },
  button: {
    padding: 22,
    borderRadius: 54,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  btnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  btnMuted: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.tint,
    shadowColor: '#B0B8C1',
    shadowOpacity: 0.12,
  },
  premiumSessionArea: {
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
});