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
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  // --- Derin ve Düşünceli Alan ---
  // Gece gökyüzü, derin sular. Ciddiyet ve içe dönüklük.
  { label: 'İçe Dönük',  color: '#4A5568' },  // Kurşun Kalem Grisi (Charcoal Slate)
  
  // --- Melankolik ve Sakin Alan ---
  // Sisli bir sabah. Durgunluk ve sükunet.
  { label: 'Durgun',     color: '#718096' },  // Fırtınalı Gri (Stormy Gray)
  
  // --- Denge ve Nötr Alan ---
  // Bulutlu bir gün. Yargısızlık ve denge.
  { label: 'Dengede',    color: '#A0AEC0' },  // Taş Grisi (Stone Gray)
  
  // --- Uyanış ve Umut Alanı ---
  // Gün doğumundan önceki ilk ışıklar. Hafif bir iyileşme.
  { label: 'Sakin',      color: '#CBD5E0' },  // Gümüş Rengi (Silver Mist)
  
  // --- Huzur ve Berraklık Alanı ---
  // Açık bir gökyüzü. Zihinsel berraklık ve dinginlik.
  { label: 'Huzurlu',    color: '#A7BFDE' },  // Tozlu Mavi (Dusty Blue) - Markanızın yumuşak tonlarına bir gönderme
  
  // --- Nazik Pozitiflik Alanı ---
  // Ilık bir öğleden sonra. Memnuniyet ve şefkat.
  { label: 'İyi',        color: '#7f9cf5' },  // Lavanta Mavisi (Lavender Blue) - Markanızın şefkatli lavanta rengi
  
  // --- Canlılık ve Işık Alanı ---
  // Gün ışığı. Enerji ve canlılık.
  { label: 'Aydınlık',   color: '#63B3ED' },  // Berrak Gök Mavisi (Clear Sky Blue) - Markanızın ana mavisine yakın, ama daha yumuşak
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

// YENİ: Hex rengi RGB formatına çeviren yardımcı fonksiyon
function hexToRgb(hex: string) {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255].join(',');
    }
    // Varsayılan bir renk döndür, eğer hex geçersizse
    return '99, 102, 241'; // Indigo-500 gibi bir varsayılan
}

