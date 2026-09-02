import React from "react";
import { ActivityIndicator, Animated, Dimensions, ScrollView, StyleSheet, View} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useQuery } from "@tanstack/react-query";
import ConfettiCannon from "react-native-confetti-cannon";

import { HomeHeader } from "../../components/home/HomeHeader";
import { HomeIllustration } from "../../components/home/HomeIllustration";
import { HomeActions } from "../../components/home/HomeActions";

import PendingDeletionScreen from "../../components/PendingDeletionScreen.tsx";
import ReportModal from "../../components/ReportModal.tsx";
import FeedbackModal from "../../components/daily_reflection/FeedbackModal";
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
    streak,
    reflectedToday,
    shouldCelebrate,
    markCelebrated,
    handleStreakPress,
    handleDailyPress,
    handleReportPress,
    handleSettingsPress,
    handleModalClose,
    handleNavigateToTherapy,
    invalidateLatestReport,
  } = useHomeScreen();

  // Milestone'a ulaşıldıysa kutlamayı bir kez işaretle (tekrar tetiklenmesin)
  React.useEffect(() => {
    if (shouldCelebrate) {
      const id = setTimeout(() => markCelebrated(), 1500);
      return () => clearTimeout(id);
    }
  }, [shouldCelebrate, markCelebrated]);

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
          testID="home-screen"
        >
          <HomeHeader
            onSettingsPress={handleSettingsPress}
            streak={streak}
            streakActiveToday={reflectedToday}
            onStreakPress={handleStreakPress}
          />

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

        <FeedbackModal
          isVisible={activeModal === 'dailyMessage'}
          onClose={handleModalClose}
          aiMessage={dailyMessage}
          gradientColors={["#E0ECFD", "#F4E6FF"]}
          dynamicColor={Colors.light.tint}
          satisfactionScore={null}
          onSatisfaction={() => {}}
          onNavigateToTherapy={handleNavigateToTherapy}
        />

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

        {shouldCelebrate && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <ConfettiCannon
              count={140}
              origin={{ x: Dimensions.get("window").width / 2, y: -20 }}
              fadeOut
              autoStart
              explosionSpeed={350}
              fallSpeed={2800}
            />
          </View>
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

});