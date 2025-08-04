// app/daily_write.tsx - KESİN FİNAL HALİ

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Animated,
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

// SADECE GÖRSEL KOMPONENTLER, SABİTLER, STİLLER VE KENDİ HOOK'UMUZ
import { GradientHeader } from '../components/daily_write/GradientHeader';
import { GradientMoodImage } from '../components/daily_write/GradientMoodImage';
import { GradientMoodLabel } from '../components/daily_write/GradientMoodLabel';
import { MOOD_LEVELS, tokens } from '../constants/dailyWrite.constants';
import { useDailyWrite } from '../hooks/useDailyWrite';
import { styles } from '../styles/dailyWrite.styles';
import { hexToRgb, interpolateColor } from '../utils/color.utils';

export default function DailyWriteScreen() {
    const { state, handlers } = useDailyWrite();

    if (state.freemium.loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    if (!state.freemium.can_use) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
                <View style={styles.premiumPrompt}>
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.premiumCard}>
                        <View style={styles.premiumHeader}>
                            <Ionicons name="diamond" size={32} color="white" />
                            <Text style={styles.premiumTitle}>Günlük Limit Doldu</Text>
                        </View>
                        <Text style={styles.premiumDescription}>
                            Günde 1 duygu günlüğü yazabilirsiniz. Premium planla sınırsız günlük yazabilirsiniz.
                        </Text>
                        <Text style={styles.premiumUsage}>
                            Kullanım: {state.freemium.used_count}/{state.freemium.limit_count}
                        </Text>
                        <TouchableOpacity style={styles.premiumButton} onPress={() => handlers.router.push('/subscription')}>
                            <Text style={styles.premiumButtonText}>Premium&apos;a Geç</Text>
                            <Ionicons name="arrow-forward" size={20} color="#6366F1" />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </SafeAreaView>
        );
    }

    const startIndex = Math.floor(state.moodValue);
    const endIndex = Math.min(startIndex + 1, MOOD_LEVELS.length - 1);
    const factor = state.moodValue - startIndex;
    const dynamicColor = interpolateColor(MOOD_LEVELS[startIndex].color, MOOD_LEVELS[endIndex].color, factor);
    const currentMood = MOOD_LEVELS[Math.round(state.moodValue)];
    const gradientColors: [string, string] = [dynamicColor, tokens.tintMain];

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={['#F6F8FA', '#FFFFFF']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.light, styles.light1, { transform: state.light1.getTranslateTransform() }]} />
            <Animated.View style={[styles.light, styles.light2, { transform: state.light2.getTranslateTransform() }]} />

            <GradientHeader text="Duygu Günlüğü" colors={gradientColors} />

            <Animated.View style={[styles.container, state.fadeIn]}>
                <View style={styles.mainContent}>
                    <BlurView intensity={50} tint="light" style={[styles.card, styles.moodCard, { borderColor: dynamicColor }]}>
                        <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
                        <View style={styles.moodBlock}>
                            <GradientMoodImage colors={gradientColors} />
                            <GradientMoodLabel text={currentMood.label} colors={gradientColors} />
                        </View>
                    </BlurView>
                    <View style={{ marginTop: -16, marginBottom: 16, paddingHorizontal: 10 }}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={MOOD_LEVELS.length - 1}
                            step={0.01}
                            value={state.moodValue}
                            onValueChange={handlers.setMoodValue}
                            onSlidingComplete={handlers.onSlidingComplete}
                            minimumTrackTintColor={dynamicColor}
                            maximumTrackTintColor="rgba(93,161,217,0.15)"
                            thumbTintColor={dynamicColor}
                        />
                    </View>
                    <TouchableOpacity onPress={() => { handlers.animatePress(); handlers.setInputVisible(true); }} activeOpacity={0.8}>
                        <BlurView intensity={50} tint="light" style={[styles.card, styles.promptCard]}>
                            <Ionicons name="create-outline" size={24} color={dynamicColor} />
                            <Text numberOfLines={1} style={[styles.promptText, state.note && styles.promptFilled]}>
                                {state.note || "Bugün'ün duygularını ve düşüncelerini buraya yaz..."}
                            </Text>
                        </BlurView>
                    </TouchableOpacity>
                </View>
                <Animated.View style={[{ transform: [{ scale: state.scaleAnim }] }]}>
                    <TouchableOpacity disabled={!state.note || state.saving} activeOpacity={0.85} onPress={() => {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);handlers.saveSession();}}>
                        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={gradientColors} style={[styles.saveBtn, (!state.note || state.saving) && { opacity: 0.5 }]}>
                            <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                            <Text style={styles.saveText}>{state.saving ? 'Kaydediliyor...' : 'Günlüğü Tamamla'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            <Modal visible={state.inputVisible} transparent animationType="fade" onRequestClose={() => handlers.setInputVisible(false)}>
                <TouchableWithoutFeedback onPress={() => handlers.setInputVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView 
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                            style={styles.modalContainer}
                            >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => handlers.setInputVisible(false)} style={styles.modalBackButton}>
                                        <Ionicons name="chevron-back" size={26} color={dynamicColor} />
                                    </TouchableOpacity>
                                    <View style={styles.modalIconContainer}>
                                        <LinearGradient colors={['#f0f4fa', '#e6eaf1']} style={styles.modalIconGradient}>
                                            <Ionicons name="chatbubble-ellipses-outline" size={28} color={dynamicColor} />
                                        </LinearGradient>
                                    </View>
                                    <View style={{ width: 44, height: 44 }} />
                                </View>
                                <View style={styles.modalTitleContainer}>
                                    <Text style={styles.modalTitle}>Bugün Nasılsın?</Text>
                                    <Text style={styles.modalSubtitle}>Duygularını ve düşüncelerini güvenle paylaşabilirsin.</Text>
                                </View>
                                <View style={[styles.modalDivider, { backgroundColor: dynamicColor, opacity: 0.1 }]} />
                                <View style={styles.inputWrapper}>
                                    <View style={[styles.inputContainer, { borderColor: `rgba(${hexToRgb(dynamicColor)}, 0.4)` }]}>
                                        <TextInput
                                            maxLength={1000}
                                            style={styles.input}
                                            value={state.note}
                                            onChangeText={handlers.setNote}
                                            placeholder="İçinden geçenleri anlatmak ister misin?"
                                            placeholderTextColor="#A0AEC0"
                                            multiline
                                            autoFocus
                                            selectionColor={dynamicColor}
                                        />
                                        <View style={[styles.inputDecoration, { backgroundColor: `rgba(${hexToRgb(dynamicColor)}, 0.1)` }]} />
                                    </View>
                                    <Text style={styles.charCounter}>
                                    {state.note.length} / 1000
                                </Text>
                                </View>
                                <TouchableOpacity style={[styles.modalConfirmButton, { borderColor: `rgba(${hexToRgb(dynamicColor)}, 0.2)` }]} onPress={() => handlers.setInputVisible(false)} activeOpacity={0.7}>
                                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                                    <Ionicons name="checkmark-done-circle-outline" size={22} color={dynamicColor} />
                                    <Text style={[styles.modalConfirmButtonText, { color: dynamicColor }]}>Tamam</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal visible={state.feedbackVisible} transparent animationType="fade" onRequestClose={handlers.closeFeedback}>
                <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                        style={styles.modalContainer}
                    >
                    <TouchableWithoutFeedback onPress={handlers.closeFeedback} style={StyleSheet.absoluteFill}>
                         <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>
                     <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                           <TouchableOpacity onPress={handlers.closeFeedback} style={styles.modalBackButton}>
                                <Ionicons name="chevron-back" size={26} color={dynamicColor} />
                            </TouchableOpacity>
                            <View style={styles.modalIconContainer}>
                                <LinearGradient colors={['#f0f4fa', '#e6eaf1']} style={styles.modalIconGradient}>
                                    <Ionicons name="sparkles-outline" size={28} color={dynamicColor} />
                                </LinearGradient>
                            </View>
                           <View style={{ width: 44, height: 44 }} />
                        </View>
                        <View style={styles.modalTitleContainer}>
                            <Text style={styles.modalTitle}>AI Analizi</Text>
                        </View>
                       <View style={[styles.modalDivider, { backgroundColor: dynamicColor, opacity: 0.1 }]} />
                        <Text style={styles.modalText}>{state.aiMessage}</Text>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}