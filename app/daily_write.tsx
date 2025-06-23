// app/daily_write.tsx
// -----------------------------------------------------------------------
// Expo deps: expo-blur expo-haptics expo-linear-gradient expo-font
//            @react-native-async-storage/async-storage
//            @react-native-community/slider

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import MaskedView from '@react-native-masked-view/masked-view';
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
import { logEvent } from '../utils/eventLogger';
import { calculateStreak, getTotalEntries, isColorDark } from '../utils/helpers';
import { statisticsManager } from '../utils/statisticsManager';


//-------------------------------------------------------------
//  Tasarım Sabitleri & Yardımcıları
//-------------------------------------------------------------
const tokens = {
  radiusLg: 28,
  radiusMd: 22,
  tintMain: '#3B82F6', 
  glassBg: 'rgba(246, 248, 250, 0.85)',
  shadow: {
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

// app/daily_write.tsx dosyasındaki MOOD_LEVELS sabitini bununla değiştirin:

const MOOD_LEVELS = [
    { label: 'Çok Kötü', color: '#2C3E50' }, // Koyu Lacivert/Gri (Gece Yarısı)
    { label: 'Kötü',     color: '#526D82' }, // Desatüre Mavi (Fırtınalı Deniz)
    { label: 'Üzgün',    color: '#778DA9' }, // Yumuşak Gri-Mavi (Bulutlu Sabah)
    { label: 'Nötr',     color: '#9DB2BF' }, // Açık Gri-Mavi (Sakin Gökyüzü)
    { label: 'İyi',      color: '#3B82F6' }, // Canlı Mavi (Uygulamanın Ana Rengi)
    { label: 'Harika',   color: '#4FC3F7' }, // Parlak Gökyüzü Mavisi
    { label: 'Mükemmel', color: '#26C6DA' }, // Canlı Turkuaz (Berrak Su)
];

const { width, height } = Dimensions.get('window');

// Renk açıcı yardımcı fonksiyon
function lightenColor(hex: string, percent: number) {
  // #RRGGBB formatında hex bekler
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
  let b = (num & 0x0000FF) + Math.round(255 * percent);
  r = r > 255 ? 255 : r;
  g = g > 255 ? 255 : g;
  b = b > 255 ? 255 : b;
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

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
    const now = new Date();
    const mood = MOOD_LEVELS[moodValue].label;

    try {
      // Merkezi olay kaydı
      await logEvent({
        type: 'daily_reflection',
        mood: mood,
        data: {
          reflection: note,
        }
      });
      // Eski meta kayıtlar devam
      await AsyncStorage.multiSet([
        ['todayDate', now.toISOString().split('T')[0]],
        ['todayMessage', aiMessage],
        ['lastReflectionAt', String(now.getTime())],
      ]);
      // Eski istatistik ve rozet sistemleri
      const streak = await calculateStreak();
      const totalEntries = await getTotalEntries();
      await statisticsManager.updateStatistics({ text: note, mood: mood, date: now.toISOString().split('T')[0], source: 'daily_write' });
      await checkAndUpdateBadges('daily', { totalEntries, streak: streak.currentStreak, dailyWriterNovice: totalEntries >= 3, dailyWriterExpert: totalEntries >= 15 });
    } catch (err) {
      console.error("closeFeedback hatası:", err);
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
  const currentMood = MOOD_LEVELS[Math.round(moodValue)];
  const isCurrentMoodDark = isColorDark(currentMood.color);

  // Gradient renklerini belirle
  const gradientColors: [string, string] =
    currentMood.color === tokens.tintMain
      ? [currentMood.color, lightenColor(currentMood.color, 0.18)]
      : [currentMood.color, tokens.tintMain];

  // Gradient başlık için yardımcı fonksiyon
  function GradientHeader({ text }: { text: string }) {
    return (
      <MaskedView maskElement={<Text style={[styles.header, { color: '#fff' }]}>{text}</Text>}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.header, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    );
  }

  // Mood etiketi için gradient text
  function GradientMoodLabel({ text }: { text: string }) {
    return (
      <MaskedView maskElement={<Text style={[styles.moodLabel, { color: '#fff' }]}>{text}</Text>}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.moodLabel, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    );
  }

  // therapy.png görseli için gradient mask
  function GradientMoodImage() {
    return (
      <MaskedView
        style={{ width: 100, height: 100, marginBottom: 16 }}
        maskElement={
          <Image
            source={require('../assets/therapy.png')}
            style={{ width: 100, height: 100, resizeMode: 'contain', backgroundColor: 'transparent' }}
          />
        }
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ width: 100, height: 100 }}
        />
      </MaskedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.light, styles.light1, light1Style as any]} />
      <Animated.View style={[styles.light, styles.light2, light2Style as any]} />

      <GradientHeader text="Duygu Günlüğü" />

      <Animated.View style={[styles.container, fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, {borderColor: currentMood.color}]}>
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <View style={styles.moodBlock}>
              <GradientMoodImage />
              <GradientMoodLabel text={currentMood.label} />
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
                <Ionicons name="create-outline" size={24} color={currentMood.color} />
                <Text numberOfLines={1} style={[styles.promptText, note && styles.promptFilled]}>
                  {note || 'Bugünün duygularını ve düşüncelerini buraya yaz...'}
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

      {/* ZARIF MODAL TASARIMI */}
      <Modal visible={inputVisible} transparent animationType="fade" onRequestClose={() => setInputVisible(false)}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              onPress={() => setInputVisible(false)} 
              style={styles.modalBackButton}
            >
              <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
            </TouchableOpacity>

            <View style={styles.modalIcon}>
              <LinearGradient
                colors={['#F3F4F8', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalIconGradient}
              />
              <Ionicons name="chatbubble-ellipses-outline" size={26} color={Colors.light.tint} />
            </View>

            <Text style={styles.modalTitle}>Bugün Nasılsın?</Text>
            <Text style={styles.modalSubtitle}>Duygularını ve düşüncelerini güvenle paylaşabilirsin...</Text>
            <View style={styles.modalDivider} />
            
            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="İçinden geçenleri anlatmak ister misin?"
                  placeholderTextColor="rgba(74, 85, 104, 0.5)"
                  multiline
                  autoFocus
                />
                <View style={styles.inputDecoration} />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.elegantButton} 
              onPress={() => setInputVisible(false)} 
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.elegantButtonGradient}
              >
                <Text style={styles.elegantButtonText}>Tamam</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI ANALİZ MODALI - index.tsx ile aynı yapıda */}
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              onPress={closeFeedback} 
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

            <Text style={styles.modalTitle}>AI Analizi</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalText}>{aiMessage}</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

