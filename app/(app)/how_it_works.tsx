// app/how_it_works.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router/";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image, // Image component'ini import et
} from "react-native";
import { Colors } from "../../constants/Colors";
import { features, steps } from "../../constants/howItWorksContent";
import { FeatureCard } from "../../components/how_it_works/FeatureCard";
import { StepCard } from "../../components/how_it_works/StepCard";

export default function HowItWorksScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nasıl Çalışır?</Text>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          data={features}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <>
              <View style={styles.imageWrapper}>
                <Image
                  source={require('../../assets/therapy-illustration.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.introSection}>
                <Text style={styles.introTitle}>
                  Kişisel Gelişim Yolculuğunuz
                </Text>
                <Text style={styles.introText}>
                  therapy., duygusal farkındalığınızı geliştirmek ve kişisel gelişiminizi
                  desteklemek için tasarlandı. Yapay zeka teknolojisiyle günlük rutininizi
                  zenginleştirin, düşüncelerinizi keşfedin ve kendinizi daha iyi tanıyın.
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) => <FeatureCard feature={item} />}
          ListFooterComponent={
            <>
              <View style={styles.stepsSection}>
                <Text style={styles.stepsTitle}>Kullanım Adımları</Text>
                {steps.map((step) => (
                  <StepCard key={step.number} step={step} />
                ))}
              </View>
            </>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
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
    fontSize: 24,
    fontWeight: "600",
    color: Colors.light.tint,
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 10,
  },
  imageWrapper: {
    height: 120, // Görünür alanın yüksekliği. Değiştirerek ayarla.
    overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: -15, // Görünmez boşluğu kırmak için. Değiştirerek ayarla.
    opacity: 0.8,
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

});
