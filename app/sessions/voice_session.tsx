import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { checkAndUpdateBadges } from '../../utils/badges';
import { getSessionStats } from '../../utils/helpers';
import { saveToSessionData } from '../../utils/sessionData'; // EKLENDİ

const therapistImages: Record<string, any> = {
  therapist1: require('../../assets/Terapist_1.jpg'),
  therapist2: require('../../assets/Terapist_2.jpg'),
  therapist3: require('../../assets/Terapist_3.jpg'),
  coach1: require('../../assets/coach-can.jpg')
};

export default function VoiceSessionScreen() {
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();
  const router = useRouter();
  const recording = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [volume, setVolume] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    requestMicrophonePermission();
    return () => {
      stopRecording();
    };
  }, []);

  useEffect(() => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: micOn ? 1.1 : 1.25,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [micOn]);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Mikrofon İzni',
          message: 'Uygulamanın sesinizi tanıyabilmesi için mikrofona erişimi gerekiyor.',
          buttonPositive: 'Tamam',
        }
      );
      setPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    }
  };

  const startRecording = async () => {
    if (!permissionGranted || recording.current) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.caf',
          audioQuality: 2,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        isMeteringEnabled: true,
      });

      await rec.startAsync();
      recording.current = rec;
      setMicOn(true);

      intervalRef.current = setInterval(async () => {
        const status = await rec.getStatusAsync();
        if (status.isRecording && status.metering) {
          setVolume(status.metering);
        }
      }, 500);
    } catch (e) {
      console.error('Kayıt başlatılamadı:', e);
    }
  };

  const stopRecording = async () => {
    setMicOn(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (recording.current) {
      try {
        const status = await recording.current.getStatusAsync();
        if (status.canRecord) {
          await recording.current.stopAndUnloadAsync();
        }
      } catch (e) {
        console.warn('Kayıt zaten durdurulmuş olabilir.');
      }
      recording.current = null;
    }
  };

  const handleExit = async () => {
    await stopRecording();

    // --- MERKEZİ KAYIT FONKSİYONU ---
    await saveSession();

    router.back();
  };

  async function saveSession() {
    try {
      await saveToSessionData({
        sessionType: "voice",
        newMessages: [], // İleride transcript eklersen burada kullanırsın
      });

      // Rozetleri kontrol et ve güncelle
      const sessionStats = await getSessionStats();
      
      await checkAndUpdateBadges('session', {
        textSessions: sessionStats.textSessions,
        voiceSessions: sessionStats.voiceSessions,
        videoSessions: sessionStats.videoSessions,
        totalSessions: sessionStats.totalSessions,
        diverseSessionCompleted: sessionStats.textSessions > 0 && 
                                sessionStats.voiceSessions > 0 && 
                                sessionStats.videoSessions > 0
      });
    } catch (error) {
      console.error('Seans kaydedilirken hata:', error);
    }
  }

  return (
    <LinearGradient colors={isDark ? ['#000000', '#1c2e40'] : ['#F9FAFB', '#ECEFF4']} style={styles.container}>
      <View style={styles.therapistVideo}>
        <Image 
          source={therapistImages[therapistId] || therapistImages.therapist1} 
          style={styles.therapistImage}
        />
      </View>

      <TouchableOpacity onPress={handleExit} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.logo}>
        therapy<Text style={styles.dot}>.</Text>
      </Text>
      <Text style={[styles.title, { color: isDark ? '#fff' : Colors.light.text }]}>
        Sesli Terapi
      </Text>

      {permissionGranted ? (
        <>
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: micOn ? Colors.light.tint : Colors.light.tint,
              },
            ]}
          />

          <Text style={[styles.volume, { color: isDark ? '#fff' : Colors.light.tint }]}>
            🎙️ Mikrofon Seviyesi: {volume.toFixed(1)} dB
          </Text>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={micOn ? stopRecording : startRecording}
              style={[styles.button, micOn ? styles.btnActive : styles.btnMuted]}
            >
              <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleExit} style={[styles.button, styles.btnMuted]}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>
          Mikrofon izni verilmedi.
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  back: {
    position: 'absolute',
    top: 52,
    left: 24,
    zIndex: 10,
  },
  logo: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    marginBottom: 8,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 26,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 24,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    backgroundColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  volume: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: Colors.light.tint,
  },
  controls: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 80,
    marginBottom: 50,
  },
  button: {
    padding: 18,
    borderRadius: 50,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  btnActive: {
    backgroundColor: Colors.light.tint,
  },
  btnMuted: {
    backgroundColor: '#9AA5B1',
  },
  therapistVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});