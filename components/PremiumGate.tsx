// components/PremiumGate.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { formatUsageText, getUsageColor, getUsagePercentage, useFeatureAccess, useSubscription } from '../hooks/useSubscription';
import { UsageStats } from '../services/subscription.service';

interface PremiumGateProps {
  children: React.ReactNode;
  featureType?: 'text_sessions' | 'voice_sessions' | 'dream_analysis' | 'ai_reports';
  premiumOnly?: boolean;
  fallback?: React.ReactNode;
  onUpgrade?: () => void; 
}

export function PremiumGate({ 
  children, 
  featureType, 
  premiumOnly = false, 
  fallback,
  onUpgrade
}: PremiumGateProps) {
  const router = useRouter();
  const { isPremium, loading: subscriptionLoading } = useSubscription();

  // onUpgrade fonksiyonu sağlanmadıysa, varsayılan olarak abonelik sayfasına yönlendir
  const handleUpgrade = onUpgrade ?? (() => router.push('/subscription'));

  const featureAccess = useFeatureAccess(featureType);

  // Yükleme durumu...
  if (subscriptionLoading || (featureType && featureAccess.loading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.light.tint} />
      </View>
    );
  }

  // Premium'a özel bir özellikse ve kullanıcı premium değilse...
  if (premiumOnly && !isPremium) {
    return fallback ?? (
      <PremiumUpgradePrompt 
        title="Premium Özellik"
        description="Bu özelliğin kilidini açmak ve tüm ayrıcalıklardan yararlanmak için Premium'a geçin."
        onUpgrade={handleUpgrade}
      />
    );
  }

  // Belirli bir özellik için kullanım hakkı kontrolü
  if (featureType && !featureAccess.can_use) {
    return fallback ?? (
      <UsageLimitPrompt 
        featureType={featureType}
        usageData={featureAccess}
        onUpgrade={handleUpgrade}
      />
    );
  }

  // Erişim varsa içeriği göster
  return <>{children}</>;
}

// =================================================================
// ALT BİLEŞENLER (Daha Şık ve Uyumlu Tasarım)
// =================================================================

interface PremiumUpgradePromptProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

