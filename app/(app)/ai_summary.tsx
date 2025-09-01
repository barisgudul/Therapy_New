// app/(app)/ai_summary.tsx

import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Animated, { LinearTransition } from 'react-native-reanimated';

// Dışarıya taşıdığımız component ve fonksiyonları import ediyoruz
import ReportCard from "../../components/ai_summary/ReportCard";
import ReportDetailModal from "../../components/ai_summary/ReportDetailModal";

import { Colors } from "../../constants/Colors";
import { commonStyles } from "../../constants/Styles";
import { useAuth } from "../../context/Auth";
import { supabase } from "../../utils/supabase";
import { AnalysisReport } from "../../types/analysis";

export default function AISummaryScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // State'ler azalmadı ama artık sadece bu ekranın kendi state'leri
  const [maxDays] = useState(30);
  const [selectedDays, setSelectedDays] = useState(7);
  const [analysisReports, setAnalysisReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSummary, setActiveSummary] = useState<AnalysisReport['content'] | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  
  // Fonksiyonlar burada kalabilir, çünkü direkt bu ekranın mantığı ile ilgili
  const loadSavedReports = useCallback(async () => {
    if (!user) return; // user yoksa hiçbir şey yapma
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('user_id', user.id) // Artık user.id'yi direkt kullanabiliriz
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setAnalysisReports(data);
    } catch (e) {
      console.error('Raporlar yüklenirken hata:', e);
    } finally {
      setLoadingReports(false);
    }
  }, [user]); // BAĞIMLILIĞI BURAYA EKLE!

  useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]); // ARTIK DOĞRU BAĞIMLILIĞI VERDİN.

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // ADIM 1: Fonksiyonu çağır ve bu sefer DÖNEN VERİYİ BİR DEĞİŞKENE ATA.
      const { data: newReportPayload, error } = await supabase.functions.invoke(
        'create-analysis-report',
        { body: { days: selectedDays } }
      );

      // ADIM 2: Her türlü hatayı yakala.
      if (error) throw error;
      if (newReportPayload.error) {
        throw new Error(newReportPayload.error);
      }

      // ADIM 3: BAŞARI MESAJINI GÖSTER.
      Toast.show({
        type: 'success',
        text1: 'Raporun Hazır!',
        text2: 'Yeni kişisel raporun oluşturuldu.',
      });

      // ADIM 4: VERİTABANINA GİTMEK YERİNE, GELEN VERİYLE STATE'İ KENDİN GÜNCELLE.
      // Bu hem anlık çalışır hem de gereksiz ağ isteğini önler.
      const newReportForState: AnalysisReport = {
        id: `temp-${Date.now()}`, // Liste için geçici bir anahtar. Liste yenilendiğinde veritabanından gelen ID'ler kullanılır.
        created_at: new Date().toISOString(),
        content: newReportPayload, // İŞTE SENİN ÇÖPE ATTIĞIN VERİ BURADA!
        days_analyzed: selectedDays,
      };

      // Yeni oluşturulan raporu mevcut listenin en başına ekle.
      setAnalysisReports(prevReports => [newReportForState, ...prevReports]);

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Rapor oluşturulamadı.';
      console.error('[fetchSummary Error]', errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Bir Hata Oluştu',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Özeti silme fonksiyonu
  const deleteSummary = (reportId: string) => {
    Alert.alert(
      "Analizi Sil",
      "Bu kişisel raporu kalıcı olarak silmek istediğinizden emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const reportsBeforeDelete = [...analysisReports];
            setAnalysisReports(prev => prev.filter(r => r.id !== reportId));
            try {
              const { error } = await supabase
                .from('analysis_reports')
                .delete()
                .eq('id', reportId);

              if (error) throw error;

              Toast.show({ type: 'info', text1: 'Rapor Silindi' });
            } catch (_e) {
              setAnalysisReports(reportsBeforeDelete);
              Toast.show({
                type: 'error',
                text1: 'Silinemedi',
                text2: _e instanceof Error ? _e.message : 'Rapor silinirken bir hata oluştu.',
              });
            }
          },
        },
      ],
    );
  };

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Kişisel Rapor</Text>

      <View style={styles.content}>
        {/* YENİ: KARŞILAMA BÖLÜMÜ */}
        <Text style={styles.welcomeTitle}>Tekrar Hoş Geldin</Text>
        <Text style={styles.welcomeSubtitle}>
          Geçmişini analiz ederek geleceğin için yeni bir kapı arala.
        </Text>

        {/* YENİ: KONTROL BÖLÜMÜ - ARTIK KART İÇİNDE DEĞİL */}
        <Text style={styles.sectionHeader}>Yeni Bir Kişisel Rapor Oluştur</Text>
        <Slider
          minimumValue={1}
          maximumValue={maxDays}
          step={1}
          value={selectedDays}
          onValueChange={(v) => setSelectedDays(Array.isArray(v) ? v[0] : v)}
          containerStyle={styles.sliderContainer}
          trackStyle={styles.sliderTrack}
          thumbStyle={styles.sliderThumb}
          minimumTrackTintColor={Colors.light.tint}
          renderThumbComponent={() => (
            <View style={styles.thumbInner}>
              <Text style={styles.thumbText}>{selectedDays}</Text>
            </View>
          )}
        />
        <TouchableOpacity
          style={[styles.analyzeButton, loading && { opacity: 0.6 }]}
          disabled={loading}
          onPress={fetchSummary}
        >
          <LinearGradient
            colors={[Colors.light.tint, '#4988E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.analyzeButtonGradient}
          >
            <View style={styles.analyzeButtonContent}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
              )}
              <Text style={styles.analyzeButtonText}>
                {loading ? "Analiz Ediliyor..." : `${selectedDays} Günlük Analiz Oluştur`}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* LİSTE BÖLÜMÜ */}
        {loadingReports ? (
          <View style={commonStyles.loadingCard}><ActivityIndicator /></View>
        ) : analysisReports.length > 0 ? (
          <>
            <Text style={styles.listHeader}>Geçmiş Analizlerin</Text>
            <Animated.FlatList
              data={analysisReports}
              itemLayoutAnimation={LinearTransition.duration(300)}
              renderItem={({ item }) => (
                <ReportCard
                  item={item}
                  onPress={() => {
                    setActiveSummary(item.content);
                    setModalVisible(true);
                  }}
                  onDelete={() => deleteSummary(item.id)}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <LinearGradient
                colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyStateIconGradient}
              >
                <Ionicons
                  name="analytics-outline"
                  size={48}
                  color={Colors.light.tint}
                />
              </LinearGradient>
            </View>
            <Text style={styles.emptyStateText}>
              Henüz analiz oluşturulmadı
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Duygu geçmişini analiz etmeye başla
            </Text>
          </View>
        )}
      </View>

      {/* ARTIK TEK BİR SATIR! NE KADAR TEMİZ. */}
      <ReportDetailModal 
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        activeSummary={activeSummary}
        selectedDays={selectedDays}
      />
    </LinearGradient>
  );
}

// BU STİLLER SADECE ANA SAYFAYA AİT OLANLAR. MODAL'A AİT OLANLARI SİLDİK.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  back: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 30,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(227,232,240,0.4)",
  },
  headerTitle: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
  },
  content: {
    flex: 1, // Bu çok önemli! İçeriğin header altında kalan tüm alanı kaplamasını sağlar.
    paddingHorizontal: 24,
    paddingTop: 110,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1A1F36',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
  },
  sliderThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  analyzeButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  analyzeButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
  },
  analyzeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: "transparent",
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  emptyStateIconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    padding: 2.5,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1F36",
    marginTop: 24,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#4A5568",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    marginTop: 40,
    marginBottom: 16,
  },
  listContainer: {
    paddingVertical: 24,
  },
});
