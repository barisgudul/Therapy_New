import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { checkAndUpdateBadges } from '../../utils/badges';
import { getSessionStats } from '../../utils/helpers';
import { saveToSessionData } from '../../utils/sessionData'; // EKLENDİ

const { width, height } = Dimensions.get('window');
const PIP_SIZE = 100;

const therapistImages: Record<string, any> = {
  therapist1: require('../../assets/Terapist_1.jpg'),
  therapist2: require('../../assets/Terapist_2.jpg'),
  therapist3: require('../../assets/Terapist_3.jpg'),
  coach1: require('../../assets/coach-can.jpg')
};

export default function SessionScreen() {
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();
  const router = useRouter();
  const [cameraVisible, setCameraVisible] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [volume, setVolume] = useState<number>(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pan = useRef(new Animated.ValueXY({ x: width - PIP_SIZE - 10, y: 100 })).current;

  useEffect(() => {
    requestMicrophonePermission();
    return () => {
      stopListening();
    };
  }, []);

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
      setMicPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      setMicPermissionGranted(true);
    }
  };

  const startListening = async () => {
    if (!micPermissionGranted || recordingRef.current) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
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
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setMicOn(true);

      intervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        const status = await recordingRef.current.getStatusAsync();
        if (status.metering) setVolume(status.metering);
      }, 500);
    } catch (e) {
      console.error('Mikrofon başlatılamadı:', e);
    }
  };

  const stopListening = async () => {
    setMicOn(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.canRecord) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (e) {
        console.warn('Kayıt zaten durdurulmuş olabilir.');
      }
      recordingRef.current = null;
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => pan.extractOffset(),
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.flattenOffset(),
  });

  async function saveSession() {
    try {
      await stopListening();
      await saveToSessionData({
        sessionType: "video",
        newMessages: [], // İleride transcript/mesaj vs. gelirse buraya eklersin
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

      router.back();
    } catch (error) {
      console.error('Seans kaydedilirken hata:', error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.therapistVideo}>
        <Image 
          source={therapistImages[therapistId] || therapistImages.therapist1} 
          style={styles.therapistImage}
        />
      </View>
      {cameraVisible && (
        <Animated.View
          style={[styles.pipWrapper, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <CameraView facing="front" style={styles.camera} />
        </Animated.View>
      )}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => setCameraVisible(prev => !prev)}
          style={[styles.iconBtn, cameraVisible ? styles.btnActive : styles.btnMuted]}
        >
          <Ionicons name={cameraVisible ? 'videocam' : 'videocam-off'} size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={micOn ? stopListening : startListening}
          style={[styles.iconBtn, micOn ? styles.btnActive : styles.btnMuted]}
        >
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={saveSession}
          style={[styles.iconBtn, styles.btnEnd]}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.text}>🎙️ Ses Seviyesi: {volume.toFixed(1)} dB</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  therapistVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  therapistImage: {
    width: '100%',
    height: '100%',
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
    bottom: 100,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  iconBtn: {
    padding: 18,
    borderRadius: 40,
    backgroundColor: '#DEE4EA',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  btnActive: {
    backgroundColor: Colors.light.tint,
  },
  btnMuted: {
    backgroundColor: '#B0B8C3',
  },
  btnEnd: {
    backgroundColor: '#B0B8C3',
  },
  textBox: {
    position: 'absolute',
    bottom: 180,
    left: 24,
    right: 24,
    backgroundColor: '#ffffffcc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  text: {
    color: Colors.light.tint,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});