// components/home/ActionButton.tsx
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ActionButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  isSpecial?: boolean; // Özel butonlar için (Haftalık rapor gibi)
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onPress, icon, text, isSpecial = false }) => {
  const gradientColors = isSpecial ? ["#4F46E5", "#6D28D9"] as const : ["#FFFFFF", "#F8FAFF"] as const;
  const textColor = isSpecial ? "#FFFFFF" : Colors.light.tint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isSpecial && styles.specialButton,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
        <View style={styles.buttonContent}>
          <Ionicons name={icon} size={20} color={textColor} />
          <Text style={[styles.buttonText, { color: textColor }]}>{text}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

// HomeActions.tsx'teki stilleri buraya taşı
const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 52,
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
  specialButton: {
    borderColor: "rgba(129, 140, 248, 0.5)",
    shadowColor: "#6D28D9",
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: -0.2,
  },
});
