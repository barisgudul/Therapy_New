// app/DailyWriteScreen.tsx (Noise/Gren Dosyası Olmadan Tam ve Eksiksiz Kod)
// -----------------------------------------------------------------------
// Expo deps: expo-blur expo-haptics expo-linear-gradient expo-font
//            @react-native-async-storage/async-storage
//            @react-native-community/slider

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { generateDailyReflectionResponse } from '../hooks/useGemini';
import { checkAndUpdateBadges } from '../utils/badges';
import { calculateStreak, getTotalEntries } from '../utils/helpers';
import { statisticsManager } from '../utils/statisticsManager';


//-------------------------------------------------------------
//  Tasarım Sabitleri & Yardımcıları
//-------------------------------------------------------------
const tokens = {
  radiusLg: 28,
  radiusMd: 22,
  tintMain: Colors.light.tint, // Marka ana rengi
  glassBg: 'rgba(246, 248, 250, 0.85)', // Açık tema için cam efekti
  shadow: {
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

const MOOD_LEVELS = [
    { label: 'Çok Kötü', icon: 'cloudy-night-outline', color: '#B0BEC5' },
    { label: 'Kötü',      icon: 'rainy-outline',       color: '#7FB3D5' },
    { label: 'Üzgün',     icon: 'sad-outline',         color: '#6B7280' },
    { label: 'Nötr',      icon: 'remove-outline',      color: Colors.light.tint },
    { label: 'İyi',       icon: 'leaf-outline',        color: '#3E6B89' },
    { label: 'Harika',    icon: 'happy-outline',       color: '#2C3E50' },
    { label: 'Mükemmel',  icon: 'sparkles-outline',    color: '#7FB3D5' },
];

const { width, height } = Dimensions.get('window');

//-------------------------------------------------------------
export default function DailyWriteScreen() {
  const router = useRouter();
  const [moodValue, setMoodValue] = useState(3);
  const [note, setNote] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const entryAnim = useRef(new Animated.Value(0)).current;
  const lightAnim1 = useRef(new Animated.Value(0)).current;
  const lightAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Yaşayan Arka Plan Animasyonu
  useEffect(() => {
      const createLoop = (anim: Animated.Value) => Animated.loop(
          Animated.sequence([
              Animated.timing(anim, { toValue: 1, duration: 8000, useNativeDriver: true }),
              Animated.timing(anim, { toValue: 0, duration: 8000, useNativeDriver: true }),
              Animated.timing(anim, { toValue: 0.5, duration: 6000, useNativeDriver: true }),
          ])
      );
      createLoop(lightAnim1).start();
      setTimeout(() => createLoop(lightAnim2).start(), 5000);
      
      Animated.timing(entryAnim, {
        toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }).start();
  }, [entryAnim, lightAnim1, lightAnim2]);

  const animatePress = () => { Animated.sequence([ Animated.timing(scaleAnim, { toValue: 0.96, duration: 120, useNativeDriver: true }), Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }), ]).start(); };

  async function appendActivity(activityKey: string, newEntry: any) {
    let prev: any[] = [];
    try {
      const prevRaw = await AsyncStorage.getItem(activityKey);
      if (prevRaw) prev = JSON.parse(prevRaw);
      if (!Array.isArray(prev)) prev = [];
    } catch {
      prev = [];
    }
    prev.push(newEntry);
    await AsyncStorage.setItem(activityKey, JSON.stringify(prev));
  }

  async function saveSession() {
    if (!note || saving) return;
    setSaving(true);
    setAiMessage('AI analiz ediyor...');
    setFeedbackVisible(true);
    try {
      const personalized = await generateDailyReflectionResponse(note, MOOD_LEVELS[moodValue].label);
      setAiMessage(personalized);
    } catch (err) {
      setAiMessage('Sunucu hatası, lütfen tekrar deneyin.');
    }
    setSaving(false);
  }

  async function closeFeedback() {
    setFeedbackVisible(false);
    // Kayıt işlemleri burada yapılacak (AI yanıtı okunduktan sonra kaydet)
    const now = Date.now();
    const today = new Date(now).toISOString().split('T')[0];
    try {
      await AsyncStorage.multiSet([
        [
          `mood-${today}`,
          JSON.stringify({ mood: MOOD_LEVELS[moodValue].label, reflection: note, timestamp: now })
        ],
        ['todayDate', today],
        ['todayMessage', aiMessage],
        ['lastReflectionAt', String(now)],
      ]);
      const activityKey = `activity-${today}`;
      const newEntry = { type: 'daily_write', time: now };
      await appendActivity(activityKey, newEntry);
      await statisticsManager.updateStatistics({ text: note, mood: MOOD_LEVELS[moodValue].label, date: today, source: 'daily_write' });
      await AsyncStorage.removeItem('mood-stats-initialized');
      const streak = await calculateStreak();
      const totalEntries = await getTotalEntries();
      await checkAndUpdateBadges('daily', {
        totalEntries: totalEntries,
        streak: streak.currentStreak
      });
      if (totalEntries >= 3) {
        await checkAndUpdateBadges('daily', {
          totalEntries: totalEntries,
          dailyWriterNovice: true
        });
      }
      if (totalEntries >= 15) {
        await checkAndUpdateBadges('daily', {
          totalEntries: totalEntries,
          dailyWriterExpert: true
        });
      }
    } catch (err) {
      // hata durumunda sessizce geç
    }
    setNote('');
    setInputVisible(false);
    setAiMessage('');
    router.replace('/');
  }

  // Animasyon stilleri
  const light1Style = {
    transform: [
      { translateX: lightAnim1.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, width / 2] }) },
      { translateY: lightAnim1.interpolate({ inputRange: [0, 1], outputRange: [height / 3, -height / 3] }) }
    ]
  };
  const light2Style = {
    transform: [
      { translateX: lightAnim2.interpolate({ inputRange: [0, 1], outputRange: [width / 2, -width / 2] }) },
      { translateY: lightAnim2.interpolate({ inputRange: [0, 1], outputRange: [-height / 4, height / 4] }) }
    ]
  };
  const fadeIn = { opacity: entryAnim, transform: [{ scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] };
  const currentMood = MOOD_LEVELS[moodValue];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      {/* Yaşayan Arka Plan Işıkları */}
      <Animated.View style={[styles.light, styles.light1, light1Style]} />
      <Animated.View style={[styles.light, styles.light2, light2Style]} />

      <Text style={styles.header}>Duygu Günlüğü</Text>

      <Animated.View style={[styles.container, fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, {borderColor: currentMood.color}]}>
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <View style={styles.moodBlock}>
              <Image source={require('../assets/therapy.png')} style={[styles.moodImage, { tintColor: currentMood.color }]} />
              <Text style={[styles.moodLabel, { color: currentMood.color }]}>{currentMood.label}</Text>
            </View>
          </BlurView>
          <View style={{marginTop: -16, marginBottom: 16, paddingHorizontal: 10}}>
            <Slider
              style={styles.slider} minimumValue={0} maximumValue={6} step={1}
              value={moodValue}
              onValueChange={v => setMoodValue(v)}
              onSlidingComplete={() => Haptics.selectionAsync()}
              minimumTrackTintColor={currentMood.color}
              maximumTrackTintColor="rgba(93,161,217,0.15)"
              thumbTintColor={currentMood.color}
            />
          </View>
          
          <TouchableOpacity onPress={() => { animatePress(); setInputVisible(true); }} activeOpacity={0.8}>
            <BlurView intensity={50} tint="light" style={[styles.card, styles.promptCard]}>
                <Ionicons name="create-outline" size={24} color={tokens.tintMain} />
                <Text numberOfLines={1} style={[styles.promptText, note && styles.promptFilled]}>
                  {note || 'Aklından geçenleri mısralara dök...'}
                </Text>
            </BlurView>
          </TouchableOpacity>
        </View>
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
           <TouchableOpacity disabled={!note || saving} activeOpacity={0.85} onPress={saveSession}>
                <LinearGradient start={{x:0, y:0}} end={{x:1, y:1}} colors={[currentMood.color, tokens.tintMain]} style={[styles.saveBtn, (!note || saving) && { opacity: 0.5 }] }>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <Text style={styles.saveText}>{saving ? 'Kaydediliyor...' : 'Günlüğü Tamamla'}</Text>
                </LinearGradient>
           </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Modal: Not yazma */}
      <Modal visible={inputVisible} transparent animationType="fade" onRequestClose={() => setInputVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setInputVisible(false)}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={['#3E6B89', '#7FB3D5']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.modalTitle}>Bugün nasılsın?</Text>
              </View>
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Düşüncelerini buraya yaz..."
                placeholderTextColor="#9CA3AF"
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={[styles.closeBtn, !note && styles.saveDisabled]}
                onPress={() => setInputVisible(false)}
                disabled={!note}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#3E6B89', '#7FB3D5']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.closeGradient}
                >
                  <Text style={styles.closeText}>Tamam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>
      {/* Modal: AI Analizi */}
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <Pressable style={styles.overlay} onPress={closeFeedback}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <LinearGradient
                  colors={['#3E6B89', '#7FB3D5']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="sparkles-outline" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.modalTitle}>AI Analizi</Text>
              </View>
              <Text style={styles.aiMessage}>{aiMessage}</Text>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={closeFeedback}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#3E6B89', '#7FB3D5']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.closeGradient}
                >
                  <Text style={styles.closeText}>Tamam</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

