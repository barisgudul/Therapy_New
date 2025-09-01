// components/ai_summary/ReportDetailModal.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Colors } from "../../constants/Colors";
import { generatePdf } from "../../utils/pdfGenerator";
import { AnalysisReport } from "../../types/analysis";

interface ReportDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  activeSummary: AnalysisReport['content'] | null;
  selectedDays: number;
}

export default function ReportDetailModal({
  isVisible,
  onClose,
  activeSummary,
  selectedDays,
}: ReportDetailModalProps) {
  
  const handleExportPDF = async () => {
    if (!activeSummary) return;
    // Artık tüm pis işi bu fonksiyon yapacak
    await generatePdf(activeSummary); 
  };

  // YENİ KONTROL MEKANİZMASI
  const isAnalysisMeaningful = activeSummary && 
    !activeSummary.reportSections.overview.toLowerCase().includes("yeterli veri") &&
    !activeSummary.reportSections.overview.toLowerCase().includes("kayda değer bir an");
  
  return (
    <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
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
              onPress={onClose}
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

                {/* İstatistik Kartları - İŞTE DEĞİŞİKLİK BURADA! */}
                {isAnalysisMeaningful && (
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
                )}

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
                    onPress={handleExportPDF}
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
  );
}

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
