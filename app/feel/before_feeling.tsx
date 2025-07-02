// app/before_feeling.tsx (Seans Öncesi Ruh Hali)
// -----------------------------------------------------------------------
// Expo deps: expo-haptics expo-linear-gradient @react-native-async-storage/async-storage react-native-reanimated

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { logEvent } from '../../utils/eventLogger';

// --- TASARIM SABİTLERİ ---
const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.7;

// NİHAİ VE GÖRÜNÜRLÜĞÜ YÜKSEK PALET: "Yoğunluktan Parlaklığa"
const MOOD_LEVELS = [
    { label: 'Çok Kötü', color: '#0D1B2A', shadow: '#02040F' }, // 0: Derin Gece Mavisi
    { label: 'Kötü',     color: '#1B263B', shadow: '#0D1B2A' }, // 1: Ağır Deniz Mavisi
    { label: 'Üzgün',    color: '#415A77', shadow: '#1B263B' }, // 2: Kasvetli Mavi
    { label: 'Nötr',     color: '#778DA9', shadow: '#415A77' }, // 3: Sakin Mavi
    { label: 'İyi',      color: '#3B82F6', shadow: '#778DA9' }, // 4: Canlı Mavi
    { label: 'Harika',   color: '#60A5FA', shadow: '#3B82F6' }, // 5: Gök Mavisi
    { label: 'Mükemmel', color: '#06B6D4', shadow: '#60A5FA' }, // 6: Turkuaz Enerji
];

// --- YARDIMCI KAYIT FONKSİYONU ---
const saveBeforeMood = async (moodLabel: string) => {
    try {
        const entry = { mood: moodLabel, timestamp: Date.now() };
        // Karşılaştırma için sadece en sonuncuyu saklamamız yeterli.
        await AsyncStorage.setItem('before_mood_latest', JSON.stringify(entry));
        console.log('✅ Before mood saved:', entry);
    } catch (e) {
        console.error('Failed to save before mood.', e);
    }
};

// --- ANA BİLEŞEN ---
export default function BeforeFeelingScreen() {
    const router = useRouter();
    const { sessionType, therapistId } = useLocalSearchParams<{ sessionType?: string, therapistId?: string }>();
    const [moodIndex, setMoodIndex] = useState(3);

    // Reanimated Değerleri
    const progress = useSharedValue(3); 
    const scale = useSharedValue(1);    
    const opacity = useSharedValue(0);  
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ), -1, true );
    }, []);

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(1.3, { damping: 10, stiffness: 200 });
        intervalRef.current = setInterval(() => {
            const currentValue = Math.round(progress.value);
            const nextValue = (currentValue + 1) % MOOD_LEVELS.length;
            if (currentValue === 6 && nextValue === 0) {
                progress.value = withTiming(nextValue, { duration: 50 });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else {
                progress.value = withTiming(nextValue, { duration: 200 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setMoodIndex(nextValue);
        }, 600);
    };

    const handlePressOut = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ), -1, true );
    };

    const handleSave = async () => {
        const currentMoodLabel = MOOD_LEVELS[moodIndex].label;
        // Önce veriyi kaydet
        await saveBeforeMood(currentMoodLabel);
        // Sonra olayları logla
        await logEvent({
            type: 'session_start',
            mood: currentMoodLabel,
            data: { sessionType, therapistId }
        });
        opacity.value = withTiming(0, { duration: 400 });
        setTimeout(() => {
            if (!sessionType || !therapistId) {
                router.back();
                return;
            }
            router.replace({
                pathname: `/sessions/${sessionType}_session`,
                params: { therapistId }
            });
        }, 400);
    };

    // --- ANİMASYONLU STİLLER ---
    const animatedOrbStyle = useAnimatedStyle(() => {
        const inputRange = MOOD_LEVELS.map((_, i) => i);
        return {
            transform: [{ scale: scale.value }],
            backgroundColor: interpolateColor(progress.value, inputRange, MOOD_LEVELS.map(m => m.color)),
            shadowColor: interpolateColor(progress.value, inputRange, MOOD_LEVELS.map(m => m.shadow)),
        };
    });

    const animatedContentStyle = useAnimatedStyle(() => ({
        color: progress.value > 3.5 ? '#1A202C' : 'rgba(255,255,255,0.8)',
    }));

    const animatedTextContainerStyle = useAnimatedStyle(() => ({
        opacity: scale.value > 1.1 ? withTiming(0) : withTiming(1),
    }));

    // --- RENDER ---
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F7FAFC', '#E2E8F0']}
                style={StyleSheet.absoluteFill}
            />
            
            <Animated.View style={[styles.contentContainer, { opacity }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        Seans Öncesi Ruh Hali
                    </Text>
                    <Text style={styles.moodLabel}>
                        {MOOD_LEVELS[moodIndex].label}
                    </Text>
                </View>

                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                    <Animated.View style={[styles.orb, animatedOrbStyle]}>
                        <LinearGradient 
                          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} 
                          style={styles.orbHighlight}
                        />
                         <Animated.View style={[styles.textContainer, animatedTextContainerStyle]}>
                             <Animated.Text style={animatedContentStyle}>
                                 <Ionicons name="finger-print-outline" size={32} />
                             </Animated.Text>
                             <Animated.Text style={[styles.instructionText, animatedContentStyle]}>
                                 Hissetmek için basılı tut
                             </Animated.Text>
                        </Animated.View>
                    </Animated.View>
                </Pressable>
                
                <TouchableOpacity style={styles.button} onPress={handleSave}>
                     <Ionicons name="checkmark" size={24} color="#1A202C" />
                    <Text style={styles.buttonText}>Seansa Başla</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// --- STİL SAYFASI ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        paddingTop: '20%',
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        color: '#A0AEC0', 
    },
    moodLabel: {
        fontSize: 36,
        fontWeight: 'bold',
        marginTop: 4,
        color: '#2D3748',
    },
    orb: {
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: ORB_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    orbHighlight: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: ORB_SIZE / 2,
    },
    textContainer: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    instructionText: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '500',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        marginBottom: '15%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginLeft: 8,
    },
});