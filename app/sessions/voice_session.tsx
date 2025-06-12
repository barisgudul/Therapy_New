import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { Colors } from '../../constants/Colors';
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

  // Doğru terapist objesini bul
  const therapist = avatars.find(a => a.imageId === therapistId);

  /* ---------------------------- STATE & REFS ---------------------------- */
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [soundLevel, setSoundLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);

  const sessionTimer = useRef<number | null>(null);

  /* ---------------------------- VOICE HOOK ------------------------------ */
  const {
    isRecording,
    isProcessing: isSpeechProcessing,
    startRecording,
    stopRecording,
    cleanup,
  } = useVoiceSession({
    onTranscriptReceived: (text) => setTranscript(text),
    onSpeechStarted: () => Animated.timing(fadeAnim, { toValue: 1.1, duration: 400, useNativeDriver: true }).start(),
    onSpeechEnded: () => Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(),
    onSoundLevelChange: (level) => setVolume(level),
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

  // session timer
  useEffect(() => {
    sessionTimer.current = setInterval(() => setSessionDuration((p) => p + 1), 1000) as unknown as number;
    return () => {
      if (sessionTimer.current !== null) clearInterval(sessionTimer.current);
    };
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(); // async fonksiyon, promise dönse de burada beklenmez
    };
  }, [cleanup]);

  // Geri tuşu veya unmount sırasında ses kaydı ve timeout'lar temizlensin
  useEffect(() => {
    const handleBack = () => {
      // Sadece temizlik, session kaydı yok
      return false; // Varsayılan geri tuşu davranışı
    };

    // Android donanım geri tuşu için event listener
    const subscription =
      typeof BackHandler !== 'undefined' && BackHandler.addEventListener
        ? BackHandler.addEventListener('hardwareBackPress', handleBack)
        : null;

    return () => {
      if (subscription && subscription.remove) subscription.remove();
    };
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
      <TouchableOpacity onPress={() => { stopRecording(); navigation.goBack(); }} style={styles.back}>
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
              source={therapist?.thumbnail || therapistImages[therapistId] || therapistImages.therapist1} 
              style={styles.therapistAvatarXL}
            />
          </LinearGradient>
        </View>
        <View style={styles.therapistInfoBoxRow}>
          <Text style={[styles.therapistNameRow, { color: isDark ? '#fff' : Colors.light.tint }]}> 
            {therapist?.name || 'Terapist'}
          </Text>
          <Text style={styles.therapistTitleRow}>{therapist?.title}</Text>
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

        {/* Transcript gösterimi */}
        {transcript ? (
          <Text style={styles.transcriptText}>{transcript}</Text>
        ) : (
          <Text style={styles.transcriptPlaceholder}>Konuşmaya başlamak için mikrofona dokunun</Text>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.button, isRecording ? styles.btnActive : styles.btnMuted]}
            activeOpacity={0.85}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { stopRecording(); navigation.goBack(); }} style={[styles.button, styles.btnMuted]} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color="#fff" />
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
    top: 48,
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
    marginTop: 62,
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
    marginTop: 14,
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
    marginTop: 4,
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
    fontWeight: '600',
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
  transcriptText: {
    color: '#2D3748',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    width: '88%',
    fontWeight: '500',
    letterSpacing: 0.2,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(227,232,240,0.6)',
    opacity: 0.98,
    alignSelf: 'center',
  },
  transcriptPlaceholder: {
    color: '#A0AEC0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(247,250,252,0.85)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    width: '88%',
    fontWeight: '400',
    letterSpacing: 0.2,
    borderWidth: 1,
    borderColor: 'rgba(227,232,240,0.4)',
    opacity: 0.92,
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
    backgroundColor: "ffffff",
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  btnActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  btnMuted: {
    backgroundColor: Colors.light.tint,
    borderColor: 'rgba(227,232,240,0.6)',
    shadowColor: '#B0B8C1',
    shadowOpacity: 0.12,
  },
  premiumSessionArea: {
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
});