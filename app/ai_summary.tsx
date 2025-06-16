import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
// @ts-ignore
import RNHTMLtoPDF from 'react-native-html-to-pdf';

import { Colors } from '../constants/Colors';
import { commonStyles } from '../constants/Styles';
import { generateDetailedMoodSummary } from '../hooks/useGemini';
import { checkAndUpdateBadges } from '../utils/badges';

export default function AISummaryScreen() {
  const router = useRouter();

  const [maxDays, setMaxDays] = useState(7);
  const [selectedDays, setSelectedDays] = useState(7);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);

  // Kayıtlı özetleri yükle
  useEffect(() => {
    loadSavedSummaries();
  }, []);

  // Maksimum gün sayısını hesapla
  useEffect(() => {
    (async () => {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith('session-'));
      const moodKeys = keys.filter(k => k.startsWith('mood-'));
      
      // Tüm tarihleri bir Set'e ekleyelim (tekrar edenleri otomatik eler)
      const uniqueDates = new Set<string>();
      
      // Session kayıtlarını işle
      sessionKeys.forEach(key => {
        const date = key.replace('session-', '');
        uniqueDates.add(date);
      });
      
      // Mood kayıtlarını işle
      moodKeys.forEach(key => {
        const date = key.replace('mood-', '');
        uniqueDates.add(date);
      });
      
      // Maksimum 30 gün ile sınırla
      const capped = Math.min(uniqueDates.size, 30);
      setMaxDays(capped || 1);
      setSelectedDays(capped || 1);
    })();
  }, []);

  // Kayıtlı özetleri yükleme fonksiyonu
  const loadSavedSummaries = async () => {
    try {
      const savedSummaries = await AsyncStorage.getItem('ai-summaries');
      if (savedSummaries) {
        setSummaries(JSON.parse(savedSummaries));
      }
    } catch (e) {
      console.error('Özetler yüklenirken hata:', e);
    }
  };

  // Özetleri kaydetme fonksiyonu
  const saveSummaries = async (newSummaries: string[]) => {
    try {
      await AsyncStorage.setItem('ai-summaries', JSON.stringify(newSummaries));
    } catch (e) {
      console.error('Özetler kaydedilirken hata:', e);
    }
  };

  const fetchSummary = async () => {
    if (loading) return;
    setLoading(true);

    // Bütün anahtarları al
    const keys = await AsyncStorage.getAllKeys();

    // Sadece session- ile başlayanları bul ve tarihe göre yeni > eski sırala
    const sessionKeys = keys
      .filter(k => k.startsWith('session-'))
      .sort((a, b) => b.localeCompare(a)); // Yeni tarihler başta

    // Seçili gün kadar en güncel kayıtları al
    const selectedSessionKeys = sessionKeys.slice(0, selectedDays);

    const entries: any[] = [];
    for (const key of selectedSessionKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) {
        entries.push({ date: key.replace('session-', ''), ...JSON.parse(val) });
      }
    }

    if (entries.length === 0) {
      const newSummaries = ["Hiç veri bulunamadı.", ...summaries];
      setSummaries(newSummaries);
      await saveSummaries(newSummaries);
      setLoading(false);
      return;
    }

    try {
      const result = await generateDetailedMoodSummary(entries, selectedDays);
      const newSummaries = [result.trim(), ...summaries];
      setSummaries(newSummaries);
      await saveSummaries(newSummaries);

      // Rozetleri kontrol et ve güncelle
      const totalSummaries = newSummaries.length; // Yeni toplam sayıyı al
      
      await checkAndUpdateBadges('ai', {
        aiSummaries: totalSummaries // Yeni toplam sayıyı kullan
      });
      
      // Farklı özet türleri için ek rozetler
      await checkAndUpdateBadges('ai', {
        aiInsights: true
      });

      // Analiz tamamlandığında modalı aç
      setActiveSummary(result.trim());
      setModalVisible(true);
    } catch (e) {
      const newSummaries = ["AI özet üretilemedi, lütfen tekrar deneyin.", ...summaries];
      setSummaries(newSummaries);
      await saveSummaries(newSummaries);
    }
    setLoading(false);
  };

  // Özeti silme fonksiyonu
  const deleteSummary = async (index: number) => {
    const newSummaries = summaries.filter((_, i) => i !== index);
    setSummaries(newSummaries);
    await saveSummaries(newSummaries);
  };

  const SummaryCard = ({ text, index }: { text: string; index: number }) => (
    <TouchableOpacity
      style={commonStyles.card}
      activeOpacity={0.9}
      onPress={() => {
        setActiveSummary(text);
        setModalVisible(true);
      }}
    >
      <View style={commonStyles.iconWrap}>
        <Ionicons name="document-text-outline" size={20} color={Colors.light.tint} />
      </View>
      <Text numberOfLines={3} style={commonStyles.cardText}>{text}</Text>
      <TouchableOpacity
        onPress={() => deleteSummary(index)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: 8,
        }}>
        <Ionicons name="close-circle-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // PDF OLUŞTURMA ve PAYLAŞIM
  const exportToPDF = async () => {
    if (!activeSummary) return;
    try {
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
              .content { font-size: 15px; line-height: 1.7; color: #222; text-align: center; }
              .footer { margin-top: 32px; color: #9ca3af; font-size: 12px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>therapy<span style="color:#5DA1D9;">.</span> - AI Ruh Hâli Analizi</h2>
              <div class="divider"></div>
              <div class="content">
                ${activeSummary.replace(/\n/g, "<br/>")}
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
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>AI Ruh Hâli Analizi</Text>

      <View style={styles.content}>
        <View style={styles.controlsBox}>
          <Text style={styles.inputLabel}>Kaç günlük veriyi analiz edelim?</Text>
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

        {summaries.length === 0 && !loading ? (
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
            data={summaries}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.summaryCard}
                activeOpacity={0.9}
                onPress={() => {
                  setActiveSummary(item);
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
                      {new Date().toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  <Text style={styles.summaryCardText} numberOfLines={3}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => deleteSummary(index)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E53E3E" />
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            )}
            keyExtractor={(_, i) => i.toString()}
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
              <Text style={styles.modalText}>
                {activeSummary || "Analiz yüklenemedi."}
              </Text>
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
  );
}

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