function PremiumUpgradePrompt({ title, description, onUpgrade }: PremiumUpgradePromptProps) {
  return (
    <View style={styles.promptPageContainer}>
      <LinearGradient
        colors={['#5B21B6', '#312E81']}
        style={styles.premiumPromptCard}
      >
        <View style={styles.premiumIconContainer}>
            <Ionicons name="diamond" size={40} color={'#fff'} />
        </View>
        <Text style={styles.premiumTitle}>{title}</Text>
        <Text style={styles.premiumDescription}>{description}</Text>
        
        <TouchableOpacity onPress={onUpgrade} style={styles.upgradeButtonWrapper}>
          <LinearGradient
            colors={['#A78BFA', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.upgradeButton}
          >
            <Ionicons name="sparkles-outline" size={22} color="white" />
            <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

interface UsageLimitPromptProps {
  featureType: keyof UsageStats;
  usageData: {
    can_use: boolean;
    used_count: number;
    limit_count: number;
  };
  onUpgrade: () => void;
}

function UsageLimitPrompt({ featureType, usageData, onUpgrade }: UsageLimitPromptProps) {
  const featureNames: Record<keyof UsageStats, string> = {
    text_sessions: 'Metin Seansı',
    voice_sessions: 'Ses Seansı',
    dream_analysis: 'Rüya Analizi',
    ai_reports: 'AI Raporu',
    daily_write: 'Günlük Yazma',
    diary_write: 'Günlük Keşfi',
    pdf_export: 'PDF Export'
  };

  const percentage = getUsagePercentage(usageData.used_count, usageData.limit_count);
  const usageColor = getUsageColor(percentage);

  return (
    <View style={styles.promptPageContainer}>
      <View style={styles.usagePromptCard}>
        <View style={styles.usageIconContainer}>
            <Ionicons name="bar-chart-outline" size={32} color={Colors.light.tint} />
        </View>
        
        <Text style={styles.usageTitle}>{featureNames[featureType]} Limiti Doldu</Text>
        <Text style={styles.usageDescription}>
          Bu özellik için aylık ücretsiz kullanım hakkınız bitti. Sınırsız erişim için planınızı yükseltin.
        </Text>
        
        <View style={styles.usageStats}>
          <View style={styles.usageBar}>
            <View 
              style={[
                styles.usageProgress, 
                { width: `${percentage}%`, backgroundColor: usageColor }
              ]} 
            />
          </View>
           <Text style={styles.usageText}>
            Kullanım: {formatUsageText(usageData.used_count, usageData.limit_count)}
          </Text>
        </View>
        
        <TouchableOpacity onPress={onUpgrade} style={styles.upgradeButtonWrapper}>
            <LinearGradient
                colors={['#A78BFA', '#7C3AED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.upgradeButton}
            >
                <Text style={styles.upgradeButtonText}>Planları İncele</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Usage Widget - Kullanım durumunu göstermek için
interface UsageWidgetProps {
  featureType: 'text_sessions' | 'voice_sessions' | 'dream_analysis' | 'ai_reports';
  compact?: boolean;
}

export function UsageWidget({ featureType, compact = false }: UsageWidgetProps) {
  const featureAccess = useFeatureAccess(featureType);
  const { isPremium } = useSubscription();

  if (featureAccess.loading) {
    return (
      <View style={[styles.usageWidget, compact && styles.usageWidgetCompact]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (isPremium) {
    return (
      <View style={[styles.usageWidget, styles.usageWidgetPremium, compact && styles.usageWidgetCompact]}>
        <Ionicons name="diamond" size={compact ? 12 : 16} color="#7C3AED" />
        <Text style={[styles.usageWidgetText, styles.usageWidgetPremiumText]}>
          {compact ? '∞' : 'Sınırsız'}
        </Text>
      </View>
    );
  }

  const percentage = getUsagePercentage(featureAccess.used_count, featureAccess.limit_count);
  const usageColor = getUsageColor(percentage);

  return (
    <View style={[styles.usageWidget, compact && styles.usageWidgetCompact]}>
      <View style={[styles.usageIndicator, { backgroundColor: usageColor }]} />
      <Text style={[styles.usageWidgetText, { color: usageColor }]}>
        {formatUsageText(featureAccess.used_count, featureAccess.limit_count)}
      </Text>
    </View>
  );
}

// Premium Badge - Premium özellikler için rozet
interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export function PremiumBadge({ size = 'medium' }: PremiumBadgeProps) {
  const sizes = {
    small: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, iconSize: 10 },
    medium: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, iconSize: 12 },
    large: { fontSize: 14, paddingHorizontal: 10, paddingVertical: 6, iconSize: 14 }
  };

  const currentSize = sizes[size];

  return (
    <LinearGradient
        colors={['#A78BFA', '#7C3AED']}
        style={[styles.premiumBadge, { paddingHorizontal: currentSize.paddingHorizontal, paddingVertical: currentSize.paddingVertical, gap: 4 }]}
    >
      <Ionicons name="diamond" size={currentSize.iconSize} color="white" />
      <Text style={[styles.premiumBadgeText, { fontSize: currentSize.fontSize }]}>
        Premium
      </Text>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptPageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    zIndex: 1000, // Diğer tüm öğelerin üzerinde olmasını sağlar
  },
  premiumPromptCard: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#2e1065',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  premiumDescription: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  usagePromptCard: {
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 10,
  },
  usageIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  usageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  usageDescription: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  upgradeButtonWrapper: {
    width: '100%',
    paddingHorizontal: 16,
  },
  upgradeButton: {
    borderRadius: 50,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  usageStats: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  usageText: {
    fontSize: 14,
    color: Colors.light.text,
    marginTop: 10,
    textAlign: 'center'
  },
  usageBar: {
    height: 10,
    width: '90%',
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 5,
  },
  usageWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  usageWidgetCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usageWidgetPremium: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  usageWidgetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  usageWidgetPremiumText: {
    color: '#7C3AED',
  },
  usageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: 'white',
    fontWeight: '600',
  },
}); 