// app/dream/result.tsx -- YENİ, BASİT ve TAM KOD

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { generateFinalDreamFeedback, generateNextDreamQuestion } from '../../hooks/useGemini';
import { AppEvent, updateEventData } from '../../utils/eventLogger';

const COSMIC_COLORS = {
    background: ['#0d1117', '#1A2947'] as [string, string],
    card: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#EFEFEF',
    textSecondary: '#A9B4C8',
    accent: '#5DA1D9',
};

interface DialogueMessage {
  text: string;
  role: 'user' | 'model';
}

const ReadOnlyDialogueView = () => (
    <View style={styles.dialogueLockContainer}>
        <Ionicons name="eye-outline" size={24} color={'#A9B4C8'} />
        <Text style={styles.dialogueLockText}>
            Bu, geçmiş bir rüya analizinin kaydıdır. Diyaloğa yalnızca analiz ilk yapıldığında devam edilebilir.
        </Text>
    </View>
);

const CompletedDialogueView = ({ router }: { router: any }) => (
    <View style={styles.dialogueLockContainer}>
        <Ionicons name="checkmark-circle-outline" size={24} color={'#4ade80'} />
        <Text style={styles.dialogueLockText}>
            Bu rüya üzerine diyalog tamamlandı. Limitsiz diyalog ve analiz için Premium'u keşfedebilirsin.
        </Text>
         <TouchableOpacity style={styles.premiumButton} onPress={() => router.push('/premium')}>
            <Text style={styles.premiumButtonText}>Premium'a Göz At</Text>
        </TouchableOpacity>
    </View>
);


