// app/therapy/therapy_options.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router/";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Colors } from "../../../constants/Colors";
import { therapyOptions } from "../../../constants/therapyOptions";
import { TherapyOptionCard } from "../../../components/therapy/TherapyOptionCard";
import { useTranslation } from "react-i18next";

interface LocalizedTherapyOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string];
  route: string;
  features: string[];
}

const FALLBACK_TINT = "#3E6B89";

export default function TherapyOptionsScreen() {
  const router = useRouter();
  const { startConversationWith } = useLocalSearchParams<{ startConversationWith?: string }>();
  const { t } = useTranslation();
  
  // Güvenli renk değeri
  const tintColor = Colors?.light?.tint || FALLBACK_TINT;

  const handleOptionPress = (route: string) => {
    router.push({
      pathname: route,
      params: { startConversationWith } // Gelen parametreyi hedefe gönder
    });
  };

  const renderHeader = () => (
    <View style={styles.headerComponent}>
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../../assets/therapy-illustration.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>
        {t('therapy.options.hero_title')}
      </Text>
      <Text style={styles.subtitle}>
        {t('therapy.options.hero_subtitle')}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.flex}>
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              testID="back-button"
            >
              <Ionicons name="chevron-back" size={28} color={tintColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tintColor }]}>
              {t('therapy.options.header_title')}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <FlatList
            data={therapyOptions}
            renderItem={({ item }) => {
              const localized: LocalizedTherapyOption = {
                ...item,
                title: t(`therapy.options.${item.id}.title`),
                description: t(`therapy.options.${item.id}.description`),
                features: [
                  t(`therapy.options.${item.id}.features.0`),
                  t(`therapy.options.${item.id}.features.1`),
                  t(`therapy.options.${item.id}.features.2`),
                ],
              };
              return (
                <TherapyOptionCard
                  key={item.id}
                  item={localized}
                  onPress={handleOptionPress}
                />
              );
            }}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderHeader}
          />
        </View>
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
  contentWrapper: {
    flex: 1,
  },
  headerComponent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 8,
    shadowColor: FALLBACK_TINT,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(227,232,240,0.4)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  logoWrapper: {
    height: 120,
    overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: -15,
    opacity: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A5568",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});