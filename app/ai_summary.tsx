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
    <LinearGradient colors={['#FFFFFF', '#F4F7FC']} style={commonStyles.container}>
      <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
        <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={commonStyles.brand}>therapy<Text style={commonStyles.brandDot}>.</Text></Text>
      <Text style={commonStyles.title}>AI Ruh Hâli Analizi</Text>
      <Text style={commonStyles.subtitle}>Duygu geçmişini analizle keşfet.</Text>

      <View style={commonStyles.contentContainer}>
        <View style={commonStyles.controlsBox}>
          <Text style={commonStyles.inputLabel}>Kaç günlük veriyi analiz edelim?</Text>
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
          <TouchableOpacity style={[commonStyles.button, loading && { opacity: 0.6 }]} disabled={loading} onPress={fetchSummary}>
            <Text style={commonStyles.buttonText}>Analiz Oluştur</Text>
          </TouchableOpacity>
        </View>

        {summaries.length === 0 && !loading ? (
          <View style={commonStyles.placeholderContainer}>
            <Ionicons name="information-circle-outline" size={22} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <Text style={commonStyles.placeholderText}>Henüz analiz oluşturulmadı</Text>
          </View>
        ) : (
          <FlatList
            data={summaries}
            renderItem={({ item, index }) => <SummaryCard text={item} index={index} />}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={commonStyles.listContainer}
            ListHeaderComponent={loadingHeader}
          />
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)} 
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 5,
              }}>
              <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
            </TouchableOpacity>

            <View style={commonStyles.modalIcon}>
              <LinearGradient
                colors={['#E0ECFD', '#F4E6FF']}
                style={{ ...StyleSheet.absoluteFillObject, borderRadius: 37 }}
              />
              <Ionicons name="document-text-outline" size={32} color={Colors.light.tint} />
            </View>
            <Text style={commonStyles.modalTitle}>AI Duygu Analizi</Text>
            <View style={commonStyles.modalDivider} />
            <ScrollView style={{ maxHeight: 350, marginBottom: 26 }} showsVerticalScrollIndicator={false}>
              <Text style={commonStyles.cardText}>
                {activeSummary || "Analiz yüklenemedi."}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={exportToPDF}
              style={[commonStyles.buttonSecondary, { 
                width: '100%', 
                justifyContent: 'center',
                borderWidth: 0,
                backgroundColor: 'transparent',
                overflow: 'hidden'
              }]}>
              <LinearGradient
                colors={['#E0ECFD', '#F4E6FF']}
                style={{ ...StyleSheet.absoluteFillObject, borderRadius: 12 }}
              />
              <Ionicons name="download-outline" size={20} color={Colors.light.tint} style={{ marginRight: 6 }} />
              <Text style={[commonStyles.buttonSecondaryText, { color: Colors.light.tint }]}>PDF İndir & Paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    marginBottom: 14,
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
});