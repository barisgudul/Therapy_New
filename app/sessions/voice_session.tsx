import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import SessionTimer from '../../components/SessionTimer';
import { Colors } from '../../constants/Colors';
import { generateTherapistReply } from '../../hooks/useGemini';
import { useVoiceSession } from '../../hooks/useVoice';
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

  /* ---------------------------- STATE & REFS ---------------------------- */
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [soundLevel, setSoundLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);

  /* ---------------------------- VOICE HOOK ------------------------------ */
  const {
    isRecording,
    isProcessing: isSpeechProcessing,
    startRecording,
    stopRecording,
    cleanup,
    speakText,
  } = useVoiceSession({
    onTranscriptReceived: async (text) => {
      if (text) {
        // Kullanıcı mesajını ekle
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'user',
          text: text
        }]);
        
        try {
          // AI cevabını al
          const aiResponse = await generateTherapistReply(
            therapistId as string,
            text,
            "", // mood hint
            "", // chat history
            1 // message count
          );

          // AI cevabını ekle
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: aiResponse
          }]);

          // AI cevabını sesli oku
          speakText(aiResponse);
        } catch (error) {
          console.error('AI yanıt hatası:', error);
          // Hata durumunda varsayılan mesaj
          const errorMessage = "Üzgünüm, şu anda yanıt veremiyorum. Lütfen tekrar deneyin.";
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: errorMessage
          }]);
          speakText(errorMessage);
        }
      }
    },
    onSpeechStarted: () => Animated.timing(fadeAnim, { toValue: 1.1, duration: 400, useNativeDriver: true }).start(),
    onSpeechEnded: () => Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(),
    onSoundLevelChange: (level) => setVolume(level),
    therapistId: therapistId as string,
  });

  /* ------------------------------ EFFECTS ------------------------------- */
  // Pulsing circle anim
  useEffect(() => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: isRecording ? 1.1 : 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [isRecording]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(); // async fonksiyon, promise dönse de burada beklenmez
    };
  }, [cleanup]);

  const handleBack = () => {
    Alert.alert(
      'Seansı Sonlandır',
      'Seansı sonlandırmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: () => {
            stopRecording();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleSessionEnd = async () => {
    Alert.alert(
      'Seans Süresi Doldu',
      '10 dakikalık seans süreniz doldu. Seansı sonlandırmak istiyor musunuz?',
      [
        {
          text: 'Devam Et',
          style: 'cancel'
        },
        {
          text: 'Sonlandır',
          style: 'default',
          onPress: () => {
            stopRecording();
            router.replace('/');
          }
        }
      ]
    );
  };

  // Geri tuşu için
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

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
      <TouchableOpacity onPress={handleBack} style={styles.back}>
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
          <Text style={styles.therapistTitleRow}>{selectedTherapist?.title}</Text>
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
              borderColor: isRecording ? Colors.light.tint : '#E3E8F0',
              borderWidth: isRecording ? 2 : 1,
              shadowColor: isRecording ? Colors.light.tint : '#B0B8C1',
              shadowOpacity: isRecording ? 0.13 : 0.07,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
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
        </Animated.View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.button, isRecording ? styles.btnActive : styles.btnMuted]}
            activeOpacity={0.85}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBack} style={[styles.button, styles.btnMuted]} activeOpacity={0.85}>
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
    alignSelf: 'center',
    marginTop: 36,
    marginBottom: 32,
    gap: 40,
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