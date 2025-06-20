import { Ionicons } from '@expo/vector-icons';
// Çalıştığını bildiğimiz Slider
import { Slider } from '@miblanchard/react-native-slider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
// ** GÜNCELLEME: react-native'den 'Animated' ve 'Image' import ediliyor **
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


// ---- Tema ve Palet ----
const BRAND_TINT = '#5D8BF4';
const BRAND_LAVENDER = '#C7B8E6';
const BRAND_WARM_GLOW = '#FFDCA8';

const MOOD_LEVELS = [
    { label: 'Durgun', color: '#6A7A9E' }, { label: 'Melankolik', color: '#6E85C7' },
    { label: 'Düşünceli', color: BRAND_LAVENDER }, { label: 'Nötr', color: BRAND_TINT },
    { label: 'Huzurlu', color: '#64B5F6' }, { label: 'Neşeli', color: '#82C3FF' },
    { label: 'Aydınlanmış', color: BRAND_WARM_GLOW },
];

const THEME = {
    bg: ['#12182B', '#1C2744'] as const, fontLight: '#F0F4FF', fontMuted: '#A8B2D1',
};
// ----------------------------------------------------


export default function DenemeScreen() {
    const [moodValue, setMoodValue] = useState(3);
    const [isSaving, setIsSaving] = useState(false);

    // ** GÜNCELLEME: Standart Animated.Value kullanılıyor **
    const entryProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(entryProgress, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true, // Performans için önemli
        }).start();
    }, []);

    const handleValueChange = (value: number[]) => {
        setMoodValue(value[0]); 
    };
    
    const handleSlidingComplete = (value: number[]) => {
        const roundedValue = Math.round(value[0]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMoodValue(roundedValue); // Sadece state'i güncelle
    };

    const currentMood = MOOD_LEVELS[Math.round(moodValue)];

    // Giriş animasyonları için stil hesaplamaları
    const headerAnim = {
        opacity: entryProgress,
        transform: [{ translateY: entryProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
        })}]
    };
    
    // Gecikmeli animasyon için
    const createDelayedAnimation = (delay: number) => {
        const delayedProgress = entryProgress.interpolate({
            inputRange: [delay / 800, 1],
            outputRange: [0, 1],
            extrapolate: 'clamp'
        })
        return {
             opacity: delayedProgress,
            transform: [{
                translateY: delayedProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                })
            }]
        }
    }
    
    const imageAnim = createDelayedAnimation(150);
    const moodLabelAnim = createDelayedAnimation(300);
    const sliderAnim = createDelayedAnimation(450);
    const actionsAnim = createDelayedAnimation(600);

    return (
        <LinearGradient colors={THEME.bg} style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={[styles.headerContainer, headerAnim]}>
                    <Text style={styles.headerTitle}>Günün Yansıması</Text>
                    <Text style={styles.headerSubtitle}>Bugün iç dünyanda hangi renkler dans ediyor?</Text>
                </Animated.View>
                <View style={styles.moodSelectorContainer}>
                   <Animated.Image
                        source={require('../assets/therapy.png')}
                        style={[styles.moodImage, {tintColor: currentMood?.color}, imageAnim]}
                   />
                   <Animated.View style={moodLabelAnim}>
                       <Text style={[styles.moodLabel, {color: currentMood?.color}]}>
                         {currentMood?.label ?? 'Nötr'}
                       </Text>
                   </Animated.View>
                   <Animated.View style={[{width: '100%'}, sliderAnim]}>
                      <Slider
                        minimumValue={0}
                        maximumValue={6}
                        step={0.01}
                        value={moodValue}
                        onValueChange={handleValueChange}
                        onSlidingComplete={handleSlidingComplete}
                        containerStyle={styles.sliderContainer}
                        trackStyle={styles.sliderTrack}
                        thumbStyle={{ ...styles.sliderThumb, backgroundColor: currentMood?.color }}
                        minimumTrackTintColor={currentMood?.color ?? BRAND_TINT}
                      />
                  </Animated.View>
                </View>
                <Animated.View style={[styles.mainActions, actionsAnim]}>
                     <TouchableOpacity style={[styles.saveBtn, {backgroundColor: currentMood?.color}]} disabled={isSaving}>
                         <Ionicons name="sparkles-outline" size={24} color={THEME.fontLight} />
                         <Text style={styles.saveText}>Analizi Başlat</Text>
                     </TouchableOpacity>
                </Animated.View> 
            </View> 
        </LinearGradient> 
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 70, paddingBottom: 50, justifyContent: 'space-between' },
  headerContainer: { alignItems: 'center', marginBottom: 20, },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: THEME.fontLight, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: THEME.fontMuted, marginTop: 4, },
  moodSelectorContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, },
  moodImage: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 25 },
  moodLabel: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: -1,
    marginBottom: 20,
  },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(168, 178, 209, 0.2)',
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFF',
    // Arka plan rengi dinamik olarak verilecek
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mainActions: { gap: 20, paddingBottom: 20 },
  saveBtn: {
    height: 60, borderRadius: 30, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: THEME.fontLight, fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
});