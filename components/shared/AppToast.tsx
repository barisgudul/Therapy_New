// components/shared/AppToast.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { BaseToastProps } from 'react-native-toast-message';

import { Colors } from '../../constants/Colors';

// Marka kimliğimize uygun renkler ve ikonlar
const toastConfigMap = {
  success: {
    icon: 'checkmark-done-circle-outline',
    // Trafik ışığı yeşili yerine marka mavisi
    gradient: [Colors.light.tint, '#4988E5'],
  },
  error: {
    icon: 'alert-circle-outline',
    gradient: ['#F87171', '#EF4444'], // Vurucu Kırmızı Gradyan
  },
  info: {
    icon: 'sparkles-outline',
    gradient: [Colors.light.tint, '#4988E5'], // Bilgi mavi kalır
  },
} as const;

type AppToastProps = BaseToastProps & { variant?: 'success' | 'error' | 'info' };

export function AppToast({ variant = 'info', text1, text2 }: AppToastProps) {
  const config = toastConfigMap[variant];

  return (
    // Animasyon: Sadece belirmiyor, YUKARIDAN ZARİFÇE KAYARAK GELİYOR
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
    >
      <LinearGradient colors={['#FFFFFF', '#F4F6FF'] as const} style={styles.backgroundGradient}>
        <LinearGradient colors={config.gradient} style={styles.iconContainer}>
          <Ionicons name={config.icon as any} size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{text1}</Text>
          {text2 ? <Text style={styles.message}>{text2}</Text> : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    borderRadius: 50, // Tamamen hap şeklinde, modern ve yumuşak
    backgroundColor: 'transparent', // Arka planı gradyan yönetecek
    shadowColor: Colors.light.tint, // Gölge, marka rengimizden
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    marginTop: 10,
  },
  backgroundGradient: {
    minHeight: 60,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
  },
  message: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 2,
  },
});


