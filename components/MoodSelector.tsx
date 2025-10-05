// components/MoodSelector.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import { MOOD_LEVELS } from '../constants/moods';

const { width } = Dimensions.get('window');
const ORB_SIZE = width * 0.7;

type MoodSelectorProps = {
  title: string;
  buttonText: string;
  onSave: (moodLabel: string) => Promise<void>;
};

export default function MoodSelector({ title, buttonText, onSave }: MoodSelectorProps) {
    const [moodIndex, setMoodIndex] = useState(3);
    const progress = useSharedValue(3);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
            ), -1, true );
    }, [opacity, scale]);

    
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

    const handleConfirm = () => {
      const currentMoodLabel = MOOD_LEVELS[moodIndex]?.label || 'Nötr';
      onSave(currentMoodLabel);
    };

    // --- ANİMASYONLU STİLLER ---
    const animatedOrbStyle = useAnimatedStyle(() => {
        const inputRange = MOOD_LEVELS.map((_, i) => i);
        const colors = MOOD_LEVELS.map(m => m.color);
        const shadows = MOOD_LEVELS.map(m => m.shadow);
        return {
            transform: [{ scale: scale.value }],
            backgroundColor: interpolateColor(progress.value, inputRange, colors),
            shadowColor: interpolateColor(progress.value, inputRange, shadows),
        };
    });

    const animatedContentStyle = useAnimatedStyle(() => ({
        color: progress.value > 4.5 ? '#1A202C' : 'rgba(255,255,255,0.8)',
    }));

    const animatedTextContainerStyle = useAnimatedStyle(() => ({
        opacity: scale.value > 1.1 ? withTiming(0) : withTiming(1),
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F7FAFC', '#E2E8F0']}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.contentContainer, { opacity }]}> 
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.moodLabel}>{MOOD_LEVELS[moodIndex]?.label || 'Nötr'}</Text>
                </View>
                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} testID="mood-orb">
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
                <TouchableOpacity style={styles.button} onPress={handleConfirm}>
                     <Ionicons name="checkmark" size={24} color="#1A202C" />
                    <Text style={styles.buttonText}>{buttonText}</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

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