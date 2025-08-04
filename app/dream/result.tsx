// app/dream/result.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import DialogueCard from '../../components/dream/DialogueCard';
import ErrorState from '../../components/dream/ErrorState';
import InterpretationCard from '../../components/dream/InterpretationCard';
import ResultSkeleton from '../../components/dream/ResultSkeleton';
import SummaryCard from '../../components/dream/SummaryCard';
import ThemesCard from '../../components/dream/ThemesCard';
import { COSMIC_COLORS } from '../../constants/Colors';
import { getUsageStatsForUser } from '../../services/api.service';
import { AppEvent, getEventById } from '../../services/event.service';
import { processUserMessage } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';

// Diyalog mesaj tipi
interface DialogueMessage {
  text: string;
  role: 'user' | 'model';
}

export default function DreamResultScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [event, setEvent] = useState<AppEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- YENİ STATE'LER ---
    const [dialogue, setDialogue] = useState<DialogueMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [dialogueLimit, setDialogueLimit] = useState(3); // Varsayılan değer

    useEffect(() => {
        if (!id) {
            setError("Analiz ID eksik.");
            setIsLoading(false);
            return;
        }

        const fetchInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // İki isteği aynı anda at, daha hızlı olsun.
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Kullanıcı bulunamadı!");

                const [fetchedEvent, usage] = await Promise.all([
                    getEventById(id),
                    getUsageStatsForUser(user.id, 'dream_dialogue')
                ]);

                if (!fetchedEvent) throw new Error("Analiz bulunamadı veya bu analize erişim yetkiniz yok.");
                
                setEvent(fetchedEvent);
                setDialogue(fetchedEvent?.data?.dialogue || []);

                if (usage?.data && usage.data.limit_count > 0) {
                    setDialogueLimit(usage.data.limit_count);
                }

            } catch (err: any) {
                setError(err.message);
                Sentry.captureException(err); // Kara kutuya gönder
                // Alert yerine Toast
                Toast.show({
                    type: 'error',
                    text1: 'Hata',
                    text2: 'Analiz verileri yüklenirken bir sorun oluştu.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [id]);
    
    // --- YENİ FONKSİYON ---
    const handleSendMessage = async () => {
        if (!userInput.trim() || !event || isReplying) return;
        
        if (dialogueLimit > 0 && 
            dialogue.filter(m => m.role === 'user').length >= dialogueLimit) {
            Toast.show({
              type: 'info',
              text1: 'Diyalog Tamamlandı',
              text2: 'Bu rüya için maksimum soru hakkını kullandın',
            });
            return;
        }

        const userMessage: DialogueMessage = { text: userInput.trim(), role: 'user' };
        
        // UI'ı anında güncelle (Optimistic Update)
        setDialogue(prev => [...prev, userMessage]);
        setUserInput('');
        setIsReplying(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Kullanıcı girişi bulunamadı!");

            const dialoguePayload = {
                type: 'dream_analysis' as const,
                data: {
                    isFollowUp: true,
                    event_id: event.id,
                    dreamAnalysisResult: event.data, // Bütün event.data'yı yolla, orkestratör içinden ayıklar
                    fullDialogue: [...dialogue, userMessage], // Güncel diyalog
                }
            };

            const aiReplyText = await processUserMessage(user.id, dialoguePayload);
            
            if (typeof aiReplyText !== 'string') throw new Error("AI'dan yanıt alınamadı.");

            const aiMessage: DialogueMessage = { text: aiReplyText, role: 'model' };
            setDialogue(prev => [...prev, aiMessage]);

        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: 'Mesaj gönderilirken bir sorun oluştu.'
            });
            Sentry.captureException(err); // Kara kutuya gönder
            // Başarısız olursa, iyimser olarak eklediğimiz mesajı geri al
            setDialogue(prev => prev.slice(0, -1));
        } finally {
            setIsReplying(false);
        }
    };

    if (isLoading) {
        return (
            <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
                <SafeAreaView style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="close-outline" size={30} color={COSMIC_COLORS.textPrimary} />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <ResultSkeleton />
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    if (error || !event) {
        return <ErrorState message={error || 'Analiz yüklenemedi.'} />;
    }

    const analysis = event.data.analysis;

    return (
        <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close-outline" size={30} color={COSMIC_COLORS.textPrimary} />
                </TouchableOpacity>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <MotiView from={{opacity: 0, translateY: -10}} animate={{opacity: 1, translateY: 0}}>
                        <Text style={styles.headerDate}>{new Date(event.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                        <Text style={styles.headerTitle}>{analysis?.title || 'Başlıksız Analiz'}</Text>
                    </MotiView>
                    
                    {/* GENEL ÖZET KARTI - YENİ COMPONENT */}
                    <SummaryCard summary={analysis?.summary} />
                    
                    {/* ANA TEMALAR KARTI - YENİ COMPONENT */}
                    <ThemesCard themes={analysis?.themes} />
                    
                    {/* DERİNLEMESİNE YORUM KARTI - YENİ COMPONENT */}
                    <InterpretationCard interpretation={analysis?.interpretation} />
                    
                    {/* DİYALOG KARTI - YENİ COMPONENT */}
                    <DialogueCard 
                        dialogue={dialogue}
                        userInput={userInput}
                        isReplying={isReplying}
                        onInputChange={setUserInput}
                        onSendMessage={handleSendMessage}
                        maxInteractions={dialogueLimit}
                    />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20 },
  scrollContainer: { paddingTop: 100, paddingBottom: 40, paddingHorizontal: 20 },
  headerDate: { color: COSMIC_COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  headerTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
});
