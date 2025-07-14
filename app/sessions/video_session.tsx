// app/sessions/video_session.tsx

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import SessionTimer from '../../components/SessionTimer';
import { Colors } from '../../constants/Colors';
import { ALL_THERAPISTS, TherapistData, getTherapistById } from '../../data/therapists';
import { useVoiceSession } from '../../hooks/useVoice';
import { processUserMessage } from '../../services/api.service';
import { EventPayload } from '../../services/event.service';
import { supabase } from '../../utils/supabase';

const { width, height } = Dimensions.get('window');
const PIP_SIZE = 100;
const BOUNDARY_TOP = 40;
const BOUNDARY_BOTTOM = 200;
const BOUNDARY_SIDE = 0;
export type ChatMessage = { id: string; sender: 'user' | 'ai'; text: string; };

export default function VideoSessionScreen() {
    const { therapistId, mood } = useLocalSearchParams<{ therapistId: string; mood?: string; }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedTherapist, setSelectedTherapist] = useState<TherapistData | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraVisible, setCameraVisible] = useState(true);
    const [pipPosition, setPipPosition] = useState({ x: width - PIP_SIZE - 20, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const lastTouch = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (therapistId) {
            const therapist = getTherapistById(therapistId);
            setSelectedTherapist(therapist || ALL_THERAPISTS[0]);
        } else {
            setSelectedTherapist(ALL_THERAPISTS[0]);
        }
    }, [therapistId]);

    const handleTouchStart = (event: any) => {
        setIsDragging(true);
        lastTouch.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    };

    const handleTouchMove = (event: any) => {
        if (!isDragging) return;
        const { pageX, pageY } = event.nativeEvent;
        const newX = pipPosition.x + (pageX - lastTouch.current.x);
        const newY = pipPosition.y + (pageY - lastTouch.current.y);
        lastTouch.current = { x: pageX, y: pageY };
        const clampedX = Math.max(BOUNDARY_SIDE, Math.min(newX, width - PIP_SIZE - BOUNDARY_SIDE));
        const clampedY = Math.max(BOUNDARY_TOP, Math.min(newY, height - PIP_SIZE - BOUNDARY_BOTTOM));
        setPipPosition({ x: clampedX, y: clampedY });
    };

    const handleTouchEnd = () => setIsDragging(false);

    const { isRecording, startRecording, stopRecording, cleanup, speakText } = useVoiceSession({
        onTranscriptReceived: async (userText) => {
            if (!userText) return;
            const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userText };
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const eventToProcess: EventPayload = {
                type: 'video_session',
                data: {
                    userMessage: userText,
                    therapistId,
                    initialMood: mood,
                    intraSessionChatHistory: updatedMessages.map(m => `${m.sender}: ${m.text}`).join('\n')
                }
            };
            const { data: aiReplyText, error } = await processUserMessage(user.id, eventToProcess);
            if (error || !aiReplyText) {
                const errorMessage = "Üzgünüm, bir sorun oluştu.";
                setMessages(prev => [...prev, { id: `ai-error-${Date.now()}`, sender: 'ai', text: errorMessage }]);
                speakText(errorMessage, therapistId);
            } else {
                const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, sender: 'ai', text: aiReplyText };
                setMessages(prev => [...prev, aiMessage]);
                speakText(aiReplyText, therapistId);
            }
        },
        therapistId,
    });

    const handleSessionEnd = async () => {
        await stopRecording?.();
        if (messages.length > 1) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const sessionEndPayload: EventPayload = {
                    type: 'video_session',
                    data: {
                        isSessionEnd: true,
                        therapistId,
                        initialMood: mood,
                        messages,
                        transcript: messages.map(m => `${m.sender}: ${m.text}`).join('\n')
                    }
                };
                await processUserMessage(user.id, sessionEndPayload);
            }
        }
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
        return () => subscription.remove();
    }, [messages, therapistId, mood]);

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
                          source={selectedTherapist?.photo || ALL_THERAPISTS[0].photo} 
          style={styles.therapistImage}
        />
        <View style={styles.therapistInfoBox}>
          <Text style={styles.therapistName}> 
            {selectedTherapist?.name || 'Terapist'}
          </Text>
          <Text style={styles.therapistTitle}>{selectedTherapist?.title}</Text>
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

