// components/home/HomeHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

interface HomeHeaderProps {
  onSettingsPress: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onSettingsPress }) => {
  return (
    <View style={styles.topBar}>
      <Text style={styles.brand}>
        therapy<Text style={styles.dot}>.</Text>
      </Text>
      <View style={styles.topButtons}>
        <TouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingButton}
        >
          <Ionicons
            name="settings-sharp"
            size={28}
            color={Colors.light.tint}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0, // Header ile logo arasına daha az boşluk
  },
  brand: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: 1.5,
    opacity: 0.95,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 32,
    fontWeight: "900",
  },
  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingButton: {
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
});
