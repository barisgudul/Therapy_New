// app/ai_summary.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import moment from 'moment';
import 'moment/locale/tr';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import Markdown from 'react-native-markdown-display';
// @ts-ignore

import { v4 as uuidv4 } from 'uuid';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { usePremiumFeatures } from '../hooks/useSubscription';
import { generateStructuredAnalysisReport } from '../services/ai.service';
import { AppEvent, getAIAnalysisEvents, getOldestEventDate, logEvent } from '../services/event.service';
import { useVaultStore } from '../store/vaultStore';
import { InteractionContext } from '../types/context';

// Helper function to create a clean preview from markdown text
const stripMarkdownForPreview = (markdown: string): string => {
  return markdown
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/^- /gm, '') // Remove bullet points
    .replace(/^\d+\. /gm, '') // Remove numbered lists
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
    .trim();
};

export default function AISummaryScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [allAnalyses, setAllAnalyses] = useState<AppEvent[]>([]);
  const [oldestDate, setOldestDate] = useState<string>('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AppEvent | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Premium kontrolleri için hook
  const { canUseAIReports, loading: premiumLoading } = usePremiumFeatures();

  // Sayfa yüklendikten sonra geçmiş analizleri çek
  useEffect(() => {
    const initializePage = async () => {
      try {
        // 1. Geçmiş analizleri çek
        const analysisOnly = await getAIAnalysisEvents();
        setAllAnalyses(analysisOnly);
        console.log(`📋 [AI-SUMMARY] ${analysisOnly.length} önceki analiz yüklendi.`);

        // 2. En eski veri tarihini belirle
        const oldestEventDate = await getOldestEventDate();
        setOldestDate(oldestEventDate ? oldestEventDate.toISOString() : '');

        if (oldestEventDate) {
          const diffDays = Math.ceil((Date.now() - new Date(oldestEventDate).getTime()) / (1000 * 60 * 60 * 24));
          const cappedDays = Math.min(diffDays, 365); 
          const finalDays = cappedDays > 0 ? cappedDays : 1;
          setSelectedDays(finalDays);
          console.log(`📅 [AI-SUMMARY] Analiz aralığı: ${finalDays} gün olarak ayarlandı.`);
        } else {
          setSelectedDays(7); // Varsayılan 7 gün
          console.log('📅 [AI-SUMMARY] Henüz veri yok, varsayılan 7 gün ayarlandı.');
        }
      } catch (e) {
        console.error('❌ [AI-SUMMARY] Sayfa başlatma hatası:', e);
      }
    };

    initializePage();
  }, []);

  // Premium kontrollü fetchSummary fonksiyonu
  const fetchSummary = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const vault = useVaultStore.getState().vault;
      if (!vault) {
        throw new Error("Vault verisi bulunamadı, analiz başlatılamıyor.");
      }

      const context: InteractionContext = {
        transactionId: uuidv4(),
        userId: user!.id,
        initialVault: vault,
        initialEvent: {
          id: uuidv4(),
          user_id: user!.id,
          type: 'ai_analysis',
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: {
            days: selectedDays,
          },
        },
        derivedData: {}
      };

      console.log(`📊 [AI-SUMMARY] ${selectedDays} günlük analiz için beyne komut gönderiliyor...`);
      const result = await generateStructuredAnalysisReport(context);

      const newAnalysisEventId = await logEvent({
          type: 'ai_analysis',
          mood: 'neutral',
          data: {
              text: result.trim(),
              analyzedDays: selectedDays,
          }
      });

      if (newAnalysisEventId) {
          const newEvent: AppEvent = {
              id: newAnalysisEventId,
              type: 'ai_analysis',
              user_id: user!.id,
              timestamp: Date.now(),
              created_at: new Date().toISOString(),
              data: { text: result.trim(), analyzedDays: selectedDays }
          };

          setAllAnalyses(prev => [newEvent, ...prev]);
          setSelectedAnalysis(newEvent);
          setIsPreviewMode(true);
      }

  } catch (error) {
      console.error(`📊 [AI-SUMMARY] Analiz hatası:`, error);
      Alert.alert('Hata', 'Analiz oluşturulamadı. Lütfen tekrar deneyin.');
  } finally {
      setLoading(false);
  }
};

  // Premium kontrolü - eğer premium değilse, premium gate göster
  if (!premiumLoading && !canUseAIReports) {
    return (
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8fafc', '#ffffff']}
        style={styles.container}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
        
        <View style={styles.premiumPrompt}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.premiumCard}
          >
            <View style={styles.premiumHeader}>
              <Ionicons name="diamond" size={32} color="white" />
              <Text style={styles.premiumTitle}>Premium Özellik</Text>
            </View>
            
            <Text style={styles.premiumDescription}>
              AI raporları Premium üyelerde kullanılabilir. 
              Premium planla sınırsız analiz raporu alabilirsiniz.
            </Text>
            
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.premiumButtonText}>Premium'a Geç</Text>
              <Ionicons name="arrow-forward" size={20} color="#6366F1" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8fafc', '#ffffff']}
      style={styles.container}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>AI Analiz Raporları</Text>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Yapay zeka destekli ruh hali analizi ile kendinizi daha iyi tanıyın
        </Text>

        <View style={styles.analyticsContainer}>
          {loading ? (
            <View style={styles.loadingAnalytics}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
              <Text style={styles.loadingText}>Analiz oluşturuluyor...</Text>
            </View>
          ) : (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{selectedDays} Gün</Text>
              <Text style={styles.sliderLabel}>Analiz edilecek süre</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            onPress={fetchSummary}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#CBD5E1', '#94A3B8'] : ['#6366F1', '#8B5CF6']}
              style={styles.analyzeButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="analytics" size={24} color="white" />
              )}
              <Text style={styles.analyzeButtonText}>
                {loading ? 'Analiz ediliyor...' : 'Analiz Oluştur'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Geçmiş analizler */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Geçmiş Analizler</Text>
          <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
            {allAnalyses.map((analysis) => (
              <TouchableOpacity
                key={analysis.id}
                style={styles.historyItem}
                onPress={() => {
                  setSelectedAnalysis(analysis);
                  setIsPreviewMode(true);
                }}
              >
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyItemDate}>
                    {moment(analysis.created_at).format('DD MMM YYYY')}
                  </Text>
                  <Text style={styles.historyItemDays}>
                    {analysis.data.analyzedDays} gün
                  </Text>
                </View>
                <Text style={styles.historyItemPreview}>
                  {stripMarkdownForPreview(analysis.data.text).substring(0, 100)}...
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Analysis Preview Modal */}
      {isPreviewMode && selectedAnalysis && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAnalysis.data.analyzedDays} Günlük Analiz
              </Text>
              <TouchableOpacity 
                onPress={() => setIsPreviewMode(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.light.tint} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Markdown style={markdownStyles}>{selectedAnalysis.data.text}</Markdown>
            </ScrollView>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  bullet_list: {
    marginBottom: 16,
  },
  list_item: {
    marginBottom: 8,
  },
  strong: {
    fontWeight: 'bold',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  headerTitle: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  analyticsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingAnalytics: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  analyzeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzeButtonDisabled: {
    shadowOpacity: 0.1,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  historySection: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  historyItemDays: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyItemPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  premiumPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  premiumDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 24,
    lineHeight: 24,
  },
  premiumButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
});