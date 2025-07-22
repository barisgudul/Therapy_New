// app/ai_summary.tsx
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';

import { v4 as uuidv4 } from 'uuid';
import { PremiumGate } from '../components/PremiumGate';
import { Colors } from '../constants/Colors';
import { commonStyles } from '../constants/Styles';
import { useAuth } from '../context/Auth';
import { useFeatureAccess } from '../hooks/useSubscription';
import { generateStructuredAnalysisReport } from '../services/ai.service';
import { incrementFeatureUsage } from '../services/api.service';
import { AppEvent, deleteEventById, getAIAnalysisEvents, getOldestEventDate, logEvent } from '../services/event.service';
import { useVaultStore } from '../store/vaultStore';
import { InteractionContext } from '../types/context';

// Helper function to create a clean preview from markdown text
// This version preserves line breaks and paragraph structure for a cleaner preview.
const stripMarkdownForPreview = (markdown: string): string => {
  if (!markdown) {
    return "Özet bulunmuyor.";
  }
  return (
    markdown
      // Remove heading markers (e.g., ##, ###) but keep the text
      .replace(/^#+\s/gm, '')
      // Remove bold and italic markers
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      // Remove list markers (bullet points, dashes)
      .replace(/^[\s]*[•-]\s/gm, '')
      // Collapse consecutive blank lines into one
      .replace(/\n\s*\n/g, '\n')
      .trim()
  );
};

export default function AISummaryScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [maxDays, setMaxDays] = useState(1);
  const [selectedDays, setSelectedDays] = useState(1);
  const [analysisEvents, setAnalysisEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor durumunda başlat
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);

  // Feature Access Hooks
  const { can_use: canCreateReport, loading: reportAccessLoading, refresh: refreshReportAccess } = useFeatureAccess('ai_reports');
  const { can_use: canExportPDF, loading: pdfAccessLoading, refresh: refreshPDFAccess } = useFeatureAccess('pdf_export');

  // Kayıtlı özetleri yükle
  useEffect(() => {
    const initializePage = async () => {
        setLoading(true); 
        try {
            // Vault store'u yükle
            const vaultStore = useVaultStore.getState();
            if (vaultStore.isLoading || !vaultStore.vault) {
                console.log('🔄 [AI-SUMMARY] Sayfa başlatılırken vault yükleniyor...');
                await vaultStore.fetchVault();
            }

            // Sadece AI analiz olaylarını çek - optimize edilmiş veri çekimi
            const analysisOnly = await getAIAnalysisEvents();
            setAnalysisEvents(analysisOnly);
            console.log(`📋 [AI-SUMMARY] ${analysisOnly.length} önceki analiz yüklendi.`);

            // Maksimum gün sayısını belirlemek için en eski olay tarihini optimize bir şekilde çek
            const oldestEventDate = await getOldestEventDate();

            if (oldestEventDate) { // Eğer veri varsa
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - oldestEventDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const cappedDays = Math.min(diffDays, 365); 
                const finalDays = cappedDays > 0 ? cappedDays : 1;
                setMaxDays(finalDays);
                setSelectedDays(finalDays);
                console.log(`📅 [AI-SUMMARY] Analiz aralığı: ${finalDays} gün olarak ayarlandı.`);
            } else { // Hiç olay yoksa
                setMaxDays(1);
                setSelectedDays(1);
                console.log('📅 [AI-SUMMARY] Henüz veri yok, varsayılan 1 gün ayarlandı.');
            }
        } catch (e) {
            console.error('❌ [AI-SUMMARY] Sayfa başlatılırken hata:', e);
        } finally {
            setLoading(false);
        }
    };
    initializePage();
}, []);

  // Özetleri kaydetme fonksiyonu
  // ai_summary.tsx dosyasındaki mevcut fetchSummary fonksiyonunu bununla değiştirin.

const fetchSummary = async () => {
  if (loading || reportAccessLoading) return;

  // Rapor oluşturma hakkını kontrol et
  await refreshReportAccess();
  if (!canCreateReport) {
      Alert.alert(
          'Analiz Limiti Doldu',
          'Bu özellik için kullanım limitinize ulaştınız. Sınırsız analiz için Premium\'a geçebilirsiniz.',
          [
              { text: 'Kapat', style: 'cancel' },
              { text: 'Premium\'a Geç', onPress: () => router.push('/subscription') }
          ]
      );
      return;
  }

  setLoading(true);

  try {
    const vault = useVaultStore.getState().vault;
    if (!vault) {
      throw new Error("Vault verisi bulunamadı, analiz başlatılamıyor.");
    }

    // Adım 1: InteractionContext objesini TAM ve DOĞRU bir şekilde oluştur.
    const context: InteractionContext = {
      transactionId: uuidv4(),
      userId: user!.id, // user'ın yüklendiğinden eminiz (_layout sayesinde)
      initialVault: vault,
      initialEvent: {
        id: uuidv4(),
        user_id: user!.id, // Babasız çocuk yok. Herkesin kimliği belli.
        type: 'ai_analysis', // Bu olay bir analiz isteğidir.
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: {
          days: selectedDays, // Beynin bekledeği veri bu. Kaç gün olduğu.
        },
      },
      derivedData: {}
    };

    console.log(`📊 [AI-SUMMARY] ${selectedDays} günlük analiz için beyne komut gönderiliyor...`);
    const result = await generateStructuredAnalysisReport(context); // <<< BEYNE TEK, KUTSAL BİR ARGÜMAN GİDİYOR.

    // ---- Hafıza Döngüsünü Mühürle ----
    const newAnalysisEventId = await logEvent({
        type: 'ai_analysis',
        mood: 'neutral', // Bu analizlerin bir ruh hali olmaz.
        data: {
            text: result.trim(),
            analyzedDays: selectedDays,
        }
    });

    if (newAnalysisEventId) {
        // Kullanım sayısını artır
        await incrementFeatureUsage('ai_reports');
        console.log('✅ [USAGE] ai_reports kullanımı başarıyla artırıldı.');

        // Optimistik UI: Yeni oluşturulan olayı hemen listeye ekle.
        const newEvent: AppEvent = {
            id: newAnalysisEventId,
            type: 'ai_analysis',
            user_id: user!.id,
            timestamp: Date.now(),
            created_at: new Date().toISOString(),
            data: { text: result.trim(), analyzedDays: selectedDays }
        };
        setAnalysisEvents(prevEvents => [newEvent, ...prevEvents]);
        console.log('✅ [AI-SUMMARY] Yeni analiz başarıyla oluşturuldu ve kalıcı hafızaya kaydedildi.');
    }

    setActiveSummary(result.trim());
    setModalVisible(true);

  } catch (e: any) {
    console.error("❌ [AI-SUMMARY] Bütünsel İçgörü Raporu oluşturma hatası:", e.message);
    Alert.alert("Hata", "Analiz oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
  } finally {
    setLoading(false);
  }
};

  // Özeti silme fonksiyonu (Alert ile ve eventLogger'dan silme)
  const deleteSummary = (eventId: string) => {
    Alert.alert(
      'Analizi Sil',
      'Bu AI analizini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
                await deleteEventById(eventId);
                // UI'ı güncelle - silinen analizi listeden çıkar
                setAnalysisEvents(prev => prev.filter(e => e.id !== eventId));
                console.log('✅ [AI-SUMMARY] Analiz başarıyla silindi ve UI güncellendi.');
            } catch (e) {
              console.error('❌ [AI-SUMMARY] Analiz silme hatası:', e);
              Alert.alert('Hata', 'Silme işlemi sırasında bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  // PDF OLUŞTURMA ve PAYLAŞIM
  const exportToPDF = async () => {
    if (!activeSummary || pdfAccessLoading) return;
    
    // PDF dışa aktırma hakkını kontrol et
    await refreshPDFAccess();
    if (!canExportPDF) {
        Alert.alert(
            'PDF Dışa Aktarma Limiti',
            'Bu özellik Premium üyelere özeldir. PDF olarak dışa aktarmak için lütfen Premium\'a geçin.',
            [
                { text: 'Kapat', style: 'cancel' },
                { text: 'Premium\'a Geç', onPress: () => router.push('/subscription') }
            ]
        );
        return;
    }

    try {
      // Markdown'ı HTML'e çevir
      const convertMarkdownToHTML = (markdown: string): string => {
        return markdown
          // Başlıkları
          .replace(/^## (.*$)/gim, '<h2 style="color: #4988e5; margin: 20px 0 10px 0; font-size: 18px; font-weight: 600;">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 style="color: #4988e5; margin: 16px 0 8px 0; font-size: 16px; font-weight: 600;">$1</h3>')
          // Kalın metin
          .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
          // Madde işaretleri
          .replace(/^• (.*$)/gim, '<li style="margin: 4px 0; padding-left: 8px;">$1</li>')
          // Madde listelerini sarmala
          .replace(/(<li.*<\/li>)/gs, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>')
          // Yeni satırları
          .replace(/\n/g, '<br/>');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>AI Ruh Hâli Analizi</title>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; }
              .container { padding: 32px 18px; }
              h2 { color: #4988e5; text-align: center; margin-bottom: 16px; }
              .divider { height: 2px; width: 100%; background: #e3e8f0; margin: 12px 0 22px 0; border-radius: 2px; }
              .content { font-size: 15px; line-height: 1.7; color: #222; text-align: left; }
              .footer { margin-top: 32px; color: #9ca3af; font-size: 12px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>therapy<span style="color:#5DA1D9;">.</span> - AI Ruh Hâli Analizi</h2>
              <div class="divider"></div>
              <div class="content">
                ${convertMarkdownToHTML(activeSummary)}
              </div>
              <div class="footer">
                Bu PDF, therapy. uygulamasının AI analiz özelliği ile otomatik oluşturulmuştur.
              </div>
            </div>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `therapy_ai_analiz_${new Date().toISOString().split('T')[0]}`,
        directory: 'Documents',
        base64: false,
        height: 842,
        width: 595,
        padding: 10
      };

      const file = await RNHTMLtoPDF.convert(options);
      
      if (file.filePath) {
        const fileUri = `file://${file.filePath}`;
        if (Platform.OS === 'ios') {
          await Sharing.shareAsync(fileUri, {
            dialogTitle: 'PDF Analizini Paylaş',
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf'
          });
        } else {
          await Sharing.shareAsync(fileUri, {
            dialogTitle: 'PDF Analizini Paylaş',
            mimeType: 'application/pdf'
          });
        }
        // Başarılı paylaşımdan sonra kullanım sayısını artır
        await incrementFeatureUsage('pdf_export');
        console.log('✅ [USAGE] pdf_export kullanımı başarıyla artırıldı.');
      } else {
        Alert.alert('Hata', 'PDF oluşturulamadı!');
      }
    } catch (e) {
      console.error('PDF oluşturma hatası:', e);
      Alert.alert('Hata', 'PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const loadingHeader = loading ? (
    <View style={commonStyles.loadingCard}>
      <ActivityIndicator size="small" color={Colors.light.tint} />
      <Text style={commonStyles.loadingText}>Analiz oluşturuluyor...</Text>
    </View>
  ) : null;

  return (
    <PremiumGate featureType="ai_reports" premiumOnly={false}>
      <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bütünsel İçgörü Raporu</Text>

        <View style={styles.content}>
          <View style={styles.controlsBox}>
            <Text style={styles.inputLabel}>Kaç günlük veriyi analiz edelim?</Text>
            {loading ? (
               <View style={{height: 70, justifyContent: 'center', alignItems: 'center'}}>
                  <ActivityIndicator color={Colors.light.tint}/>
                  <Text style={{color: Colors.light.tint, marginTop: 8, fontSize: 12}}>Verileriniz Hesaplanıyor...</Text>
              </View>
            ) : (
            <Slider
              minimumValue={1}
              maximumValue={maxDays}
              step={1}
              value={selectedDays}
              onValueChange={v => setSelectedDays(Array.isArray(v) ? v[0] : v)}
              containerStyle={styles.sliderContainer}
              trackStyle={styles.sliderTrack}
              thumbStyle={styles.sliderThumb}
              minimumTrackTintColor={Colors.light.tint}
              renderThumbComponent={() => (
                <View style={styles.thumbInner}><Text style={styles.thumbText}>{selectedDays}</Text></View>
              )}
            />
            )}
            <TouchableOpacity 
              style={[styles.analyzeButton, loading && { opacity: 0.6 }]} 
              disabled={loading} 
              onPress={fetchSummary}
            >
              <LinearGradient
                colors={['#F8FAFF', '#FFFFFF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.analyzeButtonGradient}
              >
                <View style={styles.analyzeButtonContent}>
                  <Ionicons name="analytics-outline" size={24} color={Colors.light.tint} />
                  <Text style={styles.analyzeButtonText}>Analiz Oluştur</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {analysisEvents.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <LinearGradient
                  colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 1}} 
                  style={styles.emptyStateIconGradient}
                >
                  <Ionicons name="analytics-outline" size={48} color={Colors.light.tint} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyStateText}>Henüz analiz oluşturulmadı</Text>
              <Text style={styles.emptyStateSubtext}>Duygu geçmişini analiz etmeye başla</Text>
            </View>
          ) : (
            <FlatList
              data={analysisEvents}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.summaryCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveSummary(item.data.text);
                    setModalVisible(true);
                  }}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFF']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.summaryCardGradient}
                  >
                    <View style={styles.summaryCardHeader}>
                      <View style={styles.summaryCardIconContainer}>
                        <Ionicons name="document-text-outline" size={20} color={Colors.light.tint} />
                      </View>
                      <Text style={styles.summaryCardDate}>
                        {new Date(item.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <Text style={styles.summaryCardText} numberOfLines={3}>{stripMarkdownForPreview(item.data.text)}</Text>
                    <TouchableOpacity
                      onPress={() => deleteSummary(item.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E53E3E" />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              ListHeaderComponent={loadingHeader}
            />
          )}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)} 
                style={styles.modalBackButton}
              >
                <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
              </TouchableOpacity>

              <View style={styles.modalIcon}>
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  style={styles.modalIconGradient}
                />
                <Ionicons name="document-text-outline" size={32} color={Colors.light.tint} />
              </View>
              <Text style={styles.modalTitle}>AI Duygu Analizi</Text>
              <View style={styles.modalDivider} />
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {activeSummary ? (
                  <Markdown style={markdownStyles}>{activeSummary}</Markdown>
                ) : (
                  <Text style={styles.modalText}>
                    {"Analiz yüklenemedi."}
                  </Text>
                )}
              </ScrollView>
              <TouchableOpacity
                onPress={exportToPDF}
                style={styles.exportButton}
              >
                <LinearGradient
                  colors={['#E0ECFD', '#F4E6FF']}
                  style={styles.exportButtonGradient}
                >
                  <Ionicons name="download-outline" size={20} color={Colors.light.tint} style={styles.exportButtonIcon} />
                  <Text style={styles.exportButtonText}>PDF İndir & Paylaş</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </PremiumGate>
  );
}

const markdownStyles = StyleSheet.create({
  heading2: {
    color: Colors.light.tint,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
    paddingBottom: 8,
  },
  heading3: {
    color: '#1A1F36',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
  },
  strong: {
    fontWeight: 'bold',
  },
  bullet_list: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  list_item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    marginTop: 120,
  },
  controlsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  sliderThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  analyzeButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  analyzeButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  emptyStateIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    padding: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  summaryCardGradient: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(93,161,217,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryCardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.3,
  },
  summaryCardText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  listContainer: {
    paddingVertical: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  modalBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 5,
  },
  modalIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalIconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 37,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(93,161,217,0.1)',
    marginBottom: 24,
  },
  modalScrollView: {
    maxHeight: 350,
    marginBottom: 26,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  exportButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  exportButtonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  exportButtonIcon: {
    marginRight: 8,
  },
  exportButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});