//-------------------------------------------------------------
// Eksiksiz Stil Sayfası
//-------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8FA' },
  header: {
    paddingTop: 50,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(60, 120, 200, 0.10)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 8,
  },
  light: { position: 'absolute', width: 600, height: 600, borderRadius: 300, opacity: 0.25, },
  light1: { backgroundColor: tokens.tintMain, top: -100, left: -150 },
  light2: { backgroundColor: '#7FB3D5', bottom: -150, right: -200 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 30, justifyContent: 'space-between', paddingBottom: 40 },
  mainContent: { justifyContent: 'center', flex: 1 },
  card: { borderRadius: tokens.radiusLg, paddingVertical: 24, paddingHorizontal: 20, backgroundColor: tokens.glassBg, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(93,161,217,0.15)', ...tokens.shadow, },
  moodCard: { marginBottom: 30 },
  title: { fontSize: 22, fontWeight: '600', color: Colors.light.text, textAlign: 'center', marginBottom: 24, },
  moodBlock: { alignItems: 'center' },
  moodImage: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 16 },
  moodLabel: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, minHeight: 32 },
  slider: { width: '100%', height: 40 },
  thumb: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8, },
  promptCard: { flexDirection: 'row', alignItems: 'center' },
  promptText: { flex: 1, fontSize: 16, color: Colors.light.softText, marginLeft: 16 },
  promptFilled: { color: Colors.light.text, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: tokens.radiusLg, marginTop: 24, shadowColor: tokens.tintMain, shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12, },
  saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10, },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 120, },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12,
  },
  modalBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 30,
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
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.08)',
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  modalIconGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(93,161,217,0.06)',
    marginBottom: 20,
    width: '25%',
    alignSelf: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 2,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: '#1A1F36',
    minHeight: 110,
    textAlignVertical: 'top',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  inputDecoration: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 1,
    backgroundColor: 'rgba(93,161,217,0.08)',
  },
  elegantButton: {
    height: 52,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.25)',
  },
  elegantButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elegantButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.3,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});