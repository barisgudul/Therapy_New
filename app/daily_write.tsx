// app/daily_write.tsx
// -----------------------------------------------------------------------
// Expo deps: expo-blur expo-haptics expo-linear-gradient expo-font
//            @react-native-async-storage/async-storage
//            @react-native-community/slider

import { Ionicons } from '@expo/vector-icons';
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

import { v4 as uuidv4 } from 'uuid';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { useFeatureAccess } from '../hooks/useSubscription';
import { generateDailyReflectionResponse } from '../services/ai.service';
import { logEvent } from '../services/event.service';
import { useVaultStore } from '../store/vaultStore';
import { InteractionContext } from '../types/context';
import { getErrorMessage } from '../utils/errors';


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

// YENİ: İnterpolasyon için optimize edilmiş, daha yumuşak ve terapötik renk paleti
const MOOD_LEVELS = [
  // Derin düşünce, gece mavisi
  { label: 'İçe Dönük',  color: '#4A5568' }, // Kurşun Kalem Grisi
  // Durgunluk, sisli bir sabah
  { label: 'Durgun',     color: '#718096' }, // Fırtınalı Gri
  // Nötr denge, bulutlu gökyüzü
  { label: 'Dengede',    color: '#A0AEC0' }, // Taş Grisi
  // Hafif bir aydınlanma, gümüşi bir ışık
  { label: 'Sakin',      color: '#A7BFDE' }, // Tozlu Mavi (Gri-Mavi geçişi)
  // Huzur, açık ve berrak bir gökyüzü
  { label: 'Huzurlu',    color: '#90a4f5' }, // Yumuşak Lavanta (Marka rengine yumuşak geçiş)
  // Nazik pozitiflik, ılık bir gün
  { label: 'İyi',        color: '#7f9cf5' }, // Lavanta Mavisi (Ana marka rengi)
  // Canlılık ve enerji, parlak gökyüzü
  { label: 'Aydınlık',   color: '#63B3ED' }, // Berrak Gök Mavisi
];

const { width, height } = Dimensions.get('window');

// Renk koyuluk kontrolü için yardımcı fonksiyon
function isColorDark(hexColor: string) {
  const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
  const r = parseInt(color.substring(0, 2), 16); // Red
  const g = parseInt(color.substring(2, 4), 16); // Green
  const b = parseInt(color.substring(4, 6), 16); // Blue
  return (r * 0.299 + g * 0.587 + b * 0.114) < 186;
}

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

