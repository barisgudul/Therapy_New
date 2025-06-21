// app/after_feeling.tsx (Seans Sonrası Ruh Hali)
// -----------------------------------------------------------------------
// Expo deps: expo-haptics expo-linear-gradient @react-native-async-storage/async-storage react-native-reanimated

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
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

// --- Tasarım Sabitleri ---
const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.7;

const MOOD_LEVELS = [
    { label: 'Çok Kötü', color: '#4A5568', shadow: '#A0AEC0' },
    { label: 'Kötü', color: '#718096', shadow: '#CBD5E0' },
    { label: 'Üzgün', color: '#2C5282', shadow: '#63B3ED' },
    { label: 'Nötr', color: '#319795', shadow: '#4FD1C5' },
    { label: 'İyi', color: '#D69E2E', shadow: '#F6E05E' },
    { label: 'Harika', color: '#DD6B20', shadow: '#FBD38D' },
    { label: 'Mükemmel', color: '#9B2C2C', shadow: '#F56565' },
];

const saveAfterMood = async (moodLabel: string) => {
    try {
        const entry = { 
            mood: moodLabel, 
            timestamp: Date.now(),
            type: 'after'
        };
        await AsyncStorage.setItem(`after_mood_${Date.now()}`, JSON.stringify(entry));
        // En son after mood'u da ayrıca kaydet (mood_comparison için)
        await AsyncStorage.setItem('after_mood_latest', JSON.stringify(entry));
        console.log('After mood saved:', entry);
    } catch (e) { console.error('Failed to save after mood.', e); }
};

// --- Ana Bileşen ---
export default function AfterFeelingScreen() {
    const router = useRouter();
    const [moodIndex, setMoodIndex] = useState(3);

    // Reanimated Değerleri
    const scale = useSharedValue(1);
    const progress = useSharedValue(3); // Başlangıç mood'u
    const opacity = useSharedValue(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Bekleme ("Nefes Alma") Animasyonu
    useEffect(() => {
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);
    
    // Kullanıcı basılı tuttuğunda
    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Önceki animasyonu durdur
        scale.value = withSpring(1.3, { damping: 10, stiffness: 200 });

        // Ruh halleri arasında döngü yap
        intervalRef.current = setInterval(() => {
            const nextValue = (progress.value + 1) % MOOD_LEVELS.length;
            progress.value = withTiming(nextValue, { duration: 150 });
            setMoodIndex(nextValue);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 600);
    };

    // Kullanıcı parmağını çektiğinde
    const handlePressOut = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        // Nefes alma animasyonuna geri dön
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    };

    // Animasyonlu Stiller
    const animatedOrbStyle = useAnimatedStyle(() => {
        const inputRange = MOOD_LEVELS.map((_, i) => i);
        const colorRange = MOOD_LEVELS.map(m => m.color);
        const shadowRange = MOOD_LEVELS.map(m => m.shadow);

        return {
            transform: [{ scale: scale.value }],
            backgroundColor: interpolateColor(progress.value, inputRange, colorRange),
            shadowColor: interpolateColor(progress.value, inputRange, shadowRange),
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: scale.value > 1.1 ? withTiming(0) : withTiming(1),
    }));

    // Kaydetme İşlemi
    const handleSave = async () => {
        const currentMoodLabel = MOOD_LEVELS[moodIndex].label;
        await saveAfterMood(currentMoodLabel);
        opacity.value = withTiming(0, { duration: 400 });
        setTimeout(() => {
            // Mood comparison sayfasına yönlendir
            router.replace('/feel/mood_comparison');
        }, 400);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F7FAFC', '#E2E8F0']} style={StyleSheet.absoluteFill} />

            <Animated.View style={[styles.contentContainer, { opacity }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Seans Sonrası Ruh Hali</Text>
                    <Text style={styles.moodLabel}>{MOOD_LEVELS[moodIndex].label}</Text>
                </View>
                
                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                    <Animated.View style={[styles.orb, animatedOrbStyle]}>
                        <LinearGradient 
                          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} 
                          style={styles.orbHighlight}
                        />
                         <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                             <Ionicons name="finger-print-outline" size={32} color="rgba(255,255,255,0.7)"/>
                             <Text style={styles.instructionText}>Hissetmek için basılı tut</Text>
                        </Animated.View>
                    </Animated.View>
                </Pressable>

                <TouchableOpacity style={styles.button} onPress={handleSave}>
                     <Ionicons name="checkmark" size={24} color="#1A202C" />
                    <Text style={styles.buttonText}>Tamamla</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// --- Stil Sayfası ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        color: '#A0AEC0',
        fontWeight: '500',
    },
    moodLabel: {
        fontSize: 36,
        color: '#2D3748',
        fontWeight: 'bold',
        marginTop: 4,
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
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        marginBottom: '15%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginLeft: 8,
    },
});