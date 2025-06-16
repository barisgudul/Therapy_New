import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { generateTherapistReply } from '../../hooks/useGemini';
import { useVoiceSession } from '../../hooks/useVoice';
import { getSessionStats } from '../../utils/helpers';
import { saveToSessionData } from '../../utils/sessionData';
import { avatars } from '../avatar';

const { width, height } = Dimensions.get('window');
const PIP_SIZE = 100;
const BOUNDARY_TOP = 40;
const BOUNDARY_BOTTOM = 200;
const BOUNDARY_SIDE = 0;

const therapistImages: Record<string, any> = {
  therapist1: require('../../assets/Terapist_1.jpg'),
  therapist2: require('../../assets/Terapist_2.jpg'),
  therapist3: require('../../assets/Terapist_3.jpg'),
  coach1: require('../../assets/coach-can.jpg')
};

export type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
};

export default function VideoSessionScreen() {
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [permission, requestPermission] = useCameraPermissions();

  // Doğru terapist objesini bul
  const therapist = avatars.find(a => a.imageId === therapistId);

  const [cameraVisible, setCameraVisible] = useState(true);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [volume, setVolume] = useState<number>(0);
  const [pipPosition, setPipPosition] = useState({ x: width - PIP_SIZE - BOUNDARY_SIDE, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sessionTimer = useRef<number | null>(null);

  const handleTouchStart = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    lastTouch.current = { x: pageX, y: pageY };
    setIsDragging(true);
  };

  const handleTouchMove = (event: any) => {
    if (!isDragging) return;

    const { pageX, pageY } = event.nativeEvent;
    const deltaX = pageX - lastTouch.current.x;
    const deltaY = pageY - lastTouch.current.y;

    const maxX = width - PIP_SIZE - BOUNDARY_SIDE;
    const minX = BOUNDARY_SIDE;
    const maxY = height - PIP_SIZE - BOUNDARY_BOTTOM;
    const minY = BOUNDARY_TOP;

    const newX = Math.min(Math.max(pipPosition.x + deltaX, minX), maxX);
    const newY = Math.min(Math.max(pipPosition.y + deltaY, minY), maxY);

    setPipPosition({ x: newX, y: newY });
    lastTouch.current = { x: pageX, y: pageY };
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

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
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'user',
          text: text
        }]);
        
        try {
          const aiResponse = await generateTherapistReply(
            therapistId as string,
            text,
            "",
            "",
            1
          );

          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: aiResponse
          }]);

          speakText(aiResponse);
        } catch (error) {
          console.error('AI yanıt hatası:', error);
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

  useEffect(() => {
    requestPermissions();
    return () => {
      cleanup();
    };
  }, []);

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

  const requestPermissions = async () => {
    // Kamera izni
    if (Platform.OS === 'android') {
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Kamera İzni',
          message: 'Görüntülü görüşme için kameraya erişim gerekiyor',
          buttonPositive: 'Tamam',
        }
      );

      const micGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mikrofon İzni',
          message: 'Sesli terapi için mikrofona erişim gerekiyor',
          buttonPositive: 'Tamam',
        }
      );
      setMicPermissionGranted(micGranted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      await requestPermission();
      setMicPermissionGranted(true);
    }
  };

  async function saveSession() {
    try {
      await stopRecording();
      await saveToSessionData({
        sessionType: "video",
        newMessages: messages,
      });

      const sessionStats = await getSessionStats();
      

      router.replace('/');
    } catch (error) {
      console.error('Seans kaydedilirken hata:', error);
    }
  }

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
          onPress: async () => {
            await stopRecording();
            await saveSession();
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

  return (
    <LinearGradient colors={isDark ? ['#232526', '#414345'] : ['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      {/* Geri/Kapat butonu */}
      <TouchableOpacity onPress={handleBack} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.modalContainer}>
        <Image 
          source={therapistImages[therapistId] || therapistImages.therapist1} 
          style={styles.therapistImage}
        />
        <View style={styles.therapistInfoBox}>
          <Text style={styles.therapistName}> 
            {therapist?.name || 'Terapist'}
          </Text>
          <Text style={styles.therapistTitle}>{therapist?.title}</Text>
        </View>
      </View>

      {/* Görünmez sınır alanı */}
      <View style={styles.boundaryArea}>
        {cameraVisible && permission?.granted && (
          <View
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouchStart}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
            style={[
              styles.pipWrapper,
              {
                left: pipPosition.x,
                top: pipPosition.y,
              }
            ]}
          >
            <CameraView 
              facing="front" 
              style={styles.camera}
            />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => setCameraVisible(prev => !prev)}
          style={[styles.button, cameraVisible ? styles.btnActive : styles.btnMuted]}
          activeOpacity={0.85}
        >
          <Ionicons name={cameraVisible ? 'videocam' : 'videocam-off'} size={24} color={Colors.light.tint} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          style={[styles.button, isRecording ? styles.btnActive : styles.btnMuted]}
          activeOpacity={0.85}
        >
          <Ionicons name={isRecording ? 'mic' : 'mic-off'} size={24} color={Colors.light.tint} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleBack}
          style={[styles.button, styles.btnMuted]}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 12,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(227,232,240,0.6)',
  },
  modalContainer: {
    width: '92%',
    height: '72%',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    elevation: 16,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(227,232,240,0.8)',
  },
  therapistImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  therapistInfoBox: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    backgroundColor: `${Colors.light.tint}17`,
    padding: 36,
    borderBottomLeftRadius: 72,
    borderBottomRightRadius: 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 28,
  },
  therapistName: {
    fontSize: 48,
    fontWeight: '400',
    color: 'rgb(255, 255, 255)',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 10,
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-thin',
    textTransform: 'capitalize',
    opacity: 1,
  },
  therapistTitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '300',
    letterSpacing: 4.5,
    opacity: 0.9,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif-thin',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  boundaryArea: {
    position: 'absolute',
    top: BOUNDARY_TOP,
    left: BOUNDARY_SIDE,
    right: BOUNDARY_SIDE,
    bottom: BOUNDARY_BOTTOM,
    zIndex: 5,
  },
  pipWrapper: {
    position: 'absolute',
    width: PIP_SIZE,
    height: PIP_SIZE,
    borderRadius: PIP_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 40,
  },
  button: {
    padding: 24,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  btnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 16,
  },
  btnMuted: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.tint,
    shadowColor: '#B0B8C1',
    shadowOpacity: 0.15,
  },
});

