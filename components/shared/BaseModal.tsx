// components/shared/BaseModal.tsx

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import ReactNativeModal from "react-native-modal";

type BaseModalProps = {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColors: [string, string];
  children: React.ReactNode;
};

export function BaseModal({
  isVisible,
  onClose,
  title,
  subtitle,
  iconName,
  iconColors,
  children,
}: BaseModalProps) {
  return (
    <ReactNativeModal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      swipeDirection="down"
      onSwipeComplete={onClose}
      backdropTransitionOutTiming={0}
      useNativeDriver
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      avoidKeyboard
      style={styles.modalStyle}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.contentContainer}>
          {/* MODAL HEADER (İKON, BAŞLIK, KAPATMA BUTONU) */}
          <View style={styles.headerContainer}>
            <TouchableOpacity testID="close-button" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
            <View style={styles.iconWrapper}>
              <LinearGradient colors={iconColors} style={styles.iconGradient}>
                <Ionicons name={iconName} size={24} color="white" />
              </LinearGradient>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.divider} />

          {/* ESNEK İÇERİK ALANI */}
          <View style={styles.childrenContainer}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </ReactNativeModal>
  );
}

const styles = StyleSheet.create({
  modalStyle: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    width: "90%",
    maxHeight: "85%",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A202C",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 5,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 20,
  },
  childrenContainer: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
});


