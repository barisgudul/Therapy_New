// app/feel/mood_comparison.tsx (Hook Hatası Düzeltilmiş Nihai Stabil Kod)
// --------------------------------------------------------------------------
// Bu sürüm, "Rules of Hooks" ihlalini gidermek için JSX içindeki
// inline useAnimatedStyle çağrısını en üst seviyeye taşır.
// Expo deps: expo-linear-gradient, expo-haptics, @react-native-async-storage/async-storage, react-native-reanimated

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { logEvent } from '../../utils/eventLogger';

// Sabitler ve Tipler
const { width, height } = Dimensions.get('window');
const LOTUS_SIZE = width * 0.7;
const TOP_LOTUS_SIZE = width * 0.18;

type MoodLevel = { id: number; label: string; color: string; bg: [string, string]; particleColor: string; umutRengi: string; };
type Step = 'loading' | 'reveal' | 'writing' | 'synthesis';
type ThemeType = { bg: [string, string]; tint: string; particleColor: string };
type DataType = { before: MoodLevel; after: MoodLevel; question: string; response: string; answer: string; };

// DİĞER SAYFALARLA UYUMLU, GÜNCELLENMİŞ RENK PALETİ
const MOOD_LEVELS: MoodLevel[] = [
    // Her bir renk için 'bg', 'particleColor' ve 'umutRengi' değerleri,
    // ana 'color'a uyumlu olacak şekilde yeniden düzenlendi.
    { id: 0, label: 'Çok Kötü', color: '#0D1B2A', bg: ['#02040F', '#0D1B2A'], particleColor: '#415A77', umutRengi: '#3B82F6' },
    { id: 1, label: 'Kötü',     color: '#1B263B', bg: ['#0D1B2A', '#1B263B'], particleColor: '#778DA9', umutRengi: '#60A5FA' },
    { id: 2, label: 'Üzgün',    color: '#415A77', bg: ['#1B263B', '#415A77'], particleColor: '#778DA9', umutRengi: '#60A5FA' },
    { id: 3, label: 'Nötr',     color: '#778DA9', bg: ['#415A77', '#778DA9'], particleColor: '#415A77', umutRengi: '#06B6D4' },
    { id: 4, label: 'İyi',      color: '#3B82F6', bg: ['#2B6CB0', '#3182CE'], particleColor: '#60A5FA', umutRengi: '#3B82F6' },
    { id: 5, label: 'Harika',   color: '#60A5FA', bg: ['#3182CE', '#63B3ED'], particleColor: '#3B82F6', umutRengi: '#60A5FA' },
    { id: 6, label: 'Mükemmel', color: '#06B6D4', bg: ['#155E75', '#0891B2'], particleColor: '#22D3EE', umutRengi: '#06B6D4' },
];

const defaultMood = MOOD_LEVELS[3];
const defaultData: DataType = { before: defaultMood, after: defaultMood, question: '', response: '', answer: '' };

const Particle = ({ particle, color }: { particle: any, color: string }) => {
    // @ts-expect-error reanimated transform type mismatch
    const animatedParticleStyle = useAnimatedStyle(() => {
        return {
            opacity: particle.opacity.value,
            transform: [
                { translateX: particle.x.value },
                { translateY: particle.y.value },
            ],
        };
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    backgroundColor: color,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                },
                animatedParticleStyle as any,
            ]}
        />
    );
};

const CosmicParticles = memo(({ color }: { color: string }) => {
    const particles = Array.from({ length: 15 }).map(() => ({
        size: Math.random() * 4 + 2,
        x: useSharedValue(Math.random() * width),
        y: useSharedValue(Math.random() * height),
        opacity: useSharedValue(Math.random() * 0.5 + 0.2),
        duration: Math.random() * 20000 + 15000,
    }));

    useEffect(() => {
        particles.forEach(p => {
            p.y.value = withRepeat(withTiming(p.y.value - height * 1.2, { duration: p.duration }), -1, false);
            p.x.value = withRepeat(withTiming(p.x.value + (Math.random() - 0.5) * 100, { duration: p.duration }), -1, true);
        });
    }, []);

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {particles.map((p, i) => (
                <Particle key={i} particle={p} color={color} />
            ))}
        </View>
    );
});