// YENİ: İki hex renk arasında yumuşak bir geçiş sağlayan interpolasyon fonksiyonu
function interpolateColor(color1: string, color2: string, factor: number) {
  const hex = (c: number) => c.toString(16).padStart(2, '0');
  const c1 = parseInt(color1.substring(1), 16);
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  const c2 = parseInt(color2.substring(1), 16);
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  return `#${hex(r)}${hex(g)}${hex(b)}`;
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

  const { user } = useAuth();
  const vault = useVaultStore((s) => s.vault);
  const updateAndSyncVault = useVaultStore((s) => s.updateAndSyncVault);
  
  // Daily write özelliği için freemium kontrolü
  const dailyWriteAccess = useFeatureAccess('daily_write');

  // Premium kontrolü - eğer günlük limit dolmuşsa premium gate göster
  if (!dailyWriteAccess.loading && !dailyWriteAccess.can_use) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        
        <View style={styles.premiumPrompt}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.premiumCard}
          >
            <View style={styles.premiumHeader}>
              <Ionicons name="diamond" size={32} color="white" />
              <Text style={styles.premiumTitle}>Günlük Limit Doldu</Text>
            </View>
            
            <Text style={styles.premiumDescription}>
              Günde 1 duygu günlüğü yazabilirsiniz. Premium planla sınırsız günlük yazabilirsiniz.
            </Text>
            
            <Text style={styles.premiumUsage}>
              Kullanım: {dailyWriteAccess.used_count}/{dailyWriteAccess.limit_count}
            </Text>
            
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.premiumButtonText}>Premium'a Geç</Text>
              <Ionicons name="arrow-forward" size={20} color="#6366F1" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  async function saveSession() {
    if (!note || saving) return;
    setSaving(true);
    setAiMessage('Size özel bir yansıma hazırlanıyor...');
    setFeedbackVisible(true);
    
    try {
      const todayMood = MOOD_LEVELS[moodValue].label;

      // Adım 1: Backend'in beklediği InteractionContext objesini TAM VE DOĞRU oluştur.
      const context: InteractionContext = {
        transactionId: uuidv4(),
        userId: user?.id || '',
        initialVault: vault!,
        initialEvent: {
          id: uuidv4(),
          user_id: user?.id || '',
          type: 'daily_reflection',
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: {
            todayNote: note,
            todayMood: todayMood
          }
        },
        derivedData: {}
      };

      // Adım 2: Doğru şekilde beyni çağır.
      const personalized = await generateDailyReflectionResponse(context);
      setAiMessage(personalized);

      // Adım 3: Kullanım sayısını artır (freemium kontrolü için)
      // await trackDailyWriteUsage(user?.id || ''); // Bu fonksiyonun tanımı yok, bu kısım kaldırıldı

    } catch (err) {
      console.error("AI yansıması oluşturulurken hata:", getErrorMessage(err));
      setAiMessage('Şu anda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function closeFeedback() {
    setFeedbackVisible(false);
    
    const todayMood = MOOD_LEVELS[moodValue].label;
    const todayString = new Date().toISOString().split('T')[0];

    try {
      // Adım 1: Merkezi olay kaydı (Bu zaten doğruydu)
      await logEvent({
        type: 'daily_reflection',
        mood: todayMood,
        data: { text: note, aiResponse: aiMessage }
      });

      // Adım 2: KALICI HAFIZAYI (Vault) GÜNCELLEME EMRİ
      const currentVault = useVaultStore.getState().vault;
      if (currentVault) {
        const newVault = {
          ...currentVault,
          metadata: {
            ...currentVault.metadata,
            lastDailyReflectionDate: todayString, // Bugünün tarihi
            dailyMessageContent: aiMessage        // GÜNÜN MESAJI!
          }
        };
        await updateAndSyncVault(newVault);
        console.log('✅ Günlük yansıma Vault\'a başarıyla işlendi.');
      }

    } catch (err) {
      console.error("Günlük yansıması kaydı/güncellemesi sırasında hata:", err);
    }

    // Adım 3: Ekranı temizle ve ana menüye dön
    setNote('');
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

  // -----------------------------------------------------------
  // YENİ: RENK HESAPLAMA MANTIĞI
  // -----------------------------------------------------------
  const startIndex = Math.floor(moodValue);
  const endIndex = Math.min(startIndex + 1, MOOD_LEVELS.length - 1);
  const factor = moodValue - startIndex;
  const startColor = MOOD_LEVELS[startIndex].color;
  const endColor = MOOD_LEVELS[endIndex].color;
  const dynamicColor = interpolateColor(startColor, endColor, factor);
  const currentMood = MOOD_LEVELS[Math.round(moodValue)];
  const isCurrentMoodDark = isColorDark(currentMood.color);

  // Gradient için renkleri belirle (Artık dinamik renge göre)
  const gradientColors: [string, string] = [dynamicColor, tokens.tintMain];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.light, styles.light1, light1Style as any]} />
      <Animated.View style={[styles.light, styles.light2, light2Style as any]} />

      <GradientHeader text="Duygu Günlüğü" colors={gradientColors} />

      <Animated.View style={[styles.container, fadeIn]}>
        <View style={styles.mainContent}>
          <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, {borderColor: dynamicColor}]}>
            <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
            <View style={styles.moodBlock}>
              <GradientMoodImage colors={gradientColors} />
              <GradientMoodLabel text={currentMood.label} colors={gradientColors} />
            </View>
          </BlurView>
          <View style={{marginTop: -16, marginBottom: 16, paddingHorizontal: 10}}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={MOOD_LEVELS.length - 1}
              step={0.01}
              value={moodValue}
              onValueChange={v => setMoodValue(v)}
              onSlidingComplete={v => {
                const roundedValue = Math.round(v);
                setMoodValue(roundedValue);
                Haptics.selectionAsync();
              }}
              minimumTrackTintColor={dynamicColor}
              maximumTrackTintColor="rgba(93,161,217,0.15)"
              thumbTintColor={dynamicColor}
            />
          </View>
          
          <TouchableOpacity onPress={() => { animatePress(); setInputVisible(true); }} activeOpacity={0.8}>
            <BlurView intensity={50} tint="light" style={[styles.card, styles.promptCard]}>
                <Ionicons name="create-outline" size={24} color={dynamicColor} />
                <Text numberOfLines={1} style={[styles.promptText, note && styles.promptFilled]}>
                  {note || 'Bugünün duygularını ve düşüncelerini buraya yaz...'}
                </Text>
            </BlurView>
          </TouchableOpacity>
        </View>
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
           <TouchableOpacity disabled={!note || saving} activeOpacity={0.85} onPress={saveSession}>
                <LinearGradient start={{x:0, y:0}} end={{x:1, y:1}} colors={[dynamicColor, tokens.tintMain]} style={[styles.saveBtn, (!note || saving) && { opacity: 0.5 }] }>
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
                    <Ionicons name="chevron-back" size={26} color={dynamicColor} />
                  </TouchableOpacity>

                  <View style={styles.modalIconContainer}>
                    <LinearGradient
                      colors={['#f0f4fa', '#e6eaf1']}
                      style={styles.modalIconGradient}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={28} color={dynamicColor} />
                    </LinearGradient>
                  </View>

                  <View style={{ width: 44, height: 44 }} />
                </View>
                
                <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Bugün Nasılsın?</Text>
                    <Text style={styles.modalSubtitle}>Duygularını ve düşüncelerini güvenle paylaşabilirsin.</Text>
                </View>
                
                <View style={[styles.modalDivider, {backgroundColor: dynamicColor, opacity: 0.1}]} />

                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, { borderColor: `rgba(${hexToRgb(dynamicColor)}, 0.4)` }]}> 
                    <TextInput
                      style={styles.input}
                      value={note}
                      onChangeText={setNote}
                      placeholder="İçinden geçenleri anlatmak ister misin?"
                      placeholderTextColor="#A0AEC0"
                      multiline
                      autoFocus
                      selectionColor={dynamicColor}
                    />
                    <View style={[styles.inputDecoration, { backgroundColor: `rgba(${hexToRgb(dynamicColor)}, 0.1)` }]} />
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    { borderColor: `rgba(${hexToRgb(dynamicColor)}, 0.2)` }
                  ]}
                  onPress={() => setInputVisible(false)}
                  activeOpacity={0.7}
                >
                  <BlurView
                    intensity={60}
                    tint="light"
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons 
                    name="checkmark-done-circle-outline" 
                    size={22}
                    color={dynamicColor} 
                  />
                  <Text 
                    style={[
                      styles.modalConfirmButtonText,
                      { color: dynamicColor }
                    ]}
                  >
                    Tamam
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* YENİ VE GELİŞTİRİLMİŞ AI ANALİZ MODALI */}
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={closeFeedback}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableWithoutFeedback onPress={closeFeedback}>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%'}}>
              <View style={[styles.modalContent]}>
                
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    onPress={closeFeedback} 
                    style={styles.modalBackButton}
                  >
                    <Ionicons name="chevron-back" size={26} color={dynamicColor} />
                  </TouchableOpacity>

                  <View style={styles.modalIconContainer}>
                    <LinearGradient
                      colors={['#f0f4fa', '#e6eaf1']}
                      style={styles.modalIconGradient}
                    >
                      <Ionicons name="sparkles-outline" size={28} color={dynamicColor} />
                    </LinearGradient>
                  </View>

                  <View style={{ width: 44, height: 44 }} />
                </View>
                
                <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>AI Analizi</Text>
                </View>
                
                <View style={[styles.modalDivider, {backgroundColor: dynamicColor, opacity: 0.1}]} />

                <Text style={styles.modalText}>{aiMessage}</Text>
              
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  modalConfirmButton: {
    height: 54,
    width: '100%',
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginLeft: 8,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  premiumPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1A202C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 20,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  premiumDescription: {
    fontSize: 15,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  premiumUsage: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 20,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  premiumButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 8,
  },
});