//-------------------------------------------------------------
// Eksiksiz Stil Sayfası (noise.png olmadan)
//-------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8FA' },
  header: {
    paddingTop: 50, textAlign: 'center', fontSize: 22, fontWeight: 'bold',
    color: Colors.light.tint, opacity: 0.95,
  },
  light: {
    position: 'absolute', width: 600, height: 600, borderRadius: 300, opacity: 0.25,
  },
  light1: { backgroundColor: Colors.light.tint, top: -100, left: -150 },
  light2: { backgroundColor: '#7FB3D5', bottom: -150, right: -200 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 30, justifyContent: 'space-between', paddingBottom: 40 },
  mainContent: { justifyContent: 'center', flex: 1 },
  card: {
    borderRadius: tokens.radiusLg, paddingVertical: 24, paddingHorizontal: 20,
    backgroundColor: tokens.glassBg, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)', ...tokens.shadow,
  },
  moodCard: { marginBottom: 30 },
  title: {
    fontSize: 22, fontWeight: '600', color: Colors.light.text, textAlign: 'center',
    marginBottom: 24,
  },
  moodBlock: { alignItems: 'center' },
  moodImage: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 16 },
  moodLabel: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, minHeight: 32 },
  slider: { width: '100%', height: 40 },
  thumb: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff',
    shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  promptCard: { flexDirection: 'row', alignItems: 'center' },
  promptText: { flex: 1, fontSize: 16, color: Colors.light.softText, marginLeft: 16 },
  promptFilled: { color: Colors.light.text, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: tokens.radiusLg, marginTop: 24,
    shadowColor: Colors.light.tint, shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  saveText: {
    color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
  },
  modalCard: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3E6B89',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
    marginTop: 20,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E6B89',
    letterSpacing: -0.3,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1A1F36',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#7FB3D5',
    marginBottom: 20,
  },
  closeBtn: {
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  aiMessage: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 20,
  },
  saveDisabled: {
    opacity: 0.5,
  },
});