// components/PremiumGate.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { formatUsageText, getUsageColor, getUsagePercentage, useFeatureAccess, useSubscription } from '../hooks/useSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  featureType?: 'text' | 'voice' | 'video' | 'dream' | 'ai_report';
  premiumOnly?: boolean;
  fallback?: React.ReactNode;
  onUpgrade: () => void; // Zorunlu hale getirdim
}

export function PremiumGate({ 
  children, 
  featureType, 
  premiumOnly = false, 
  fallback,
  onUpgrade
}: PremiumGateProps) {
  const { isPremium, planName, loading: subscriptionLoading } = useSubscription();
  const featureAccess = useFeatureAccess(featureType!);

  // Premium only özellik kontrolü
  if (premiumOnly && !isPremium) {
    return (
      <PremiumUpgradePrompt 
        title="Premium Özellik"
        description="Bu özellik sadece Premium üyelerde kullanılabilir"
        onUpgrade={onUpgrade}
      />
    );
  }

  // Özellik tipi belirtildiyse kullanım kontrolü yap
  if (featureType && !featureAccess.loading) {
    if (!featureAccess.can_use) {
      return (
        <UsageLimitPrompt 
          featureType={featureType}
          usageData={featureAccess}
          onUpgrade={onUpgrade}
        />
      );
    }
  }

  // Yükleme durumu
  if (subscriptionLoading || (featureType && featureAccess.loading)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Erişim varsa içeriği göster
  return <>{children}</>;
}

interface PremiumUpgradePromptProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

function PremiumUpgradePrompt({ title, description, onUpgrade }: PremiumUpgradePromptProps) {
  return (
    <View style={styles.upgradeContainer}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.upgradeCard}
      >
        <View style={styles.upgradeHeader}>
          <Ionicons name="diamond" size={32} color="white" />
          <Text style={styles.upgradeTitle}>{title}</Text>
        </View>
        
        <Text style={styles.upgradeDescription}>{description}</Text>
        
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
          <Ionicons name="arrow-forward" size={20} color="#6366F1" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

interface UsageLimitPromptProps {
  featureType: 'text' | 'voice' | 'video' | 'dream' | 'ai_report';
  usageData: {
    can_use: boolean;
    used_count: number;
    limit_count: number;
  };
  onUpgrade: () => void;
}

function UsageLimitPrompt({ featureType, usageData, onUpgrade }: UsageLimitPromptProps) {
  const featureNames = {
    text: 'Metin Seansı',
    voice: 'Ses Seansı',
    video: 'Video Seansı',
    dream: 'Rüya Analizi',
    ai_report: 'AI Raporu'
  };

  const featureDescriptions = {
    text: 'Günlük metin seansı limitiniz doldu',
    voice: 'Ses seansı özelliği premium üyelerde kullanılabilir',
    video: 'Video seansı özelliği premium üyelerde kullanılabilir',
    dream: 'Aylık rüya analizi limitiniz doldu',
    ai_report: 'Haftalık AI raporu limitiniz doldu'
  };

  const percentage = getUsagePercentage(usageData.used_count, usageData.limit_count);
  const usageColor = getUsageColor(percentage);

  return (
    <View style={styles.limitContainer}>
      <View style={styles.limitCard}>
        <View style={styles.limitHeader}>
          <Ionicons name="bar-chart" size={24} color={usageColor} />
          <Text style={styles.limitTitle}>{featureNames[featureType]} Limiti</Text>
        </View>
        
        <Text style={styles.limitDescription}>
          {featureDescriptions[featureType]}
        </Text>
        
        <View style={styles.usageStats}>
          <Text style={styles.usageText}>
            Kullanım: {formatUsageText(usageData.used_count, usageData.limit_count)}
          </Text>
          <View style={styles.usageBar}>
            <View 
              style={[
                styles.usageProgress, 
                { width: `${percentage}%`, backgroundColor: usageColor }
              ]} 
            />
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Sınırsız Erişim İçin Premium'a Geç</Text>
          <Ionicons name="arrow-forward" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Usage Widget - Kullanım durumunu göstermek için
interface UsageWidgetProps {
  featureType: 'text' | 'voice' | 'video' | 'dream' | 'ai_report';
  compact?: boolean;
}

export function UsageWidget({ featureType, compact = false }: UsageWidgetProps) {
  const featureAccess = useFeatureAccess(featureType);
  const { isPremium } = useSubscription();

  if (featureAccess.loading) {
    return (
      <View style={[styles.usageWidget, compact && styles.usageWidgetCompact]}>
        <Text style={styles.usageWidgetText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (isPremium) {
    return (
      <View style={[styles.usageWidget, styles.usageWidgetPremium, compact && styles.usageWidgetCompact]}>
        <Ionicons name="diamond" size={compact ? 12 : 16} color="#6366F1" />
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
    <View style={[styles.premiumBadge, { paddingHorizontal: currentSize.paddingHorizontal, paddingVertical: currentSize.paddingVertical }]}>
      <Ionicons name="diamond" size={currentSize.iconSize} color="white" />
      <Text style={[styles.premiumBadgeText, { fontSize: currentSize.fontSize }]}>
        Premium
      </Text>
    </View>
  );
}

// High Order Component - Wrapper için
export function withPremiumGate<T extends {}>(
  Component: React.ComponentType<T>,
  gateProps: Omit<PremiumGateProps, 'children'>
) {
  return function PremiumGatedComponent(props: T) {
    return (
      <PremiumGate {...gateProps}>
        <Component {...props} />
      </PremiumGate>
    );
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  upgradeContainer: {
    padding: 20,
  },
  upgradeCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  upgradeDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  limitContainer: {
    padding: 20,
  },
  limitCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  limitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  limitDescription: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
    marginBottom: 16,
  },
  usageStats: {
    marginBottom: 20,
  },
  usageText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 8,
  },
  usageBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 3,
  },
  usageWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  usageWidgetCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usageWidgetPremium: {
    backgroundColor: '#EEF2FF',
  },
  usageWidgetText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.text,
  },
  usageWidgetPremiumText: {
    color: '#6366F1',
  },
  usageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    color: 'white',
    fontWeight: '600',
  },
}); 