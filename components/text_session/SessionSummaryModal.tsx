// components/text_session/SessionSummaryModal.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';

interface SessionSummaryModalProps {
  isVisible: boolean;
  onClose: () => void;
  summaryText: string;
  title?: string;
  subtitle?: string;
}

const MODAL_GRADIENT_COLORS: [string, string] = ["#E0ECFD", "#F4E6FF"];

export default function SessionSummaryModal({
  isVisible,
  onClose,
  summaryText,
  title = 'Sohbet Özeti',
  subtitle = 'Bu görüşmeden çıkan kısa özet',
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 0, duration: 2000, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shakeAnimation.setValue(0);
      shakeAnimation.stopAnimation();
    }
  }, [isVisible, shakeAnimation]);

  const animatedStyle = {
    transform: [{
      translateX: shakeAnimation.interpolate({ inputRange: [-10, 10], outputRange: [-2, 2] })
    }]
  };

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
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={28} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{title || t('transcripts.summary.modal_title')}</Text>
        <Text style={styles.subtitle}>{subtitle || t('transcripts.summary.modal_subtitle')}</Text>

        <ScrollView style={styles.contentScrollView} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>{summaryText || t('transcripts.summary.preparing')}</Text>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
              <LinearGradient colors={MODAL_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButtonGradient}>
                <Text style={[styles.buttonText, styles.primaryButtonText]}>{t('transcripts.summary.close_button')}</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#6B46C1" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 0, alignItems: 'center', justifyContent: 'center' },
  contentContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  closeButton: { position: 'absolute', top: -12, right: -12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A202C', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  contentScrollView: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  primaryButtonText: { color: '#6B46C1' },
});


