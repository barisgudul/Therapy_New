// app/feel/mood_comparison.tsx (Lotus Ortalandı - Tam ve Eksiksiz Final Kod)
// -----------------------------------------------------------------------
// Expo deps: expo-linear-gradient, expo-haptics, @react-native-async-storage/async-storage, react-native-reanimated

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// Sabitler
const { width, height } = Dimensions.get('window');
const LOTUS_SIZE = width * 0.7;
const SMALL_LOTUS_SIZE = width * 0.2;

// Tipler
type MoodLevel = { id: number; label: string; color: string; zıttı: string; bg: [string, string]; };
type Step = 'loading' | 'reveal' | 'question' | 'synthesis';
type ThemeType = { bg: [string, string]; tint: string; color: string; text: string; subtleText: string; isImproving: boolean };
type DataType = { before: MoodLevel; after: MoodLevel; question: string; response: string; name: string; answer: string; };

const MOOD_LEVELS: MoodLevel[] = [
    { id: 0, label: 'Çok Kötü', color: '#4A5568', zıttı: '#F56565', bg: ['#EDF2F7', '#F7FAFC'] },
    { id: 1, label: 'Kötü', color: '#718096', zıttı: '#ED8936', bg: ['#EDF2F7', '#F7FAFC'] },
    { id: 2, label: 'Üzgün', color: '#4299E1', zıttı: '#F6E05E', bg: ['#EBF8FF', '#FFFFFF'] },
    { id: 3, label: 'Nötr', color: '#4FD1C5', zıttı: '#ED64A6', bg: ['#E6FFFA', '#FFFFFF'] },
    { id: 4, label: 'İyi', color: '#F6E05E', zıttı: '#63B3ED', bg: ['#FFFFF0', '#FFFFFF'] },
    { id: 5, label: 'Harika', color: '#ED8936', zıttı: '#4FD1C5', bg: ['#FFF5EB', '#FFFFFF'] },
    { id: 6, label: 'Mükemmel', color: '#F56565', zıttı: '#48BB78', bg: ['#FFF5F5', '#FFFFFF'] },
];

const defaultMood = MOOD_LEVELS[3];
const defaultTheme: ThemeType = { bg: defaultMood.bg, tint: defaultMood.color, color: defaultMood.color, text: '#1A202C', subtleText: '#718096', isImproving: true };
const defaultData: DataType = { before: defaultMood, after: defaultMood, question: '', response: '', name: 'Terapistiniz', answer: '' };

