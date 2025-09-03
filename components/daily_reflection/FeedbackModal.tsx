// components/daily_reflection/FeedbackModal.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { renderMarkdownText } from '../../utils/markdownRenderer';


interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  aiMessage: string;
  gradientColors: [string, string];
  dynamicColor: string;
  satisfactionScore: number | null;
  onSatisfaction: (score: number) => void;
  onNavigateToTherapy: () => void;
}

export default function FeedbackModal({
  isVisible,
  onClose,
  aiMessage,
  dynamicColor,
  satisfactionScore,
  onSatisfaction,
  onNavigateToTherapy,
}: FeedbackModalProps) {

    const shakeAnimation = useRef(new Animated.Value(0)).current; // Titreme animasyonu için

    useEffect(() => {
        if (isVisible) {
            // "Titreme" (sallanma) animasyonu
            Animated.loop(
                Animated.sequence([
                    // Bekle
                    Animated.timing(shakeAnimation, {
                        toValue: 0,
                        duration: 2000, // 2 saniye bekle
                        useNativeDriver: true,
                    }),
                    // Hızlıca salla
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

    // Sallanma efektini translateX'e çevir
    const animatedStyle = {
        transform: [{
            translateX: shakeAnimation.interpolate({
                inputRange: [-10, 10],
                outputRange: [-2, 2], // Sadece 2 piksel sola sağa oynasın, zarif olsun
            })
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
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logoImage}
                />
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
          {renderMarkdownText(aiMessage || "Yansımanız hazırlanıyor...", dynamicColor)}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Animated.View style={[{flex: 1}, animatedStyle]}> {/* <-- YENİ ANİMASYON STİLİNİ UYGULA */}
              <TouchableOpacity
                style={[styles.button]}
                onPress={() => {
                    // Tıklayınca hafif bir titreşim ver
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNavigateToTherapy();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#F4E6FF", "#E0ECFD"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.secondaryButtonGradient}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6B46C1" />
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Sohbet Et
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.button]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#E0ECFD", "#F4E6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Tamamdır
              </Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#6B46C1" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Satisfaction Feedback */}
        <View style={styles.satisfactionContainer}>
          <Text style={styles.satisfactionText}>
            Bu yanıt nasıl? Geri bildiriminiz bizim için değerli.
          </Text>
          <View style={styles.satisfactionButtons}>
            <TouchableOpacity
              style={[
                styles.satisfactionButton,
                satisfactionScore === -1 && styles.satisfactionButtonActive
              ]}
              onPress={() => onSatisfaction(-1)}
              disabled={satisfactionScore !== null}
              activeOpacity={0.7}
            >
              <Ionicons
                name={satisfactionScore === -1 ? "thumbs-down" : "thumbs-down-outline"}
                size={24}
                color={satisfactionScore === -1 ? "#ef4444" : "#6b7280"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.satisfactionButton,
                satisfactionScore === 1 && styles.satisfactionButtonActive
              ]}
              onPress={() => onSatisfaction(1)}
              disabled={satisfactionScore !== null}
              activeOpacity={0.7}
            >
              <Ionicons
                name={satisfactionScore === 1 ? "thumbs-up" : "thumbs-up-outline"}
                size={24}
                color={satisfactionScore === 1 ? "#10b981" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>
        </View>
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
    // YENİ STİLLER
    backgroundColor: '#FFFFFF', // logonun arkası temiz dursun
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4, // Logoya biraz nefes aldır
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12, // Butonlar arası boşluk
  },
  button: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // "Sohbet Et" butonu için
  secondaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  // "Tamamdır" butonu için
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#6B46C1',
  },
  secondaryButtonText: {
    color: '#6B46C1',
  },
  satisfactionContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  satisfactionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  satisfactionButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  satisfactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  satisfactionButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 2,
  },
});