// Diğer yardımcı fonksiyonların yanına ekliyorum
function desaturateAndDarken(hex: string, desaturation: number, darkness: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  // Desaturation
  const gray = r * 0.3 + g * 0.59 + b * 0.11;
  r = Math.round(r + (gray - r) * desaturation);
  g = Math.round(g + (gray - g) * desaturation);
  b = Math.round(b + (gray - b) * desaturation);

  // Darkness
  r = Math.round(r * (1 - darkness));
  g = Math.round(g * (1 - darkness));
  b = Math.round(b * (1 - darkness));

  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

//-------------------------------------------------------------
//  YARDIMCI COMPONENT'LER (DIŞARI TAŞINDI)
//-------------------------------------------------------------

// Gradient başlık için yardımcı component
function GradientHeader({ text, colors }: { text: string; colors: [string, string] }) {
  return (
    <MaskedView maskElement={<Text style={[styles.header, { color: '#fff' }]}>{text}</Text>}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.header, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// Mood etiketi için gradient text component'i
function GradientMoodLabel({ text, colors }: { text: string; colors: [string, string] }) {
  return (
    <MaskedView maskElement={<Text style={[styles.moodLabel, { color: '#fff' }]}>{text}</Text>}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.moodLabel, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// therapy.png görseli için gradient mask component'i (LOGO)
function GradientMoodImage({ colors }: { colors: [string, string] }) {
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
        colors={colors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 100, height: 100 }}
      />
    </MaskedView>
  );
}

//-------------------------------------------------------------
// ANA EKRAN COMPONENT'İ
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // YENİ: Her eksen için ayrı referanslar
  const lightAnim1X = useRef(new Animated.Value(0)).current;
  const lightAnim1Y = useRef(new Animated.Value(0)).current;
  const lightAnim2X = useRef(new Animated.Value(0)).current;
  const lightAnim2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      // DOĞRU MANTIK: Pürüzsüz bir "git-gel" (ping-pong) döngüsü oluşturan yardımcı fonksiyon
      const createDriftLoop = (
          animValue: Animated.Value,
          toValue: number,      // Sadece tek bir hedef değer yeterli
          durationGo: number,   // Gidiş süresi
          durationBack: number  // Dönüş süresi
      ) => {
          return Animated.loop(
              Animated.sequence([
                  // 1. Adım: Başlangıçtan (0) hedefe git
                  Animated.timing(animValue, {
                      toValue: toValue,
                      duration: durationGo,
                      easing: Easing.inOut(Easing.ease),
                      useNativeDriver: true,
                  }),
                  // 2. Adım: Hedef'ten başlangıca (0) geri dön
                  Animated.timing(animValue, {
                      toValue: 0, // <-- EN ÖNEMLİ DÜZELTME BURASI
                      duration: durationBack,
                      easing: Easing.inOut(Easing.ease),
                      useNativeDriver: true,
                  }),
              ])
          );
      };

      // Daire 1 için animasyonları başlat (YENİ ÇAĞRI ŞEKLİ)
      createDriftLoop(lightAnim1X, -width / 3, 15000, 18000).start();
      createDriftLoop(lightAnim1Y, height / 4, 12000, 14000).start();

      // Daire 2 için animasyonları başlat (farklı değerler ve gecikmeyle)
      setTimeout(() => {
          createDriftLoop(lightAnim2X, width / 3.5, 13000, 16000).start();
          createDriftLoop(lightAnim2Y, -height / 3, 17000, 20000).start();
      }, 4000);

      // Giriş animasyonu (bu aynı kalıyor)
      Animated.timing(entryAnim, {
          toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true,
      }).start();

      // useEffect bağımlılıkları aynı kalabilir
  }, [entryAnim, lightAnim1X, lightAnim1Y, lightAnim2X, lightAnim2Y]);

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
          { translateX: lightAnim1X },
          { translateY: lightAnim1Y }
      ]
  };
  const light2Style = {
      transform: [
          { translateX: lightAnim2X },
          { translateY: lightAnim2Y }
      ]
  };
  const fadeIn = { 
      opacity: entryAnim, 
      transform: [{ 
          scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) 
      }] 
  };
  const currentMood = MOOD_LEVELS[Math.round(moodValue)];
  const isCurrentMoodDark = isColorDark(currentMood.color);

  // Gradient renklerini belirle
  const gradientColors: [string, string] =
    currentMood.color === tokens.tintMain
      ? [currentMood.color, lightenColor(currentMood.color, 0.18)]
      : [currentMood.color, tokens.tintMain];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.light, styles.light1, light1Style as any]} />
      <Animated.View style={[styles.light, styles.light2, light2Style as any]} />

      <GradientHeader text="Duygu Günlüğü" colors={gradientColors} />

      <Animated.View style={[styles.container, fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, {borderColor: currentMood.color}]}>
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <View style={styles.moodBlock}>
              <GradientMoodImage colors={gradientColors} />
              <GradientMoodLabel text={currentMood.label} colors={gradientColors} />
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

      {/* ZARIF MODAL TASARIMI - KLAVYE UYUMLU VE RENK TEMALI */}
      <Modal visible={inputVisible} transparent animationType="fade" onRequestClose={() => setInputVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%'}}>
              <View style={[styles.modalContent]}>
                
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    onPress={() => setInputVisible(false)} 
                    style={styles.modalBackButton}
                  >
                    <Ionicons name="chevron-back" size={26} color={currentMood.color} />
                  </TouchableOpacity>

                  <View style={styles.modalIconContainer}>
                    <LinearGradient
                      colors={['#f0f4fa', '#e6eaf1']}
                      style={styles.modalIconGradient}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={28} color={currentMood.color} />
                    </LinearGradient>
                  </View>

                  <View style={{ width: 44, height: 44 }} />
                </View>
                
                <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Bugün Nasılsın?</Text>
                    <Text style={styles.modalSubtitle}>Duygularını ve düşüncelerini güvenle paylaşabilirsin.</Text>
                </View>
                
                <View style={[styles.modalDivider, {backgroundColor: currentMood.color, opacity: 0.1}]} />

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, { borderColor: `rgba(${hexToRgb(currentMood.color)}, 0.4)` }]}> 
                    <TextInput
                      style={styles.input}
                      value={note}
                      onChangeText={setNote}
                      placeholder="İçinden geçenleri anlatmak ister misin?"
                      placeholderTextColor="#A0AEC0"
                      multiline
                      autoFocus
                      selectionColor={currentMood.color}
                    />
                    <View style={[styles.inputDecoration, { backgroundColor: `rgba(${hexToRgb(currentMood.color)}, 0.1)` }]} />
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.elegantButton,
                    {
                      // Arka plan, rengin koyu ve desatüre hali olacak
                      backgroundColor: desaturateAndDarken(currentMood.color, 0.4, 0.2),
                    }
                  ]}
                  onPress={() => setInputVisible(false)}
                  activeOpacity={0.8}
                >
                  <View style={styles.elegantButtonContent}>
                    {/* Vurgu çizgisi, ana rengin parlak hali */}
                    <View style={[styles.elegantButtonAccentLine, { backgroundColor: lightenColor(currentMood.color, 0.15) }]} />
                    
                    <Ionicons 
                      name="checkmark-done-circle-outline" 
                      size={22} 
                      // Vurgu rengi, ana rengin kendisi
                      color={lightenColor(currentMood.color, 0.25)} 
                    />
                    <Text 
                      style={[
                        styles.elegantButtonText,
                        // Metin de aynı vurgu renginde
                        { color: lightenColor(currentMood.color, 0.25) }
                      ]}
                    >
                      Tamam
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  light: { position: 'absolute', width: 600, height: 600, borderRadius: 300, opacity: 0.2 },
  light1: { backgroundColor: '#A7BFDE', top: -100, left: -150 },
  light2: { backgroundColor: '#7f9cf5', bottom: -150, right: -200 },
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
    borderRadius: 28,
    padding: 24,
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  modalIconGradient: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  modalBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240, 245, 255, 0.6)',
  },
  modalTitleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(93, 161, 217, 0.1)',
    marginVertical: 10,
    width: '25%',
    alignSelf: 'center',
  },
  inputWrapper: {
    marginBottom: 20,
    width: '100%',
  },
  inputContainer: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 2,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    height: 1,
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
  },
  elegantButton: {
    height: 54,
    borderRadius: 20,
    width: '100%',
    overflow: 'hidden', // İçindeki vurgu çizgisinin taşmasını engeller
    position: 'relative', // Vurgu çizgisi için referans noktası
  },
  elegantButtonContent: { // YENİ: İçeriği sarmak için
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  elegantButtonText: {
    fontSize: 17, // Biraz büyütelim
    fontWeight: '600',
    letterSpacing: -0.4, // Harf aralığını ayarla
    marginLeft: 8, // İkon ve metin arası boşluk
  },
  elegantButtonAccentLine: { // YENİ: Tasarım imzası
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    borderRadius: 2,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});