export default function MoodComparisonScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('loading');
    const [theme, setTheme] = useState<ThemeType>(defaultTheme);
    const [data, setData] = useState<DataType | null>(null);

    const progress = useSharedValue(0);
    const stepProgress = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const load = async () => {
            try {
                const therapistData = JSON.parse(await AsyncStorage.getItem('selectedTherapist') || '{}');
                const before = MOOD_LEVELS.find(async m => m.label === (await AsyncStorage.getItem('currentSessionMood'))) || MOOD_LEVELS[3];
                const after = MOOD_LEVELS.find(async m => m.label === (JSON.parse(await AsyncStorage.getItem('after_mood_latest') || '{}')).mood) || MOOD_LEVELS[4];
                const isImproving = after.id >= before.id;

                let currentTheme: ThemeType;
                if (isImproving) {
                    currentTheme = { bg: after.bg, tint: after.color, color: after.color, text: '#1A202C', subtleText: '#4A5568', isImproving };
                } else {
                    currentTheme = { bg: after.bg, tint: after.zıttı, color: after.color, text: after.color, subtleText: '#718096', isImproving };
                }
                
                setTheme(currentTheme);
                setData({
                    before, after, name: therapistData.name || "Terapistiniz",
                    question: "Bu seans sonrası hislerindeki değişimi nasıl yorumlarsın?",
                    response: "Bu değerli geri bildirimin için teşekkür ederim. Düşüncelerin, yolculuğumuz için çok anlamlı.",
                    answer: ''
                });

                setStep('reveal');
                progress.value = withDelay(200, withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }));
                opacity.value = withTiming(1, { duration: 800 });
            } catch (error) {
                console.error("Failed to load data:", error);
                setData(defaultData);
                setTheme(defaultTheme);
                setStep('reveal');
            }
        };
        load();
    }, []);

    const handlePressLotus = () => {
        if (step === 'reveal') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep('question');
            stepProgress.value = withSpring(1, { damping: 15, stiffness: 100 });
        }
    };

    const handleSubmitAnswer = () => {
        if (!data?.answer) return;
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setStep('synthesis');
    };

    const animatedAfterBgStyle = useAnimatedStyle(() => ({
        opacity: progress.value
    }));

    const animatedLotusContainerStyle = useAnimatedStyle(() => {
        const size = interpolate(stepProgress.value, [0, 1], [LOTUS_SIZE, SMALL_LOTUS_SIZE]);
        const initialTranslate = -size / 2;
        const verticalPosition = interpolate(stepProgress.value, [0, 1], [initialTranslate, -(height / 2 - 130)]);
        return {
            width: size,
            height: size,
            transform: [{ translateX: initialTranslate }, { translateY: verticalPosition }],
        };
    }, []);
    
    const animatedLotusImageStyle = useAnimatedStyle(() => {
        if (!data || !theme) return {};
        return {
            tintColor: interpolateColor(progress.value, [0, 1], [data.before.color, theme.color]),
        };
    }, [data, theme]);
    
    const animatedCoreStyle = useAnimatedStyle(() => {
        if (!theme) return {};
        const coreSizeRatio = 0.23;
        const currentSize = interpolate(stepProgress.value, [0, 1], [LOTUS_SIZE, SMALL_LOTUS_SIZE]);
        const size = currentSize * coreSizeRatio;

        return {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.tint,
            opacity: withRepeat(withSequence(withTiming(theme.isImproving ? 0.3 : 1, { duration: 2000 }), withTiming(theme.isImproving ? 0.1 : 0.7, { duration: 2000 })), -1, true),
        };
    }, [theme]);
    
    const animatedPromptStyle = useAnimatedStyle(() => ({
        opacity: interpolate(stepProgress.value, [0, 0.5], [1, 0]),
        transform: [{ scale: withRepeat(withSequence(withTiming(1.05, { duration: 2000 }), withTiming(1, { duration: 2000 })), -1, true) }],
    }));
    
    const animatedContentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(stepProgress.value, [0.5, 1], [0, 1]),
    }));

    if (!data) return <View style={styles.loadingContainer}><ActivityIndicator color="#A0AEC0" /></View>;

    return (
        <View style={styles.baseContainer}>
            <LinearGradient colors={data.before.bg} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, animatedAfterBgStyle]}>
                <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <Animated.View style={[styles.container, { opacity }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerText, { color: theme.subtleText }]}>{data.before.label}</Text>
                        <Ionicons name="arrow-forward" size={16} color={theme.subtleText} style={styles.headerArrow} />
                        <Text style={[styles.headerText, { color: theme.text, fontWeight: 'bold' }]}>{data.after.label}</Text>
                    </View>
                    
                    <TouchableOpacity activeOpacity={1} style={styles.flexContainer} onPress={() => step === 'question' && Keyboard.dismiss()}>
                        {(step === 'reveal' || step === 'question') && (
                            <>
                                <Animated.View style={[styles.lotusContainer, animatedLotusContainerStyle]}>
                                    <TouchableOpacity activeOpacity={0.9} onPress={handlePressLotus} disabled={step !== 'reveal'}>
                                        <View style={styles.lotusImageWrapper}>
                                            <Animated.Image source={require('../../assets/therapy.png')} style={[styles.lotusImage, animatedLotusImageStyle]} />
                                            <Animated.View style={[styles.lotusCore, animatedCoreStyle]} />
                                        </View>
                                    </TouchableOpacity>
                                    <Animated.Text style={[styles.promptText, { color: theme.tint }, animatedPromptStyle]}>Yansıtmak için dokun</Animated.Text>
                                </Animated.View>

                                <Animated.View style={[styles.questionArea, animatedContentStyle]}>
                                    <Text style={[styles.questionText, { color: theme.text }]}>{data.question}</Text>
                                    <View>
                                        <TextInput
                                            style={[styles.input, { color: theme.text }]}
                                            placeholder='...'
                                            placeholderTextColor={theme.subtleText}
                                            value={data.answer}
                                            onChangeText={text => setData(p => ({ ...p!, answer: text }))}
                                            multiline
                                        />
                                        <View style={[styles.inputLine, { backgroundColor: theme.tint }]} />
                                    </View>
                                    <TouchableOpacity style={[styles.sendButton, { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]} onPress={handleSubmitAnswer}>
                                        <Text style={[styles.sendButtonText, { color: theme.tint }]}>Yansımamı Tamamla</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </>
                        )}
                        {step === 'synthesis' && (
                            <View style={styles.synthesisContainer}>
                                <Image source={require('../../assets/therapy.png')} style={[styles.synthesisLotus, { tintColor: theme.tint }]} />
                                <Text style={[styles.synthesisFinalText, { color: theme.subtleText }]}>"{data.answer}"</Text>
                                <Text style={[styles.synthesisAI, { color: theme.tint }]}>{data.response}</Text>
                                <TouchableOpacity style={styles.finishButton} onPress={() => router.replace('/')}>
                                    <Text style={styles.finishButtonText}>Ana Sayfa</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    baseContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' },
    container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, alignItems: 'center' },
    header: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    headerText: { fontSize: 16, fontWeight: '500' },
    headerArrow: { marginHorizontal: 8, opacity: 0.8 },
    flexContainer: { flex: 1, width: '100%' },
    lotusContainer: { position: 'absolute', top: '50%', left: '50%', alignItems: 'center' },
    lotusImageWrapper: { justifyContent: 'center', alignItems: 'center' },
    lotusImage: { resizeMode: 'contain', width: '100%', height: '100%' },
    lotusCore: { borderRadius: 999, position: 'absolute' },
    promptText: { position: 'absolute', bottom: -50, fontSize: 16, fontWeight: '600' },
    questionArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 30, paddingBottom: 40, width: '100%' },
    questionText: { fontSize: 22, fontWeight: '600', color: '#1A202C', textAlign: 'center', marginBottom: 30, lineHeight: 32 },
    input: { fontSize: 18, lineHeight: 28, minHeight: 100, textAlignVertical: 'top', paddingHorizontal: 10, paddingBottom: 10 },
    inputLine: { height: 1.5, width: '100%', opacity: 0.6, borderRadius: 1 },
    sendButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 30, marginTop: 20, borderWidth: 1.5 },
    sendButtonText: { fontSize: 16, fontWeight: 'bold' },
    synthesisContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, width: '100%'},
    synthesisLotus: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 40, opacity: 0.8 },
    synthesisFinalText: { fontSize: 20, fontStyle: 'italic', lineHeight: 30, textAlign: 'center', marginBottom: 30, opacity: 0.8 },
    synthesisAI: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, lineHeight: 38, textAlign: 'center', fontWeight: '400' },
    finishButton: { position: 'absolute', bottom: 40, padding: 16 },
    finishButtonText: { fontSize: 16, color: '#A0AEC0', fontWeight: '500' }
});