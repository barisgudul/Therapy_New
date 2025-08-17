// app/(app)/ai_summary.tsx
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import ReportCard from "../../components/ai_summary/ReportCard";
// @ts-ignore: react-native-html-to-pdf package has incomplete TypeScript definitions
import RNHTMLtoPDF from "react-native-html-to-pdf";
import Toast from "react-native-toast-message";
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Colors } from "../../constants/Colors";
import { commonStyles } from "../../constants/Styles";
import { useAuth } from "../../context/Auth";
import { supabase } from "../../utils/supabase";

interface AnalysisReport {
  id: string;
  created_at: string;
  // AI'dan gelen tam paket (yeni sözleşme)
  content: {
    reportSections: {
      mainTitle: string;
      overview: string;
      goldenThread: string;
      blindSpot: string;
    };
    reportAnalogy: {
      title: string;
      text: string;
    };
    derivedData: {
      readMinutes: number;
      headingsCount: number;
    };
  };
  days_analyzed: number;
}

// deriveFromMarkdown artık backend'de yapılıyor; frontend'de kaldırıldı

export default function AISummaryScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [maxDays] = useState(30);
  const [selectedDays, setSelectedDays] = useState(7);
  const [analysisReports, setAnalysisReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSummary, setActiveSummary] = useState<AnalysisReport['content'] | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [_simLoading, _setSimLoading] = useState(false);

  // Not: Yeni pano yapısında Markdown etkileşimi kullanılmıyor; eski yardımcılar silindi

  // Kayıtlı özetleri yükle
  useEffect(() => {
    loadSavedReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedReports = async () => {
    setLoadingReports(true);
    try {
      // Supabase'den kullanıcının raporlarını çek
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Raporlar yüklenirken hata:', error);
      } else if (data) {
        setAnalysisReports(data);
      }
    } catch (e) {
      console.error('Raporlar yüklenirken hata:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // 1) Sadece backend fonksiyonunu çağır
      const { error } = await supabase.functions.invoke('create-analysis-report', {
        body: { days: selectedDays },
      });
      if (error) throw error;

      // 2) Bilgilendir
      Toast.show({
        type: 'success',
        text1: 'Raporun Hazır',
        text2: 'Yeni kişisel raporun oluşturuldu ve kaydedildi.',
      });

      // 3) Listeyi tazele
      await loadSavedReports();
    } catch (e: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Bir Hata Oluştu',
        text2: e instanceof Error ? e.message : 'Rapor oluşturulamadı.',
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

  // PDF OLUŞTURMA ve PAYLAŞIM
  const exportToPDF = async () => {
    // PDF şu an overview+goldenThread kombinasyonuyla oluşturulacak
    if (!activeSummary) return;

    try {
      // Markdown'ı HTML'e çevir
      const convertMarkdownToHTML = (markdown: string): string => {
        return markdown
          .replace(
            /^## (.*$)/gim,
            '<h2 style="color: #4988e5; margin: 20px 0 10px 0; font-size: 18px; font-weight: 600;">$1</h2>',
          )
          .replace(
            /^### (.*$)/gim,
            '<h3 style="color: #4988e5; margin: 16px 0 8px 0; font-size: 16px; font-weight: 600;">$1</h3>',
          )
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong style="font-weight: 600;">$1</strong>',
          )
          .replace(
            /^• (.*$)/gim,
            '<li style="margin: 4px 0; padding-left: 8px;">$1</li>',
          )
          .replace(
            /(<li.*<\/li>)/gs,
            '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>',
          )
          .replace(/\n/g, "<br/>");
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Kişisel Rapor</title>
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
              <h2>therapy<span style="color:#5DA1D9;">.</span> - Kişisel Rapor</h2>
              <div class="divider"></div>
              <div class="content">
                ${convertMarkdownToHTML((activeSummary.reportSections.overview + '\n\n' + activeSummary.reportSections.goldenThread).trim())}
              </div>
              <div class="footer">
                Bu PDF, therapy. uygulamasının Kişisel Rapor özelliği ile otomatik oluşturulmuştur.
              </div>
            </div>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `therapy_kisisel_rapor_${new Date().toISOString().split("T")[0]}`,
        directory: "Documents",
        base64: false,
        height: 842,
        width: 595,
        padding: 10,
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (file.filePath) {
        const fileUri = `file://${file.filePath}`;
        await Sharing.shareAsync(fileUri, {
          dialogTitle: "Raporunu Paylaş",
          mimeType: "application/pdf",
          UTI: Platform.OS === "ios" ? "com.adobe.pdf" : undefined,
        });
      }
    } catch (e) {
      console.error("PDF oluşturma hatası:", e);
      Toast.show({ type: 'error', text1: 'PDF Oluşturulamadı', text2: 'PDF oluşturulurken bir hata oluştu.' });
    }
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#F8FAFF", "#FFFFFF"]}
            style={styles.modalGradientBg}
          />
          <ScrollView 
            style={styles.modalFullScreen}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* HEADER SECTION */}
            <LinearGradient
              colors={["rgba(93,161,217,0.15)", "rgba(93,161,217,0.06)", "transparent"]}
              style={styles.modalHeader}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <View style={styles.modalCloseBtnInner}>
                  <Ionicons name="close" size={24} color={Colors.light.tint} />
                </View>
              </TouchableOpacity>
              
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalBadge}>
                  <LinearGradient
                    colors={["#5DA1D9", "#4988E5"]}
                    style={styles.modalBadgeGradient}
                  >
                    <Text style={styles.modalBadgeText}>Kişisel Rapor</Text>
                  </LinearGradient>
      </View>

                <Text style={styles.modalMainTitle}>{activeSummary ? activeSummary.reportSections.mainTitle : 'Kişisel Rapor'}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDays} Günlük Derinlemesine Analiz
                </Text>
                
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.light.tint} />
                    <Text style={styles.modalStatText}>{selectedDays} gün</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.light.tint} />
                    <Text style={styles.modalStatText}>
                      {new Date().toLocaleDateString("tr-TR", { 
                        day: "numeric", 
                        month: "long" 
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* MAIN CONTENT */}
            <View style={styles.modalBody}>
              {activeSummary ? (
                <>
                  {/* META: Metafor Kartı */}
                  <View style={styles.analogyCard}>
                    <LinearGradient colors={["rgba(93,161,217,0.15)", "rgba(93,161,217,0.05)"]} style={styles.analogyGradient}>
                      <Ionicons name="bulb-outline" size={24} color={Colors.light.tint} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.analogyTitle}>{activeSummary.reportAnalogy.title}</Text>
                        <Text style={styles.analogyText}>{activeSummary.reportAnalogy.text}</Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Bölümler */}
                  <View style={styles.reportSection}>
                    <Text style={styles.modalSectionTitle}>Genel Bakış</Text>
                    <Markdown style={modalMarkdownStyles}>{activeSummary.reportSections.overview}</Markdown>
                  </View>
                  <View style={styles.reportSection}>
                    <Text style={styles.modalSectionTitle}>Günlük Kayıtların Analizi</Text>
                    <Markdown style={modalMarkdownStyles}>{activeSummary.reportSections.goldenThread}</Markdown>
                  </View>
                  <View style={styles.reportSection}>
                    <Text style={styles.modalSectionTitle}>Kör Nokta</Text>
                    <Markdown style={modalMarkdownStyles}>{activeSummary.reportSections.blindSpot}</Markdown>
                  </View>

                  {/* İstatistik Kartları */}
                  <View style={styles.modalInsightSection}>
                    <Text style={styles.modalSectionTitle}>Öne Çıkan İçgörüler</Text>
                    
                    <View style={styles.modalInsightGrid}>
                      <LinearGradient
                        colors={["rgba(147,51,234,0.12)", "rgba(147,51,234,0.04)"]}
                        style={styles.modalInsightCard}
                      >
                        <Ionicons name="trending-up" size={24} color="#9333EA" />
                        <Text style={styles.modalInsightLabel}>Gelişim Trendi</Text>
                        <Text style={styles.modalInsightValue}>Yükseliş</Text>
                      </LinearGradient>
                      
                      <LinearGradient
                        colors={["rgba(236,72,153,0.12)", "rgba(236,72,153,0.04)"]}
                        style={styles.modalInsightCard}
                      >
                        <Ionicons name="heart" size={24} color="#EC4899" />
                        <Text style={styles.modalInsightLabel}>Duygusal Denge</Text>
                        <Text style={styles.modalInsightValue}>Dengeli</Text>
                      </LinearGradient>
                      
                      <LinearGradient
                        colors={["rgba(34,197,94,0.12)", "rgba(34,197,94,0.04)"]}
                        style={styles.modalInsightCard}
                      >
                        <Ionicons name="bulb" size={24} color="#22C55E" />
                        <Text style={styles.modalInsightLabel}>Farkındalık</Text>
                        <Text style={styles.modalInsightValue}>Yüksek</Text>
                      </LinearGradient>
                      
                      <LinearGradient
                        colors={["rgba(251,146,60,0.12)", "rgba(251,146,60,0.04)"]}
                        style={styles.modalInsightCard}
                      >
                        <Ionicons name="flame" size={24} color="#FB923C" />
                        <Text style={styles.modalInsightLabel}>Enerji Seviyesi</Text>
                        <Text style={styles.modalInsightValue}>Optimal</Text>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Tavsiye Bölümü */}
                  <View style={styles.modalRecommendSection}>
                    <LinearGradient
                      colors={["rgba(93,161,217,0.1)", "rgba(93,161,217,0.03)"]}
                      style={styles.modalRecommendCard}
                    >
                      <View style={styles.modalRecommendHeader}>
                        <Ionicons name="compass" size={24} color={Colors.light.tint} />
                        <Text style={styles.modalRecommendTitle}>Kişisel Pusula</Text>
                      </View>
                      <Text style={styles.modalRecommendText}>
                        Bu dönem boyunca gösterdiğin direnç ve farkındalık takdire değer. 
                        Gelecek günlerde duygularına alan açmaya ve içsel sesini dinlemeye devam et.
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Alt Aksiyonlar */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      onPress={exportToPDF}
                      style={styles.modalPrimaryAction}
                    >
                      <LinearGradient
                        colors={["#F8FAFF", "#FFFFFF"]}
                        style={styles.modalActionGradient}
                      >
                        <Ionicons name="download-outline" size={20} color={Colors.light.tint} />
                        <Text style={[styles.modalActionText, { color: Colors.light.tint }]}>PDF İndir</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.modalSecondaryAction}
                      onPress={() => {
                        // Paylaşım fonksiyonu eklenebilir
                      }}
                    >
                      <Ionicons name="share-social-outline" size={20} color={Colors.light.tint} />
                      <Text style={[styles.modalSecondaryActionText, { color: Colors.light.tint }]}>Paylaş</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.modalLoadingState}>
                  <ActivityIndicator size="large" color={Colors.light.tint} />
                  <Text style={styles.modalLoadingText}>Analiz yükleniyor...</Text>
                </View>
              )}
            </View>
          </ScrollView>
      </View>
      </Modal>
    </LinearGradient>
  );
}