export default function DreamResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const scrollViewRef = useRef<ScrollView>(null);
    const [keyboardIsOpen, setKeyboardIsOpen] = useState(false);
  
    const { eventData, isNewAnalysis } = params;
  
    const event: AppEvent | null = useMemo(() => {
        try {
            return eventData && typeof eventData === 'string' ? JSON.parse(eventData as string) : null;
        } catch (e) {
            return null;
        }
    }, [eventData]);

    const [dialogue, setDialogue] = useState<DialogueMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);
  
    // isNewAnalysis parametresi sadece 'true' stringi ise yeni analizdir
    const isNewAnalysisBool = isNewAnalysis === 'true';
    const isDialogueLockedForPast = !isNewAnalysisBool; 
    
    const MAX_INTERACTIONS = 3;

    // Diyalogun bitip bitmediğini kontrol eden state
    const [isChatCompleted, setIsChatCompleted] = useState(false);


    useEffect(() => {
        if (!event || !event.data || !event.data.analysis) return;
        
        const savedDialogue = event.data.dialogue || [];
        const hasCompleted = savedDialogue.length >= (MAX_INTERACTIONS * 2 + 1);
        
        setIsChatCompleted(hasCompleted);
        
        // Yeni analizse ve diyalog boşsa, ilk soruyu sor.
        if (isNewAnalysisBool && savedDialogue.length === 0) {
            const firstQuestion = event.data.analysis.questions?.[0] || "Bu rüya sana en çok ne hissettirdi?";
            setDialogue([{ text: firstQuestion, role: 'model' }]);
        } else {
            setDialogue(savedDialogue);
        }

    }, [event, isNewAnalysis]);

    const handleSendMessage = async (messageText: string) => {
        if (isDialogueLockedForPast || isChatCompleted || !messageText.trim() || isReplying || !event) return; 

        Keyboard.dismiss();
        let currentDialogue = [...dialogue, { text: messageText, role: 'user' as const }];
        setDialogue(currentDialogue);
        setUserInput('');
        setIsReplying(true);

        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);

        await updateEventData(event.id, { ...event.data, dialogue: currentDialogue });
        
        // Sadece user mesajlarını doğru tipte filtrele
        const userAnswers = currentDialogue.filter((m): m is { text: string; role: 'user' } => m.role === 'user');

        if (userAnswers.length < MAX_INTERACTIONS) {
            const nextQuestion = await generateNextDreamQuestion(event.data.analysis, userAnswers);
            if (nextQuestion) {
                currentDialogue.push({ text: nextQuestion, role: 'model' });
                setDialogue([...currentDialogue]);
                await updateEventData(event.id, { ...event.data, dialogue: currentDialogue });
            }
        } else {
            const finalFeedback = await generateFinalDreamFeedback(event.data.analysis, userAnswers);
            if (finalFeedback) {
                currentDialogue.push({ text: finalFeedback, role: 'model' });
                setDialogue([...currentDialogue]);
                await updateEventData(event.id, { ...event.data, dialogue: currentDialogue });
            }
            setIsChatCompleted(true); // Diyaloğun bittiğini işaretle
        }
        setIsReplying(false);
    };

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardIsOpen(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardIsOpen(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (!event || !event.data || !event.data.analysis) { return <View />; } 

    return (
        <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={[styles.scrollContainer]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <MotiView from={{opacity: 0, translateY: -10}} animate={{opacity: 1, translateY: 0}}>
                            <Text style={styles.headerDate}>{event?.timestamp ? new Date(event.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</Text>
                            <Text style={styles.headerTitle}>{event.data.analysis?.title || ''}</Text>
                        </MotiView>
                        <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 100}}>
                            <View style={styles.cardHeader}><Ionicons name="sparkles-outline" size={24} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Genel Özet</Text></View>
                            <Text style={styles.moodText}>{event.data.analysis?.summary || ''}</Text>
                        </MotiView>
                        <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 200}}>
                            <View style={styles.cardHeader}><Ionicons name="key-outline" size={22} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Ana Temalar</Text></View>
                            <View style={styles.tagsContainer}>{event.data.analysis?.themes?.map((tag: string) => <MotiView key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></MotiView>)}</View>
                        </MotiView>
                        <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 300}}>
                            {/* Semboller ve Olası Anlamları kartı kaldırıldı */}
                        </MotiView>
                        <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 400}}>
                            <View style={styles.cardHeader}><Ionicons name="compass-outline" size={24} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Derinlemesine Yorum</Text></View>
                            <Text style={styles.feedbackText}>{event.data.analysis?.interpretation || ''}</Text>
                        </MotiView>
                        <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 500}}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="chatbubbles-outline" size={24} color={COSMIC_COLORS.accent} />
                                <Text style={styles.cardTitle}>Rüya Diyaloğu</Text>
                            </View>
                            <View style={styles.dialogueContainer}>
                                {dialogue.map((msg, i) => (
                                    <MotiView key={i} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{delay: i * 50, type: 'timing', duration: 300}} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                                        <Text style={styles.bubbleText}>{msg.text}</Text>
                                    </MotiView>
                                ))}
                                {isReplying && <ActivityIndicator color={COSMIC_COLORS.accent} style={{ alignSelf: 'flex-start', marginTop: 12 }} />}
                            </View>

                            {/* ---> FİNAL KONTROL <--- */}
                            {isDialogueLockedForPast ? (
                                <ReadOnlyDialogueView />
                            ) : isChatCompleted ? (
                                <CompletedDialogueView router={router} /> 
                            ) : (
                                <View style={styles.inputRow}>
                                    <TextInput 
                                        style={styles.dialogueInput}
                                        placeholder="Cevabını yaz..."
                                        value={userInput}
                                        onChangeText={setUserInput}
                                        editable={!isReplying}
                                    />
                                    <TouchableOpacity onPress={() => handleSendMessage(userInput)} disabled={!userInput.trim() || isReplying}>
                                        <Ionicons name="arrow-up-circle" size={44} color={isReplying || !userInput.trim() ? '#666' : COSMIC_COLORS.accent} />
                                    </TouchableOpacity>
                                </View>
                            )}

                        </MotiView>
                    </ScrollView>

                    <TouchableOpacity onPress={() => router.back()} style={styles.saveExitButton}>
                        <Text style={styles.saveExitButtonText}>Rüya Günlüğüne Dön</Text>
                    </TouchableOpacity>
                    
                </SafeAreaView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 60, left: 10, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20 },
  scrollContainer: { paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20 },
  saveExitButton: { marginBottom: 24, marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 28, height: 56, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  saveExitButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  headerDate: { color: COSMIC_COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  headerTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  moodText: { color: COSMIC_COLORS.textSecondary, fontStyle: 'italic', fontSize: 16, lineHeight: 25 },
  card: { backgroundColor: COSMIC_COLORS.card, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 20, fontWeight: '600', marginLeft: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { backgroundColor: 'rgba(93,161,217,0.2)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  tagText: { color: COSMIC_COLORS.accent, fontSize: 14, fontWeight: '500' },
  feedbackText: { color: COSMIC_COLORS.textSecondary, fontSize: 16, lineHeight: 26 },
  fullSymbolText: { marginBottom: 16, fontSize: 16, lineHeight: 24, },
  symbolTitleText: { fontWeight: '700', color: COSMIC_COLORS.textPrimary, },
  symbolMeaningText: { fontWeight: '400', color: COSMIC_COLORS.textSecondary, },
  dialogueContainer: { marginTop: 10, gap: 12 },
  bubble: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, maxWidth: '85%' },
  userBubble: { backgroundColor: COSMIC_COLORS.accent, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleText: { color: COSMIC_COLORS.textPrimary, fontSize: 16, lineHeight: 23 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: COSMIC_COLORS.cardBorder, paddingTop: 10 },
  dialogueInput: { flex: 1, height: 44, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 22, paddingHorizontal: 18, color: COSMIC_COLORS.textPrimary, marginRight: 10, fontSize: 16 },
  dialogueLockContainer: {
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COSMIC_COLORS.cardBorder,
    paddingTop: 20,
    gap: 12,
  },
  dialogueLockText: {
    color: '#A9B4C8',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  premiumButton: {
    marginTop: 12,
    backgroundColor: '#facc15',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  premiumButtonText: {
    color: '#422006',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
