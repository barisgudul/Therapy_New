// components/how_it_works/FeatureCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/Colors";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: readonly [string, string];
}

interface FeatureCardProps {
  feature: Feature;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  return (
    <View style={styles.featureCard}>
      <LinearGradient
        colors={feature.color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featureGradient}
      >
        <View style={styles.featureContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={feature.icon}
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
  );
};
const styles = StyleSheet.create({
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
});