const _markdownStyles = StyleSheet.create({
  heading2: {
    color: Colors.light.tint,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(93,161,217,0.1)",
    paddingBottom: 8,
  },
  heading3: {
    color: "#1A1F36",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 24,
  },
  strong: {
    fontWeight: "bold",
  },
  bullet_list: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  list_item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    lineHeight: 22,
  },
});

// Modal için özel markdown stilleri - Açık tema, marka renkleri
const modalMarkdownStyles = StyleSheet.create({
  heading1: {
    fontSize: 28,
    fontWeight: "400",
    color: Colors.light.tint,
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93,161,217,0.15)",
    paddingBottom: 10,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1F36",
    marginTop: 20,
    marginBottom: 12,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 24,
    marginBottom: 14,
  },
  paragraph: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 24,
    marginBottom: 16,
  },
  strong: {
    fontWeight: "700",
    color: Colors.light.tint,
    backgroundColor: "rgba(93,161,217,0.10)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  em: {
    fontStyle: "italic",
    color: "#6B7280",
  },
  bullet_list: {
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 6,
  },
  ordered_list: {
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 6,
  },
  list_item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet_list_icon: {
    color: Colors.light.tint,
    fontSize: 16,
    lineHeight: 24,
    marginRight: 6,
  },
  ordered_list_icon: {
    color: Colors.light.tint,
    fontSize: 14,
    lineHeight: 24,
    marginRight: 6,
    fontWeight: "600",
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.tint,
    paddingLeft: 16,
    paddingVertical: 8,
    marginVertical: 14,
    backgroundColor: "rgba(93,161,217,0.08)",
    borderRadius: 8,
  },
  code_inline: {
    backgroundColor: "rgba(17,24,39,0.04)",
    color: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
  },
  fence: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginVertical: 14,
  },
  thead: {
    backgroundColor: "rgba(93,161,217,0.1)",
  },
  th: {
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  td: {
    padding: 10,
    borderRightWidth: 1,
    borderColor: "#F3F4F6",
  },
  link: {
    color: Colors.light.tint,
    textDecorationLine: "underline",
    textDecorationColor: "rgba(93,161,217,0.3)",
  },
  image: {
    borderRadius: 12,
    marginVertical: 14,
  },
  hr: {
    backgroundColor: "#E5E7EB",
    height: 1,
    marginVertical: 18,
  },
  text: {
    color: "#374151",
  },
});

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
    flex: 1,
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
  // MODAL STİLLERİ - SANAT ESERİ SEVİYESİNDE
  modalContainer: {
    flex: 1,
  },
  modalGradientBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  modalFullScreen: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 100,
  },
  modalCloseBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(93,161,217,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderContent: {
    alignItems: "center",
  },
  modalBadge: {
    marginBottom: 16,
  },
  modalBadgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalMainTitle: {
    fontSize: 42,
    fontWeight: "300",
    color: Colors.light.tint,
    marginBottom: 8,
    letterSpacing: -1,
  },
  modalSubtitle: {
    fontSize: 18,
    color: "#475569",
    marginBottom: 24,
  },
  modalStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(93,161,217,0.06)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalStatText: {
    color: "#475569",
    fontSize: 14,
  },
  modalStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(93,161,217,0.2)",
    marginHorizontal: 16,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  analogyCard: {
    borderRadius: 20,
    marginVertical: 16,
    overflow: 'hidden',
  },
  analogyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
    borderRadius: 20,
  },
  analogyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  analogyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  reportSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.1)',
  },
  modalContentCard: {
    marginTop: -20,
    marginBottom: 32,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalContentCardGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
    borderRadius: 24,
  },
  derivedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  derivedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(93,161,217,0.08)",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
  },
  derivedChipText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: "600",
  },
  keywordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  keywordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(93,161,217,0.06)",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.18)",
  },
  keywordChipText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: "600",
  },
  modalInsightSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 16,
  },
  modalInsightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modalInsightCard: {
    flex: 1,
    minWidth: "47%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  modalInsightLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInsightValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1F36",
  },
  modalRecommendSection: {
    marginBottom: 32,
  },
  modalRecommendCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
  },
  modalRecommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalRecommendTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  modalRecommendText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalPrimaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  modalActionGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSecondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.3)",
  },
  modalSecondaryActionText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: "500",
  },
  modalLoadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  modalLoadingText: {
    color: "#64748B",
    fontSize: 16,
    marginTop: 16,
  },
  exportButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  exportButtonGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  exportButtonIcon: {
    marginRight: 8,
  },
  exportButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