export default function MoodComparisonScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('loading');
    const [theme, setTheme] = useState<{ initial: ThemeType; final: ThemeType } | null>(null);
    const [data, setData] = useState<DataType | null>(null);
    const textInputRef = useRef<TextInput>(null);

    const transitionProgress = useSharedValue(0);
    const lotusProgress = useSharedValue(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 'currentSessionMood' adını 'before_mood_latest' olarak değiştirdim, diğer sayfalardaki yapıya uyumlu olsun diye
                const beforeMoodRaw = await AsyncStorage.getItem('before_mood_latest');
                const beforeMoodLabel = beforeMoodRaw ? JSON.parse(beforeMoodRaw).mood : defaultMood.label;
                
                const afterMoodRaw = await AsyncStorage.getItem('after_mood_latest');
                const afterMoodLabel = afterMoodRaw ? JSON.parse(afterMoodRaw).mood : defaultMood.label;
                const before = MOOD_LEVELS.find(m => m.label === beforeMoodLabel) || defaultMood;
                const after = MOOD_LEVELS.find(m => m.label === afterMoodLabel) || defaultMood;

                const initialTheme: ThemeType = { bg: before.bg, tint: before.color, particleColor: before.particleColor };
                let finalTheme: ThemeType;

                if (after.id > before.id) {
                    finalTheme = { bg: after.bg, tint: after.color, particleColor: after.particleColor };
                } else if (after.id < before.id) {
                    finalTheme = { bg: after.bg, tint: after.umutRengi, particleColor: after.umutRengi };
                } else {
                    finalTheme = { bg: after.bg, tint: after.color, particleColor: after.particleColor };
                }
                
                setTheme({ initial: initialTheme, final: finalTheme });
                setData({ before, after, question: "Bu değişimi nasıl yorumlarsın?", response: "Bu derin düşünceleri paylaştığın için teşekkürler. Her yansıma, yolculuğumuzu daha da aydınlatıyor.", answer: '' });
                setStep('reveal');
                transitionProgress.value = withDelay(500, withTiming(1, { duration: 4000, easing: Easing.bezier(0.25, 1, 0.5, 1) }));
            } catch (error) {
                console.error("Veri yüklenemedi:", error); setData(defaultData); setStep('reveal');
            }
        };
        loadData();
    }, []);

    const handleStartReflection = () => {
        if (step === 'reveal') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            lotusProgress.value = withSpring(1, { damping: 18, stiffness: 120 });
            setStep('writing');
        }
    };

    const handleSubmitReflection = async () => {
        if (!data?.answer.trim()) return;
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setStep('synthesis');

        // Merkezi olay kaydı
        try {
            await logEvent({
                type: 'mood_comparison_note',
                data: {
                    beforeMood: data.before.label,
                    afterMood: data.after.label,
                    note: data.answer
                }
            });
            console.log("Karşılaştırma ve not kaydedildi.");
        } catch (e) {
            console.error("Not kaydedilirken hata oluştu: ", e);
        }
    };

    const animatedBackgroundStyle = useAnimatedStyle(() => ({ opacity: transitionProgress.value }));
    const animatedFinalParticlesContainerStyle = useAnimatedStyle(() => ({ opacity: transitionProgress.value }));
    const animatedLotusTintStyle = useAnimatedStyle(() => ({
        tintColor: theme ? interpolateColor(transitionProgress.value, [0, 1], [theme.initial.tint, theme.final.tint]) : defaultMood.color
    }));
    const animatedLotusContainerStyle = useAnimatedStyle(() => {
        const size = interpolate(lotusProgress.value, [0, 1], [LOTUS_SIZE, TOP_LOTUS_SIZE]);
        const translateY = interpolate(lotusProgress.value, [0, 1], [0, -(height / 2) + (Platform.OS === "ios" ? 110 : 80)]);
        return { width: size, height: size, transform: [{ translateY }] };
    });

    if (!data || !theme) return <View style={styles.loadingContainer}><ActivityIndicator color="#A0AEC0" size="large" /></View>;

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme.initial.bg} style={StyleSheet.absoluteFill} />
            <CosmicParticles color={theme.initial.particleColor} />
            <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}><LinearGradient colors={theme.final.bg} style={StyleSheet.absoluteFill} /></Animated.View>
            
            <Animated.View style={[StyleSheet.absoluteFill, animatedFinalParticlesContainerStyle]}>
                <CosmicParticles color={theme.final.particleColor} />
            </Animated.View>

            <View style={styles.flexContainer}>
                <View style={styles.lotusPositioner}>
                    <Animated.View style={animatedLotusContainerStyle}>
                        <Animated.Image source={require('../../assets/therapy.png')} style={[styles.lotusImage, animatedLotusTintStyle]} />
                    </Animated.View>
                </View>

                <View style={styles.mainContent}>
                    {step === 'reveal' && (
                        <Animated.View entering={FadeIn.delay(800).duration(1000)} exiting={FadeOut.duration(300)} style={styles.revealContainer}>
                            <Text style={styles.headerText}>{data.before.label} <Ionicons name="arrow-forward" /> {data.after.label}</Text>
                            <TouchableOpacity style={[styles.reflectionButton]} onPress={handleStartReflection}>
                                <Text style={[styles.reflectionButtonText, { color: theme.final.tint }]}>Yansımanı Paylaş</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    {step === 'synthesis' && (
                        <Animated.View style={styles.synthesisContainer} entering={FadeInDown.duration(1000)}>
                            <Text style={styles.synthesisFinalText}>"{data.answer}"</Text>
                            <Text style={[styles.synthesisAI, { color: theme.final.tint }]}>{data.response}</Text>
                        </Animated.View>
                    )}
                </View>

                {step === 'synthesis' && (
                    <Animated.View style={styles.footer} entering={FadeIn.delay(800)}>
                        <TouchableOpacity style={styles.finishButton} onPress={() => router.replace('/')}><Text style={styles.finishButtonText}>Ana Sayfa</Text></TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            {step === 'writing' && (
                <View style={styles.centeredModalBackdrop}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavContainer}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Animated.View
                                    entering={FadeIn.duration(400).delay(100).springify().damping(15).stiffness(100)}
                                    style={[styles.centeredModalContainer, { shadowColor: theme.final.tint, borderColor: theme.final.tint }]}>
                                    <Text style={[styles.questionText, { color: theme.final.tint }]}>{data.question}</Text>
                                    <TextInput
                                        ref={textInputRef}
                                        style={[styles.input, { borderBottomColor: theme.final.tint, color: '#E2E8F0' }]}
                                        placeholder="Düşüncelerini özgürce yaz..."
                                        placeholderTextColor="#718096"
                                        value={data.answer}
                                        onChangeText={text => setData(p => ({ ...p!, answer: text }))}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                    <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.final.tint }]} onPress={handleSubmitReflection} activeOpacity={0.8}>
                                        <Text style={styles.submitButtonText}>Tamamla</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A202C' },
    flexContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' },
    particle: { position: 'absolute' },
    lotusPositioner: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    lotusImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 50 : 30, alignItems: 'center', zIndex: 15 },
    centeredModalBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,10,20,0.7)', zIndex: 20 },
    revealContainer: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 120 : 100, paddingBottom: height * 0.15 },
    synthesisContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: TOP_LOTUS_SIZE },
    headerText: { fontSize: 18, fontWeight: '500', color: '#E2E8F0' },
    reflectionButton: { paddingVertical: 18, paddingHorizontal: 35, borderRadius: 30, },
    reflectionButtonText: { fontSize: 16, fontWeight: 'bold' },
    synthesisFinalText: { fontSize: 22, color: '#E2E8F0', fontStyle: 'italic', lineHeight: 34, textAlign: 'center', marginBottom: 40, opacity: 0.9 },
    synthesisAI: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 24, lineHeight: 38, textAlign: 'center' },
    finishButton: { padding: 16 },
    finishButtonText: { fontSize: 16, color: '#A0AEC0', fontWeight: '500' },
    kavContainer: { width: '100%', justifyContent: 'center', alignItems: 'center' },
    centeredModalContainer: {
        width: width * 0.9,
        maxWidth: 400,
        padding: 30,
        paddingBottom: 25,
        borderRadius: 24,
        backgroundColor: 'rgba(26, 32, 44, 0.95)',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 20,
    },
    questionText: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 32 },
    input: {
        minHeight: 120,
        maxHeight: height * 0.3,
        fontSize: 18,
        lineHeight: 28,
        paddingBottom: 10,
        marginBottom: 30,
        borderBottomWidth: 1.5,
    },
    submitButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 30 },
    submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#1A202C' },
});