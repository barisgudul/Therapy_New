// app/sessions/video_session.tsx
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
import SessionTimer from '../../components/SessionTimer';
import { Colors } from '../../constants/Colors';
import { ALL_THERAPISTS, getTherapistByImageId } from '../../data/therapists';
import { useVoiceSession } from '../../hooks/useVoice';
import {
  analyzeSessionForMemory,
  generateCumulativeSummary,
  generateTherapistReply,
  mergeVaultData,
} from '../../services/ai.service';
import { logEvent } from '../../services/event.service';
import { addJourneyLogEntry } from '../../services/journey.service';
import { getUserVault, updateUserVault } from '../../services/vault.service';
import { useVaultStore } from '../../store/vaultStore';

const { width, height } = Dimensions.get('window');
const PIP_SIZE = 100;
const BOUNDARY_TOP = 40;
const BOUNDARY_BOTTOM = 200;
const BOUNDARY_SIDE = 0;



export type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
};

export default function VideoSessionScreen() {
  // therapistId'nin yanına mood'u da ekle
  const { therapistId, mood } = useLocalSearchParams<{ therapistId: string; mood?: string; }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [permission, requestPermission] = useCameraPermissions();
  const [currentMood, setCurrentMood] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [intraSessionSummary, setIntraSessionSummary] = useState('');
  const messageCountForSummary = useRef(0);

  // Doğru terapist objesini bul
      const therapist = getTherapistByImageId(therapistId);

  const [cameraVisible, setCameraVisible] = useState(true);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [volume, setVolume] = useState<number>(0);
  const [pipPosition, setPipPosition] = useState({ x: width - PIP_SIZE - BOUNDARY_SIDE, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  // Mood'u parametreden alıp state'e ata
  useEffect(() => {
    if (mood) {
      setCurrentMood(mood);
    }
  }, [mood]);

  /* ---------------------------- VOICE HOOK ------------------------------ */
  const {
    isRecording,
    isProcessing: isSpeechProcessing,
    startRecording,
    stopRecording,
    cleanup,
    speakText,
  } = useVoiceSession({
    onTranscriptReceived: async (userText) => {
      if (!userText) return;

      // 1. Kullanıcı mesajını anında UI'da göster
      const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userText };
      const updatedMessagesWithUser = [...messages, userMessage];
      setMessages(updatedMessagesWithUser);

      // --- MİKRO YÖNETİM (SEANS İÇİ ÖZETLEME) - Aynen kalıyor, doğru ---
      let currentChatHistoryForPrompt = '';
      const summaryTrigger = 7; 
      if (updatedMessagesWithUser.length > messageCountForSummary.current + summaryTrigger) {
          const conversationChunk = updatedMessagesWithUser
              .slice(messageCountForSummary.current)
              .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
              .join('\n');
          const vaultStore = useVaultStore.getState();
        const updatedSummary = await generateCumulativeSummary(intraSessionSummary, conversationChunk, vaultStore.vault);
          setIntraSessionSummary(updatedSummary);
          messageCountForSummary.current = updatedMessagesWithUser.length;
          currentChatHistoryForPrompt = updatedSummary;
      } else {
          const recentMessages = updatedMessagesWithUser
              .slice(messageCountForSummary.current)
              .map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`)
              .join('\n');
          currentChatHistoryForPrompt = `${intraSessionSummary}\n${recentMessages}`;
      }

      try {
        const validTherapistId = (therapistId === "therapist1" || therapistId === "therapist3" || therapistId === "coach1") 
          ? therapistId as "therapist1" | "therapist3" | "coach1" 
          : "therapist1";
        const vaultStore = useVaultStore.getState();
        const aiResponse = await generateTherapistReply(
          validTherapistId,
          userText,
          currentChatHistoryForPrompt,
          vaultStore.vault
        );
        const cleanedAiResponse = aiResponse.trim();
        const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, sender: 'ai', text: cleanedAiResponse };
        setMessages(prev => [...prev, aiMessage]);
        speakText(cleanedAiResponse);
      } catch (error) {
        console.error('AI yanıt hatası:', error);
        const errorMessage = "Üzgünüm, şu anda yanıt veremiyorum.";
        const aiErrorMessage: ChatMessage = { id: `ai-error-${Date.now()}`, sender: 'ai', text: errorMessage };
        setMessages(prev => [...prev, aiErrorMessage]);
        speakText(errorMessage);
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

  // Move onBackPress and handleSessionEnd to top-level
  const handleSessionEnd = async () => {
    await stopRecording?.();
    // Önce seansın ham kaydını her zamanki gibi tut. Bu, transkriptler için gerekli.
    if (messages.length > 2) {
      await logEvent({
        type: 'video_session',
        mood: currentMood,
        data: { therapistId, messages },
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
      const vaultStore = useVaultStore.getState();
      const memoryPieces = await analyzeSessionForMemory(fullTranscript, vaultStore.vault);
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

  return (
    <LinearGradient colors={isDark ? ['#232526', '#414345'] : ['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      {/* Geri/Kapat butonu */}
      <TouchableOpacity onPress={onBackPress} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : Colors.light.tint} />
      </TouchableOpacity>

      {/* Session Timer */}
      <SessionTimer onSessionEnd={handleSessionEnd} />

      <View style={styles.modalContainer}>
        <Image 
                          source={therapist?.photo || ALL_THERAPISTS[0].photo} 
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
          onPress={onBackPress}
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

