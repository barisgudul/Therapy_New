// app/sessions/voice_session.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
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
import { ALL_THERAPISTS, TherapistData, getTherapistById } from '../../data/therapists';
import { useVoiceSession } from '../../hooks/useVoice';
import { processUserMessage } from '../../services/api.service';
import { EventPayload } from '../../services/event.service';
import { supabase } from '../../utils/supabase';

export type ChatMessage = { id: string; sender: 'user' | 'ai'; text: string; };

export default function VoiceSessionScreen() {
    const { therapistId, mood } = useLocalSearchParams<{ therapistId: string; mood?: string; }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedTherapist, setSelectedTherapist] = useState<TherapistData | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (therapistId) {
            const therapist = getTherapistById(therapistId);
            setSelectedTherapist(therapist || ALL_THERAPISTS[0]);
        } else {
            setSelectedTherapist(ALL_THERAPISTS[0]);
        }
    }, [therapistId]);

    const { isRecording, isProcessing, startRecording, stopRecording, cleanup, speakText } = useVoiceSession({
        onTranscriptReceived: async (userText) => {
            if (!userText) return;
            const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userText };
            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const eventToProcess: EventPayload = {
                type: 'voice_session',
                data: {
                    userMessage: userText,
                    therapistId,
                    initialMood: mood,
                    intraSessionChatHistory: updatedMessages.map(m => `${m.sender === 'user' ? 'Danışan' : 'Terapist'}: ${m.text}`).join('\n')
                }
            };
            const { data: aiReplyText, error } = await processUserMessage(user.id, eventToProcess);
            if (error || !aiReplyText) {
                const errorMessage = "Üzgünüm, şu an bir sorun yaşıyorum.";
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

    const triggerPulse = (start: boolean = true) => {
        if (start) {
            pulseAnim.setValue(1);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation(() => {
                Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
            });
        }
    };

    const handleSessionEnd = async () => {
        await stopRecording?.();
        if (messages.length > 1) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const sessionEndPayload: EventPayload = {
                    type: 'voice_session',
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
                              source={selectedTherapist?.thumbnail || ALL_THERAPISTS[0].thumbnail} 
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
              borderColor: isProcessing ? '#FFD700' : (isRecording ? Colors.light.tint : '#E3E8F0'),
              borderWidth: isRecording || isProcessing ? 2 : 1,
              shadowColor: isRecording ? Colors.light.tint : '#B0B8C1',
              shadowOpacity: isRecording ? 0.13 : 0.07,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {isProcessing ? (
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
            disabled={isProcessing || isRecording}
            onPress={() => {
              if (!isRecording && !isProcessing) {
                triggerPulse(true);
                startRecording();
              }
            }}
            style={[styles.button, isProcessing || isRecording ? styles.btnMuted : styles.btnActive]}
            activeOpacity={0.85}
          >
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={32} color={isProcessing || isRecording ? '#aaa' : Colors.light.tint} />
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