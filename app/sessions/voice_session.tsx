import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Colors } from '../../constants/Colors';
import { useVoiceSession } from '../../hooks/useVoice';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  /* ---------------------------- STATE & REFS ---------------------------- */
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isSoundCheckComplete, setIsSoundCheckComplete] = useState(false);
  const [isSoundCheckInProgress, setIsSoundCheckInProgress] = useState(false);
  const [soundLevel, setSoundLevel] = useState(0);
  const [soundCheckTranscript, setSoundCheckTranscript] = useState("");
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>("");

  const sessionTimer = useRef<number | null>(null);

  /* ---------------------------- VOICE HOOK ------------------------------ */
  const {
    isRecording,
    isProcessing: isSpeechProcessing,
    startRecording,
    stopRecording,
    speakText,
    cleanup,
  } = useVoiceSession({
    onTranscriptReceived: async (text) => {
      if (isSoundCheckInProgress) {
        setSoundCheckTranscript(text);
        if (text.trim()) {
          setIsSoundCheckComplete(true);
          setIsSoundCheckInProgress(false);
          Alert.alert('Başarılı', 'Sesiniz algılandı, terapiye başlayabilirsiniz.');
        } else {
          setIsSoundCheckInProgress(false);
          Alert.alert('Başarısız', 'Ses algılanamadı. Lütfen tekrar deneyin.');
        }
        return;
      }
      setLastTranscript(text); // Sadece transcript'i göster
      // AI'ya gönderme, mesaj ekleme yok
    },
    onSpeechStarted: () => Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(),
    onSpeechEnded: () => Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(),
    onSoundLevelChange: (level) => setSoundLevel(level),
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
      if (isSoundCheckInProgress) {
        setIsSoundCheckInProgress(false);
        void cleanup();
      }
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
      if (isSoundCheckInProgress) {
        setIsSoundCheckInProgress(false);
        void cleanup();
      }
    };
  }, [isSoundCheckInProgress, cleanup]);

  /* ---------------------------- HELPERS --------------------------------- */
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ------------------------ SOUND CHECK FLOW ---------------------------- */
  const startSoundCheck = async () => {
    setIsSoundCheckInProgress(true);
    setSoundCheckTranscript("");
    let timeoutId: NodeJS.Timeout | null = null;
    let apiTimeoutId: NodeJS.Timeout | null = null;
    let lastRecordingUri: string | null = null;
    try {
      await startRecording();
      // 3 saniye sonra kaydı durdur
      timeoutId = setTimeout(async () => {
        try {
          // stopRecording fonksiyonunu doğrudan çağırmak yerine, önce kaydın URI ve boyutunu logla
          if (typeof stopRecording === 'function' && stopRecording.length === 0) {
            // useVoiceSession içindeki recording.current'e erişim yok, bu yüzden logu orada ekleyeceğiz
            await stopRecording();
          } else {
            await stopRecording();
          }
          // API'dan transcript gelmezse 7 saniye sonra hata göster
          apiTimeoutId = setTimeout(() => {
            if (!soundCheckTranscript.trim()) {
              setIsSoundCheckInProgress(false);
              Alert.alert(
                'Hata',
                'Ses kaydı gönderildi fakat Google API’dan yanıt alınamadı. İnternet bağlantınızı, API anahtarınızı ve ses kaydının boş olmadığını kontrol edin. (Kayıt formatı ve boyutu loglanıyor, konsolu inceleyin.)'
              );
            }
          }, 7000);
        } catch (e) {
          setIsSoundCheckInProgress(false);
          Alert.alert(
            'Kayıt Hatası',
            'Kayıt durdurulurken bir hata oluştu. Lütfen tekrar deneyin.'
          );
        }
      }, 3000);
    } catch (e: any) {
      setIsSoundCheckInProgress(false);
      if (
        e?.message?.toLowerCase().includes('permission') ||
        e?.code === 'E_MISSING_PERMISSION'
      ) {
        Alert.alert(
          'İzin Gerekli',
          'Mikrofon izni verilmediği için ses kontrolü yapılamıyor. Lütfen ayarlardan mikrofon izni verin.'
        );
      } else if (
        e?.message?.toLowerCase().includes('denied') ||
        e?.message?.toLowerCase().includes('not granted')
      ) {
        Alert.alert(
          'İzin Reddedildi',
          'Mikrofon izni reddedildi. Lütfen uygulama ayarlarından mikrofon iznini aktif edin.'
        );
      } else {
        Alert.alert(
          'Kayıt Başlatılamadı',
          'Ses kaydı başlatılamadı. Cihazınızda başka bir uygulama mikrofonu kullanıyor olabilir veya donanımsal bir sorun olabilir.'
        );
      }
    }
    // Temizlik: component unmount olursa timeout'ları temizle
    useEffect(() => {
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (apiTimeoutId) clearTimeout(apiTimeoutId);
      };
    }, []);
  };

  /* ---------------------------------------------------------------------- */
  /* RENDERERS                                                              */
  /* ---------------------------------------------------------------------- */

  if (!isSoundCheckComplete) {
    return (
      <LinearGradient colors={isDark ? ['#000', '#1c2e40'] : ['#F9FAFB', '#ECEFF4']} style={styles.container}>
        <Image source={therapistImages[therapistId] || therapistImages.therapist1} style={styles.bgImage} />
        <Text style={styles.brand}>therapy<Text style={styles.brandDot}>.</Text></Text>
        <Text style={[styles.heading, { color: isDark ? '#fff' : Colors.light.text }]}>Ses Kontrolü</Text>
        <Text style={[styles.desc, { color: isDark ? '#ddd' : Colors.light.text }]}>Terapiye başlamadan önce 3 saniye konuşarak mikrofon testini tamamla.</Text>
        <TouchableOpacity style={[styles.primaryBtn, isSoundCheckInProgress && { opacity: 0.6 }]} disabled={isSoundCheckInProgress} onPress={startSoundCheck}>
          <Text style={styles.primaryBtnText}>{isSoundCheckInProgress ? 'Kontrol Yapılıyor…' : 'Ses Kontrolünü Başlat'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  /* --------------------------- MAIN SESSION ----------------------------- */
  return (
    <LinearGradient colors={isDark ? ['#000', '#1c2e40'] : ['#F9FAFB', '#ECEFF4']} style={styles.container}>
      {/* Background therapist image */}
      <Image source={therapistImages[therapistId] || therapistImages.therapist1} style={styles.bgImage} />
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>therapy<Text style={styles.brandDot}>.</Text></Text>
        <Text style={[styles.timer, { color: isDark ? '#fff' : Colors.light.text }]}>{formatDuration(sessionDuration)}</Text>
      </View>

      {/* Son transcript'i göster */}
      {lastTranscript ? (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: isDark ? '#fff' : '#222', fontSize: 16, fontWeight: '500' }}>
            Son Konuşmanız: {lastTranscript}
          </Text>
        </View>
      ) : null}

      {/* Recording indicator */}
      <Animated.View style={[styles.micCircle, { transform: [{ scale: pulseAnim }] }]}> 
        {isRecording && (
          <View style={styles.levelBarWrapper}>
            <View style={[styles.levelBar, { height: `${Math.min(100, soundLevel * 100)}%` }]} />
          </View>
        )}
      </Animated.View>

      {isSpeechProcessing && (
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={[styles.processingText, { color: isDark ? '#fff' : Colors.light.text }]}>Düşünüyorum…</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Sadece mikrofon butonu bırakıldı, kapatma butonu kaldırıldı */}
        <TouchableOpacity style={[styles.micBtn, isRecording ? styles.btnActive : styles.btnMuted]} onPress={isRecording ? stopRecording : startRecording} disabled={isSpeechProcessing}>
          <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Transcript error message */}
      {transcriptError && (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#c00', fontSize: 15, marginBottom: 8, textAlign: 'center' }}>{transcriptError}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { paddingHorizontal: 32, paddingVertical: 10 }]}
            onPress={async () => {
              setTranscriptError(null);
              await startRecording();
            }}
            disabled={isRecording || isSpeechProcessing}
          >
            <Text style={styles.primaryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bgImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  backBtn: { position: 'absolute', top: 52, left: 24, zIndex: 10 },
  brand: { fontSize: 22, fontWeight: '600', color: Colors.light.tint, textTransform: 'lowercase' },
  brandDot: { color: Colors.light.tint, fontSize: 26, fontWeight: '700' },
  header: { alignItems: 'center', marginBottom: 8 },
  timer: { fontSize: 16, fontWeight: '500', marginTop: 4 },
  /* Mic circle */
  micCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.light.tint,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    marginVertical: 16,
  },
  levelBarWrapper: { width: 18, height: 50, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9, overflow: 'hidden' },
  levelBar: { width: '100%', backgroundColor: '#fff', position: 'absolute', bottom: 0 },
  /* Processing */
  processingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginBottom: 8 },
  processingText: { fontSize: 14, fontWeight: '500' },
  /* Controls */
  controls: { flexDirection: 'row', alignSelf: 'center', gap: 20, marginTop: 6 },
  micBtn: { padding: 18, borderRadius: 50 },
  btnActive: { backgroundColor: Colors.light.tint },
  btnMuted: { backgroundColor: '#9AA5B1' },
  /* Sound check */
  heading: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginVertical: 18 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginHorizontal: 8, marginBottom: 24 },
  primaryBtn: { backgroundColor: Colors.light.tint, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});