// components/therapy/TherapyOptionCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/Colors";

const TINT_COLOR = "#3E6B89"; // Fallback color

interface TherapyOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string];
  route: string;
  features: string[];
}

interface TherapyOptionCardProps {
  item: TherapyOption;
  onPress: (route: string) => void;
}

export const TherapyOptionCard: React.FC<TherapyOptionCardProps> = ({
  item,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.optionCard}
      onPress={() => onPress(item.route)}
    >
      <View style={styles.optionContent}>
        <LinearGradient
          colors={item.colors}
          style={styles.iconContainer}
        >
          <Ionicons
            name={item.icon}
            size={28}
            color={Colors?.light?.tint || TINT_COLOR}
          />
        </LinearGradient>
        <View style={styles.textContainer}>
          <Text style={styles.optionTitle}>{item.title}</Text>
          <Text style={styles.optionDescription}>
            {item.description}
          </Text>

          <View style={styles.featuresContainer}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={Colors?.light?.tint || TINT_COLOR}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={Colors?.light?.tint || TINT_COLOR}
          style={styles.arrowIcon}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  optionCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 20,
    marginBottom: 12,
  },
  arrowIcon: {
    marginLeft: 8,
  },

  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(93,161,217,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureIcon: {
    marginRight: 6,
  },
  featureText: {
    fontSize: 12,
    color: Colors?.light?.tint || TINT_COLOR,
    fontWeight: "500",
  },
});
