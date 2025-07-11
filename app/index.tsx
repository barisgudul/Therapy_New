// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router/';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
// import { deleteAllUserData } from '../utils/eventLogger'; // ARTIK GEREKSİZ

const todayISO = () => new Date().toISOString().split('T')[0];
const { width } = Dimensions.get('window');

/* -------- HomeScreen -------- */
export default function HomeScreen() {
  const router = useRouter();

  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshStreak, setRefreshStreak] = useState(Date.now());
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [streakCount, setStreakCount] = useState(0);

  /* bildirim */
  useEffect(() => {
    (async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Sabah motivasyon bildirimi
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Günaydın!',
          body: 'Bugün kendine iyi bakmayı unutma.',
          data: { route: '/daily_write' },
        },
        trigger: { hour: 8, minute: 0, repeats: true } as any,
      });
      
      // Akşam yansıma bildirimi
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bugün nasılsın?',
          body: '1 cümleyle kendini ifade etmek ister misin?',
          data: { route: '/daily_write' },
        },
        trigger: { hour: 20, minute: 0, repeats: true } as any,
      });
      
      // 3 gün boyunca giriş yapılmazsa bildirim
      const lastEntryDate = await AsyncStorage.getItem('lastEntryDate');
      if (lastEntryDate) {
        const lastEntry = new Date(lastEntryDate);
        const now = new Date();
        const diffTime = now.getTime() - lastEntry.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays >= 3) {
          // Bildirimi bugün saat 21:00'de gönder
          const notificationTime = new Date();
          notificationTime.setHours(21, 0, 0, 0);
          let seconds = Math.floor((notificationTime.getTime() - now.getTime()) / 1000);
          if (seconds < 0) seconds += 24 * 60 * 60; // Eğer saat geçtiyse ertesi gün 21:00
          // @ts-ignore
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Seni özledik!',
              body: 'Bir süredir giriş yapmadın. Bugün günlüğünü yazmak ister misin?',
              data: { route: '/daily_write' },
            },
            trigger: { seconds, repeats: false, type: undefined }as any,
          });
        }
      }
      
      // 7 günlük seri tamamlandığında bildirim (7 saat sonra)
      const streak = await AsyncStorage.getItem('currentStreak');
      if (streak && parseInt(streak) === 7) {
        const lastEntryDate = await AsyncStorage.getItem('lastEntryDate');
        if (lastEntryDate) {
          const lastEntry = new Date(lastEntryDate);
          const notificationTime = new Date(lastEntry.getTime() + (7 * 60 * 60 * 1000)); // 7 saat sonrası
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '7/7 Tamamlandı! 🌟',
              body: 'Harikasın! Haftalık hedefine ulaştın. AI ile haftalık performansını incelemek ister misin?',
              data: { route: '/ai_summary' },
            },
            trigger: {
              date: notificationTime,
            } as any,
          });
        }
      }
    })();
  }, []);

  const animateBg = (open: boolean) =>
    Animated.timing(scaleAnim, { toValue: open ? 0.9 : 1, duration: 250, useNativeDriver: true }).start();

  /* kart/modal durumu */
  const refreshState = useCallback(async () => {
    const [storedDate, todayMsg] = await AsyncStorage.multiGet(['todayDate', 'todayMessage']);
    storedDate[1] === todayISO() && todayMsg[1] ? setAiMessage(todayMsg[1]) : setAiMessage(null);
    setRefreshStreak(Date.now());
  }, []);

  useFocusEffect(useCallback(() => { refreshState(); }, [refreshState]));

  /* günlük kartı */
  const handleCardPress = async () => {
    const storedDate = await AsyncStorage.getItem('todayDate');
    if (storedDate === todayISO()) {
      // zaten açılmışsa: modal
      const msg = await AsyncStorage.getItem('todayMessage');
      if (msg) setAiMessage(msg);
      setModalVisible(true);
      animateBg(true);
    } else {
      // ilk tıklama → tarihi hemen kaydet
      await AsyncStorage.setItem('todayDate', todayISO());
      setAiMessage(null);
      router.push('/daily_write' as const);
    }
  };
  
  

  /* Terapistini Seç */
  const handleStart = async () => {
    const stored = await AsyncStorage.getItem('userProfile');
    stored ? router.push('/therapy/avatar' as const) : router.push('/profile' as const);
  };

  const handleGoToAllTranscripts = async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const eventKeys = allKeys.filter(key => /^events-\d{4}-\d{2}-\d{2}$/.test(key));
    let allEvents = [];
    if (eventKeys.length > 0) {
      const dataPairs = await AsyncStorage.multiGet(eventKeys);
      dataPairs.forEach(pair => {
        const eventsJson = pair[1];
        if (eventsJson) {
          try {
            const dailyEvents = JSON.parse(eventsJson);
            allEvents.push(...dailyEvents);
          } catch {}
        }
      });
    }
    const sessionEvents = allEvents.filter(ev => ['text_session', 'voice_session', 'video_session'].includes(ev.type));
    router.push({
      pathname: '/transcripts',
      params: { events: JSON.stringify(sessionEvents) }
    });
  };

  /* ------------- UI ------------- */
  return (
    <LinearGradient colors={['#F8F9FC', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.flex}>
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        {/* Üst Bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            therapy<Text style={styles.dot}>.</Text>
          </Text>
          <View style={styles.topButtons}>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={28} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ana İçerik */}
        <View style={styles.mainContent}>
          <View style={styles.illustrationContainer}>
            <Image 
              source={require('../assets/therapy-illustration.png')} 
              style={styles.illustration} 
              resizeMode="contain" 
            />
          </View>
          <View style={[styles.textContainer, { marginTop: -60, marginBottom: 10 }]}>
            <Text style={styles.title}>Zihnine İyi Bak</Text>
            <Text style={styles.subtitle}>Yapay zekâ destekli terapiyi deneyimle</Text>
          </View>
          <View style={[styles.buttonContainer, { marginTop: 0 }]}>
            <Pressable
              onPress={handleCardPress}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="sparkles-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Bugün Nasıl Hissediyorsun?</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/ai_summary' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="analytics-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Ruh Hâli Analizi</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/diary' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="book-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Günlük</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="heart-circle-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Terapistini Seç</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleGoToAllTranscripts}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="chatbubbles-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Geçmiş Seanslarım</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push('/dream' as const)}
              style={({ pressed }) => [
                styles.button,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="cloudy-night-outline" size={20} color={Colors.light.tint} />
                  <Text style={styles.buttonText}>Yapay Zeka Destekli Rüya Analizi</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => router.push('/how_it_works' as const)}
            >
              <Text style={styles.linkText}>Terapiler nasıl işler?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {modalVisible && <BlurView intensity={60} tint="default" style={StyleSheet.absoluteFill} />}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              onPress={() => {
                setModalVisible(false);
                animateBg(false);
              }} 
              style={styles.modalBackButton}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
            </TouchableOpacity>

            <View style={styles.modalIcon}>
              <LinearGradient
                colors={['#E8EEF7', '#F0F4F9']}
                style={styles.modalIconGradient}
              />
              <Ionicons name="sparkles-outline" size={28} color={Colors.light.tint} />
            </View>

            <Text style={styles.modalTitle}>Günün Mesajı</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalText}>{aiMessage}</Text>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 1.5,
    opacity: 0.95,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 32,
    fontWeight: '900',
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devButton: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  devButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  devButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  profileButton: {
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
  button: {
    width: '100%',
    height: 52,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: width * 0.85,
    height: width * 0.6,
    marginBottom: 32,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: Colors.light.tint,
    textDecorationLine: 'underline',
    letterSpacing: -0.2,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }
      : { elevation: 2 }),
  },
  resetTxt: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  modalBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 5,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalIconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(93,161,217,0.1)',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});