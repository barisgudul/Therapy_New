// components/daily_reflection/FeedbackModal.tsx

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import { renderMarkdownText } from '../../utils/markdownRenderer';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  aiMessage: string;
  gradientColors: [string, string];
  dynamicColor: string;
}

export default function FeedbackModal({
  isVisible,
  onClose,
  aiMessage,
  gradientColors,
  dynamicColor,
}: FeedbackModalProps) {
  return (
    <Modal
      isVisible={isVisible}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      backdropOpacity={0}
      animationIn="zoomIn"
      animationOut="zoomOut"
      style={styles.modal}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient colors={gradientColors} style={styles.iconGradient}>
                  <Ionicons name="sparkles-outline" size={24} color="white" />
              </LinearGradient>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#D1D5DB" />
            </TouchableOpacity>
        </View>

        <Text style={styles.title}>Günlük Yansıman</Text>
        <Text style={styles.subtitle}>
          Bugünkü duygularına dair düşüncelerim
        </Text>

        <ScrollView 
          style={styles.contentScrollView}
          showsVerticalScrollIndicator={false}
        >
          {renderMarkdownText(aiMessage, dynamicColor)}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Stilleri InputModal ile tutarlı tutuyoruz
const styles = StyleSheet.create({
  modal: {
    margin: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -12,
    right: -12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A202C",
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  contentScrollView: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
});
