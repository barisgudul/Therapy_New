// app/dream/result.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    SafeAreaView, ScrollView, StyleSheet,
    Text,
    TextInput,
    TouchableOpacity, View,
} from 'react-native';

import { generateDreamDialogueReply } from '../../hooks/useGemini';
import { StoredDreamAnalysis } from './index';

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

export default function DreamResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const analysis: StoredDreamAnalysis | null = params.analysisData && typeof params.analysisData === 'string'
    ? JSON.parse(params.analysisData) : null;
  const entryDate = analysis ? new Date(analysis.date) : new Date();

  const [dialogue, setDialogue] = useState<DialogueMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<string[]>([]);
  
  const MAX_INTERACTIONS = 3;

  // --- VERİ YÜKLEME VE DİYALOG BAŞLATMA (DÜZELTİLMİŞ) ---
  useEffect(() => {
    // Bu fonksiyon tüm başlangıç sürecini yönetecek.
    const initializeScreen = async () => {
      // 1. Analiz verisini parse et ve state'e ata
      let parsedAnalysis: StoredDreamAnalysis | null = null;
      try {
        if (params.analysisData && typeof params.analysisData === 'string') {
          parsedAnalysis = JSON.parse(params.analysisData);
          // Eğer analysisData yoksa, hatayı yakalayıp çık.
          setDialogue([]); // Diyalog geçmişini sıfırla
        } else {
          throw new Error("Analiz verisi bulunamadı veya geçersiz formatta.");
        }
      } catch (error) {
        console.error('Analiz verisi işlenirken hata oluştu:', error);
        setIsReplying(false);
        setDialogue([{ text: 'Analiz verisi bulunamadı veya hatalı.', role: 'model' }]);
        return;
      }

      // 2. Diyaloğu başlat (Sadece analiz verisi başarıyla parse edildiyse)
      setIsReplying(true);
      const reply = await generateDreamDialogueReply(parsedAnalysis, [], "Rüyamı yorumladığın için teşekkürler, şimdi nereden başlamalıyız?");
      if (reply && reply.nextQuestion) {
        setDialogue([{ text: reply.nextQuestion, role: 'model' }]);
      } else {
        setDialogue([{ text: 'Üzgünüm, şu an diyaloğu başlatamıyorum. Analizi inceleyebilirsiniz.', role: 'model' }]);
      }
      setIsReplying(false);
    };
    initializeScreen();
    // Bu useEffect'in bağımlılık dizisi kasıtlı olarak [params.analysisData]'dır.
  }, [params.analysisData]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isReplying || !analysis) return;
    Keyboard.dismiss();
    const newUserMessage: DialogueMessage = { text: messageText, role: 'user' };

    const updatedDialogueHistory = [...dialogue, newUserMessage];
    setDialogue(updatedDialogueHistory);
    setActiveQuestions([]);
    setIsReplying(true);
    
    // Yalnızca yeni mesaj gönderildiğinde scroll yap
    // setTimeout önemli, state güncellemesinin DOM'a yansımasını bekliyor.
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);

    // DÜZELTME: isFinal yerine userInput gönderilmeli
    const reply = await generateDreamDialogueReply(analysis, updatedDialogueHistory, messageText);

    if (reply) {
      setDialogue(prev => [...prev, { text: reply.responseText, role: 'model' }]);
      if (reply.nextQuestion) {
        setActiveQuestions([reply.nextQuestion]);
      }
    } else {
        const errorMessage = { text: "Bir sorun oluştu. Lütfen tekrar dene.", role: 'model' as const};
        setDialogue(prev => [...prev, errorMessage]);
    }
    
    setInteractionCount(prev => prev + 1);
    setIsReplying(false);
    setUserInput('');
  };
  
  if (!analysis) {
    return (
      <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Analiz verisi bulunamadı.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
            <Text style={{color: '#fff'}}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // Klavye yönetimi için
        >
          <MotiView><Text style={styles.headerDate}>{entryDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text><Text style={styles.headerTitle}>Rüya Analizin</Text></MotiView>
          
          <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 100}}><View style={styles.cardHeader}><Ionicons name="sparkles-outline" size={24} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>{analysis.title}</Text></View><Text style={styles.moodText}>{analysis.summary}</Text></MotiView>
          <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 200}}><View style={styles.cardHeader}><Ionicons name="key-outline" size={22} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Ana Temalar</Text></View><View style={styles.tagsContainer}>{analysis.themes.map((tag) => <MotiView key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></MotiView>)}</View></MotiView>
          
          {/* ----- DÜZELTİLMİŞ SEMBOLLER KARTI ----- */}
          <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 300}}>
            <View style={styles.cardHeader}>
              <Ionicons name="planet-outline" size={24} color={COSMIC_COLORS.accent} />
              <Text style={styles.cardTitle}>Semboller ve Olası Anlamları</Text>
            </View>
            <View>
              {analysis.symbols.map((item, index) => (
                <Text key={index} style={styles.fullSymbolText}>
                  <Text style={styles.symbolTitleText}>• {item.symbol}: </Text>
                  <Text style={styles.symbolMeaningText}>{item.meaning}</Text>
                </Text>
              ))}
            </View>
          </MotiView>

          <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 400}}><View style={styles.cardHeader}><Ionicons name="compass-outline" size={24} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Derinlemesine Yorum</Text></View><Text style={styles.feedbackText}>{analysis.interpretation}</Text></MotiView>

          <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9}} animate={{ opacity: 1, scale: 1}} transition={{delay: 500}}>
            {/* ... (Diyalog bölümü aynı şekilde kalabilir, çünkü mantığı doğru) ... */}
            <View style={styles.cardHeader}><Ionicons name="chatbubbles-outline" size={24} color={COSMIC_COLORS.accent} /><Text style={styles.cardTitle}>Rüya Diyaloğu</Text></View>
            
            {dialogue.length === 0 && <Text style={styles.dialoguePrompt}>Şimdi rüyanı daha derinlemesine inceleyelim...</Text>}

            <View style={styles.dialogueContainer}>
              {dialogue.map((msg, i) => (<MotiView key={i} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}><Text style={styles.bubbleText}>{msg.text}</Text></MotiView>))}
              {isReplying && <ActivityIndicator color={COSMIC_COLORS.accent} style={{ alignSelf: 'flex-start' }} />}
            </View>

            {interactionCount < MAX_INTERACTIONS ? (
              <View>
                {activeQuestions.map((q, i) => (<TouchableOpacity key={i} style={styles.questionButton} onPress={() => setUserInput(q)}><Text style={styles.questionButtonText}>{q}</Text><Ionicons name="add" size={22} color={COSMIC_COLORS.accent} /></TouchableOpacity>))}
                <View style={styles.inputRow}>
                  <TextInput style={styles.dialogueInput} placeholder="Cevabını yaz..." value={userInput} onChangeText={setUserInput} />
                  <TouchableOpacity onPress={() => handleSendMessage(userInput)} disabled={!userInput.trim() || isReplying}><Ionicons name="arrow-up-circle" size={44} color={isReplying || !userInput.trim() ? '#666' : COSMIC_COLORS.accent} /></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.premiumCallToAction} onPress={() => router.push('/premium')}><Ionicons name="sparkles" size={20} color="#FBBF24" /><Text style={styles.premiumText}>Daha fazla rüya yorumlat veya limitsiz diyalog için Premium'a geç.</Text></TouchableOpacity>
            )}
          </MotiView>
        </ScrollView>
        <TouchableOpacity onPress={() => router.replace('/dream')} style={styles.saveExitButton}><Text style={styles.saveExitButtonText}>Rüya Günlüğüne Dön</Text></TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// STİLLER (symbolItem ve symbolMeaning Düzeltildi)
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingTop: 80, paddingBottom: 150, paddingHorizontal: 20 },
  saveExitButton: {
      position: 'absolute',
      bottom: 40,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveExitButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  headerDate: { color: COSMIC_COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  headerTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  moodText: { color: COSMIC_COLORS.textPrimary, textAlign: 'center', fontStyle: 'italic', fontSize: 17, lineHeight: 25 },
  card: { backgroundColor: COSMIC_COLORS.card, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 20, fontWeight: '600', marginLeft: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { backgroundColor: 'rgba(93,161,217,0.2)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  tagText: { color: COSMIC_COLORS.accent, fontSize: 14, fontWeight: '500' },
  feedbackText: { color: COSMIC_COLORS.textSecondary, fontSize: 16, lineHeight: 26 },
  
  // DÜZELTİLEN METİN AKIŞI STİLLERİ
  fullSymbolText: {
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  symbolTitleText: {
    fontWeight: '700',
    color: COSMIC_COLORS.textPrimary,
  },
  symbolMeaningText: {
    fontWeight: '400',
    color: COSMIC_COLORS.textSecondary,
  },
  // Diyalog Stilleri (önceki gibi)
  dialoguePrompt: { color: COSMIC_COLORS.textSecondary, fontSize: 15, lineHeight: 22, fontStyle: 'italic', marginBottom: 20 },
  dialogueContainer: { marginTop: 10, gap: 12 },
  bubble: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, maxWidth: '85%' },
  userBubble: { backgroundColor: COSMIC_COLORS.accent, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleText: { color: COSMIC_COLORS.textPrimary, fontSize: 16, lineHeight: 23 },
  questionButton: { backgroundColor: 'rgba(93, 161, 217, 0.1)', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(93, 161, 217, 0.2)' },
  questionButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 16, flex: 1, marginRight: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, borderTopWidth: 1, borderTopColor: COSMIC_COLORS.cardBorder, paddingTop: 20 },
  dialogueInput: { flex: 1, height: 44, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 22, paddingHorizontal: 18, color: COSMIC_COLORS.textPrimary, marginRight: 10, fontSize: 16 },
  premiumCallToAction: { marginTop: 20, padding: 15, backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
  premiumText: { color: '#FBBF24', fontSize: 15, marginLeft: 10, flex: 1, fontWeight: '600' },
  // Hata stilleri
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COSMIC_COLORS.textPrimary, textAlign: 'center', fontSize: 18 },
  errorButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COSMIC_COLORS.accent, borderRadius: 10, },
});
