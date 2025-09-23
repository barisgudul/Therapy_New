// components/PremiumGate.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti'; // <<< ZARİF ANİMASYONLAR İÇİN
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  useFeatureAccess,
  useSubscription,
} from '../hooks/useSubscription';
import { UsageStats } from '../services/subscription.service';
import { useTranslation } from 'react-i18next';

// =================================================================
// ANA BİLEŞEN
// =================================================================

interface PremiumGateProps {
  children: React.ReactNode;
  featureType?: keyof UsageStats;
  premiumOnly?: boolean;
  fallback?: React.ReactNode;
  onUpgrade?: () => void;
}

export function PremiumGate({
  children,
  featureType,
  premiumOnly = false,
  fallback,
  onUpgrade,
}: PremiumGateProps) {
  const router = useRouter();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const featureAccess = useFeatureAccess(featureType!);

  const handleUpgrade = onUpgrade ?? (() => router.push('/subscription'));

  // 1. Yükleme Durumu
  if (subscriptionLoading || (featureType && featureAccess.loading)) {
    return (
      <LinearGradient
        colors={['#F4F6FF', '#FFFFFF']}
        style={styles.fullScreenContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </LinearGradient>
    );
  }

  // 2. Yetki Kontrolü
  const showPremiumPrompt = premiumOnly && !isPremium;
  const showUsageLimitPrompt =
    featureType && !featureAccess.can_use && !isPremium;

  if (showPremiumPrompt || showUsageLimitPrompt) {
    if (fallback) return <View style={{ flex: 1 }}>{fallback}</View>;

    return (
      <ElegantBlocker
        isPremiumOnly={showPremiumPrompt}
        onUpgrade={handleUpgrade}
      />
    );
  }

  // 3. Erişim Varsa: Sarmalanan içeriği göster
  return <>{children}</>;
}


// =================================================================
// ZARİF ENGELLEYİCİ EKRAN (Final Tasarım)
// =================================================================

interface ElegantBlockerProps {
  isPremiumOnly: boolean;
  onUpgrade: () => void;
}

function ElegantBlocker({ isPremiumOnly, onUpgrade }: ElegantBlockerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  
  const title = isPremiumOnly
    ? t('premium_gate.premium_title')
    : t('premium_gate.limit_title');
  const description = isPremiumOnly
    ? t('premium_gate.premium_description')
    : t('premium_gate.limit_description');
  const buttonText = t('premium_gate.view_plans');
  const iconName = isPremiumOnly ? 'diamond-outline' : 'hourglass-outline';
  
  // subscription.tsx'ten renkler ve TypeScript hatasını çözen "as const"
  const theme = {
      gradient: ['#F4E6FF', '#EBF0FF'] as const,
      textColor: '#5B21B6',
      iconContainerBg: 'rgba(255, 255, 255, 0.7)',
      buttonGradient: ['#8B5CF6', '#6D28D9'] as const,
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.fullScreenContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="close" size={28} color={theme.textColor} />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        {/* Logo */}
        <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 100 }}
        >
            <Image
              source={require('../assets/logo.png')} // Varsayılan logo yolu
              style={styles.logo}
            />
        </MotiView>

        {/* Anismasyonlu İkon */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 500, delay: 200 }}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.iconContainerBg }]}>
            <Ionicons name={iconName} size={60} color={theme.textColor} />
          </View>
        </MotiView>

        {/* Anismasyonlu Metinler */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 300 }}
        >
          <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 450 }}
        >
          <Text style={[styles.description, { color: theme.textColor, opacity: 0.8 }]}>
              {description}
          </Text>
        </MotiView>

        {/* Anismasyonlu Buton */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 700, delay: 600 }}
          style={styles.upgradeButtonWrapper}
        >
            <TouchableOpacity onPress={onUpgrade} activeOpacity={0.8}>
                <LinearGradient
                    colors={theme.buttonGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.upgradeButton}
                >
                    <Ionicons name="sparkles" size={22} color="white" />
                    <Text style={styles.upgradeButtonText}>{buttonText}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </MotiView>
      </View>
    </LinearGradient>
  );
}

// =================================================================
// STİLLER (Zarafet Odaklı)
// =================================================================

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // "Glassmorphism" efekti
    borderRadius: 30,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  logo: { // YENİ EKLENDİ
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 30,
    opacity: 0.9,
  },
  iconContainer: {
    width: 120, // Daha büyük ve etkileyici
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: 'rgba(91, 33, 182, 0.4)', // Premium renginin gölgesi
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  title: {
    fontSize: 34, // Daha güçlü başlık
    fontWeight: '900', // En kalın font ağırlığı
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28, // Daha ferah satır aralığı
    marginBottom: 48,
    maxWidth: '100%',
  },
  upgradeButtonWrapper: {
    width: '100%',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  upgradeButton: {
    borderRadius: 50,
    paddingVertical: 20, // Daha estetik bir görünüm için hafifçe ayarlandı
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  upgradeButtonText: {
    fontSize: 20, // Daha estetik bir görünüm için hafifçe ayarlandı
    fontWeight: 'bold',
    color: 'white',
  },
});