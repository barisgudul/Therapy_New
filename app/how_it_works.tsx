// app/how_it_works.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors.ts";

const features = [
  {
    id: "ai",
    title: "Yapay Zeka Destekli Terapi",
    description:
      "Gelişmiş yapay zeka teknolojimiz, her seansınızı kişiselleştirilmiş bir deneyime dönüştürür. Duygularınızı analiz eder ve size özel çözümler sunar.",
    icon: "sparkles",
    color: ["#E0ECFD", "#F4E6FF"] as const,
  },
  {
    id: "therapists",
    title: "Uzman AI Terapistler",
    description:
      "Farklı uzmanlık alanlarına sahip AI terapistlerimiz, ihtiyaçlarınıza en uygun desteği sağlar. Her biri kendine özgü yaklaşım ve uzmanlık alanına sahiptir.",
    icon: "people",
    color: ["#F4E6FF", "#E0ECFD"] as const,
  },
  {
    id: "sessions",
    title: "Çoklu Terapi Seçenekleri",
    description:
      "Görüntülü, sesli veya yazılı seanslar arasından size en uygun olanı seçebilirsiniz. Her format, farklı ihtiyaçlara göre tasarlanmıştır.",
    icon: "videocam",
    color: ["#E0ECFD", "#F4E6FF"] as const,
  },
  {
    id: "analysis",
    title: "Duygu Analizi",
    description:
      "Seanslarınız boyunca duygusal durumunuzu analiz eder ve size özel içgörüler sunar. Bu sayede kendinizi daha iyi tanıyabilir ve gelişiminizi takip edebilirsiniz.",
    icon: "analytics",
    color: ["#F4E6FF", "#E0ECFD"] as const,
  },
  {
    id: "diary",
    title: "Duygu Günlüğü",
    description:
      "Günlük duygu ve düşüncelerinizi kaydedin. AI destekli günlük yazma deneyimi ile duygularınızı daha iyi ifade edin ve kendinizi keşfedin.",
    icon: "book",
    color: ["#E0ECFD", "#F4E6FF"] as const,
  },
  {
    id: "daily_write",
    title: "Günlük Yazma Asistanı",
    description:
      "Size özel sorularla günlük yazmanıza yardımcı olan AI asistanı. Duygularınızı daha derinlemesine keşfetmenizi sağlar ve kişisel gelişiminize katkıda bulunur.",
    icon: "create",
    color: ["#F4E6FF", "#E0ECFD"] as const,
  },
];

export default function HowItWorksScreen() {
  const router = useRouter();

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

      <Text style={styles.headerTitle}>Nasıl Çalışır?</Text>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Yapay Zeka Destekli Terapi Deneyimi
          </Text>
          <Text style={styles.introText}>
            therapy. uygulaması, en son yapay zeka teknolojilerini kullanarak
            size kişiselleştirilmiş bir terapi deneyimi sunar. Her seansınız
            benzersiz ve size özeldir.
          </Text>
        </View>

        {features.map((feature) => (
          <View key={feature.id} style={styles.featureCard}>
            <LinearGradient
              colors={feature.color}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featureGradient}
            >
              <View style={styles.featureContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={feature.icon as string}
                    size={32}
                    color={Colors.light.tint}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}

        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>Başlamak İçin 3 Adım</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Terapistinizi Seçin</Text>
              <Text style={styles.stepDescription}>
                Size en uygun AI terapisti seçin. Her terapist farklı uzmanlık
                alanlarına sahiptir.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Terapi Türünü Belirleyin</Text>
              <Text style={styles.stepDescription}>
                Görüntülü, sesli veya yazılı seanslardan size en uygun olanı
                seçin.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Terapiye Başlayın</Text>
              <Text style={styles.stepDescription}>
                Seçtiğiniz terapist ve terapi türüyle hemen seansınıza başlayın.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push("/therapy/avatar")}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={["#F8FAFF", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButtonGradient}
          >
            <View style={styles.startButtonContent}>
              <Ionicons
                name="arrow-forward-circle"
                size={24}
                color={Colors.light.tint}
              />
              <Text style={styles.startButtonText}>Terapistini Seç</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
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
  scrollView: {
    flex: 1,
    marginTop: 120,
  },
  scrollContent: {
    padding: 24,
  },
  introSection: {
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  introText: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  featureCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
  },
  featureGradient: {
    padding: 24,
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  featureDescription: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  stepsSection: {
    marginTop: 40,
    marginBottom: 32,
  },
  stepsTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepDescription: {
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  startButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: "rgba(93,161,217,0.3)",
    marginBottom: 32,
  },
  startButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: -0.3,
  },
});
