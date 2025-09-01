import React from "react";
import { ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { HomeHeader } from "../../components/home/HomeHeader";
import { HomeIllustration } from "../../components/home/HomeIllustration";
import { HomeActions } from "../../components/home/HomeActions";
import { MarkdownRenderer } from "../../components/shared/MarkdownRenderer";
import PendingDeletionScreen from "../../components/PendingDeletionScreen.tsx";
import ReportModal from "../../components/ReportModal.tsx";
import { useAuth } from "../../context/Auth.tsx";
import { useHomeScreen } from "../../hooks/useHomeScreen";
import { getLatestUserReport, UserReport } from "../../services/report.service";
import { Colors } from "../../constants/Colors";

export default function HomeScreen() {
  const { isPendingDeletion, isLoading: isAuthLoading } = useAuth();

  const { data: latestReport } = useQuery<UserReport | null>({
    queryKey: ["latestReport"],
    queryFn: getLatestUserReport,
    enabled: true,
  });

  const {
    activeModal,
    scaleAnim,
    dailyMessage,
    isVaultLoading,
    handleDailyPress,
    handleReportPress,
    handleSettingsPress,
    handleModalClose,
    invalidateLatestReport,
  } = useHomeScreen();

  if (isAuthLoading || isVaultLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (isPendingDeletion) {
    return <PendingDeletionScreen />;
  }

  return (
    <LinearGradient colors={["#F8F9FC", "#FFFFFF"]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
        >
          <HomeHeader onSettingsPress={handleSettingsPress} />

          <View style={styles.contentContainer}>
            <View style={styles.topSection}>
              <HomeIllustration />
            </View>

            <View style={styles.bottomSection}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                <HomeActions
                  onDailyPress={handleDailyPress}
                  onReportPress={handleReportPress}
                  latestReport={latestReport}
                />
              </ScrollView>
            </View>
          </View>
        </Animated.View>

        {activeModal && (
          <BlurView
            intensity={60}
            tint="default"
            style={StyleSheet.absoluteFill}
          />
        )}

        <Modal
          visible={activeModal === 'dailyMessage'}
          transparent
          animationType="fade"
          onRequestClose={handleModalClose}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleModalClose}
                  style={styles.modalBackButton}
                >
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
                <View style={styles.modalIcon}>
                  <LinearGradient
                    colors={[Colors.light.tint, "#8B5CF6"]}
                    style={styles.modalIconGradient}
                  >
                    <Ionicons name="sparkles" size={24} color="white" />
                  </LinearGradient>
                </View>
                <View style={{ width: 40, height: 40 }} />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Günlük Yansıman</Text>
                <Text style={styles.modalSubtitle}>
                  Bugünkü duygularına dair düşüncelerim
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <MarkdownRenderer content={dailyMessage} accentColor={Colors.light.tint} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {latestReport && (
          <ReportModal
            isVisible={activeModal === 'report'}
            onClose={() => {
              handleModalClose();
              invalidateLatestReport();
            }}
            report={latestReport}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: '5%', // Yukarıdan olması gereken boşluk.
    marginBottom: 24, // Üst ve alt bölüm arasındaki boşluk.
  },
  bottomSection: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 450,
    maxHeight: "85%",
    minHeight: "60%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 0,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A202C",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 5,
    letterSpacing: -0.2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 20,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  modalText: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: "center",
  },
});