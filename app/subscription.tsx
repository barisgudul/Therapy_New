// app/subscription.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { useSubscription, useSubscriptionPlans, useUsageStats } from '../hooks/useSubscription';

const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { isPremium, planName, features, loading: subscriptionLoading } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { textSessions, voiceSessions, videoSessions, dreamAnalysis, aiReports } = useUsageStats();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(true);
    try {
      // Burada payment integration olacak
      // Şimdilik sadece alert gösteriyorum
      Alert.alert(
        'Ödeme Sistemi',
        'Ödeme sistemi entegrasyonu yakında eklenecek. Şu an test amaçlı kullanabilirsiniz.',
        [
          { text: 'Tamam', style: 'cancel' },
          { 
            text: 'Test Premium Aktif Et', 
            onPress: () => {
              // Test amaçlı - gerçek uygulamada payment gateway olacak
              Alert.alert('Başarılı', 'Premium plan test amaçlı aktif edildi!');
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Hata', 'Yükseltme işlemi sırasında bir hata oluştu.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const renderFeatureComparison = () => {
    const comparisonData = [
      {
        feature: 'Günlük Metin Seansları',
        free: '3 adet',
        premium: 'Sınırsız',
        icon: 'chatbubble-outline'
      },
      {
        feature: 'Ses Seansları',
        free: '❌',
        premium: 'Sınırsız',
        icon: 'mic-outline'
      },
      {
        feature: 'Video Seansları',
        free: '❌',
        premium: 'Sınırsız',
        icon: 'videocam-outline'
      },
      {
        feature: 'Rüya Analizi',
        free: '2 adet/ay',
        premium: 'Sınırsız',
        icon: 'moon-outline'
      },
      {
        feature: 'AI Raporları',
        free: '1 adet/hafta',
        premium: 'Sınırsız',
        icon: 'analytics-outline'
      },
      {
        feature: 'Tüm Terapistler',
        free: '1 terapist',
        premium: 'Tüm terapistler',
        icon: 'people-outline'
      },
      {
        feature: 'PDF Export',
        free: '❌',
        premium: '✅',
        icon: 'download-outline'
      },
      {
        feature: 'Öncelikli Destek',
        free: '❌',
        premium: '✅',
        icon: 'headset-outline'
      }
    ];

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Özellik Karşılaştırması</Text>
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Özellik</Text>
            <Text style={styles.tableHeaderText}>Ücretsiz</Text>
            <Text style={styles.tableHeaderText}>Premium</Text>
          </View>
          {comparisonData.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.featureCell}>
                <Ionicons name={item.icon as any} size={16} color={Colors.light.tint} />
                <Text style={styles.featureText}>{item.feature}</Text>
              </View>
              <Text style={styles.freeText}>{item.free}</Text>
              <Text style={styles.premiumText}>{item.premium}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUsageStats = () => {
    const usageData = [
      { label: 'Metin Seansları', current: textSessions, icon: 'chatbubble-outline' },
      { label: 'Ses Seansları', current: voiceSessions, icon: 'mic-outline' },
      { label: 'Video Seansları', current: videoSessions, icon: 'videocam-outline' },
      { label: 'Rüya Analizi', current: dreamAnalysis, icon: 'moon-outline' },
      { label: 'AI Raporları', current: aiReports, icon: 'analytics-outline' }
    ];

    return (
      <View style={styles.usageContainer}>
        <Text style={styles.usageTitle}>Günlük Kullanım Durumu</Text>
        {usageData.map((item, index) => (
          <View key={index} style={styles.usageItem}>
            <View style={styles.usageItemHeader}>
              <Ionicons name={item.icon as any} size={20} color={Colors.light.tint} />
              <Text style={styles.usageItemLabel}>{item.label}</Text>
            </View>
            <View style={styles.usageProgressContainer}>
              <View style={styles.usageProgressBar}>
                <View 
                  style={[
                    styles.usageProgress,
                    { 
                      width: item.current.limit_count === -1 ? '100%' : 
                             `${Math.min((item.current.used_count / item.current.limit_count) * 100, 100)}%`,
                      backgroundColor: item.current.limit_count === -1 ? '#10B981' : 
                                     item.current.used_count >= item.current.limit_count ? '#EF4444' : 
                                     item.current.used_count / item.current.limit_count > 0.8 ? '#F59E0B' : '#10B981'
                    }
                  ]}
                />
              </View>
              <Text style={styles.usageProgressText}>
                {item.current.limit_count === -1 ? '∞' : `${item.current.used_count}/${item.current.limit_count}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPlanCard = (plan: any) => {
    const isCurrentPlan = planName === plan.name;
    const isSelected = selectedPlan === plan.id;
    const isFree = plan.name === 'Free';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isCurrentPlan && styles.currentPlanCard,
          isSelected && styles.selectedPlanCard,
          isFree && styles.freePlanCard
        ]}
        onPress={() => !isCurrentPlan && setSelectedPlan(plan.id)}
        activeOpacity={0.8}
      >
        {!isFree && (
          <View style={styles.planBadge}>
            <Ionicons name="diamond" size={16} color="white" />
            <Text style={styles.planBadgeText}>Premium</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={[styles.planName, isFree && styles.freePlanName]}>
            {plan.name}
          </Text>
          <View style={styles.planPriceContainer}>
            <Text style={[styles.planPrice, isFree && styles.freePlanPrice]}>
              {isFree ? 'Ücretsiz' : `₺${plan.price}`}
            </Text>
            {!isFree && (
              <Text style={styles.planDuration}>
                /{plan.duration_days === 30 ? 'ay' : 'gün'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.planFeatures}>
          <Text style={styles.planFeaturesTitle}>Özellikler:</Text>
          {Object.entries(plan.features).map(([key, value]) => {
            const featureLabels: { [key: string]: string } = {
              text_sessions_daily: 'Günlük metin seansları',
              voice_sessions_daily: 'Günlük ses seansları',
              video_sessions_daily: 'Günlük video seansları',
              dream_analysis_monthly: 'Aylık rüya analizi',
              ai_reports_weekly: 'Haftalık AI raporları',
              therapist_count: 'Terapist sayısı',
              session_history_days: 'Seans geçmişi',
              pdf_export: 'PDF export',
              priority_support: 'Öncelikli destek'
            };

            if (typeof value === 'boolean') {
              return (
                <View key={key} style={styles.planFeature}>
                  <Ionicons 
                    name={value ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={value ? '#10B981' : '#EF4444'} 
                  />
                  <Text style={styles.planFeatureText}>
                    {featureLabels[key] || key}
                  </Text>
                </View>
              );
            }

            return (
              <View key={key} style={styles.planFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.planFeatureText}>
                  {featureLabels[key] || key}: {value === -1 ? 'Sınırsız' : String(value)}
                </Text>
              </View>
            );
          })}
        </View>

        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanButtonText}>Mevcut Plan</Text>
          </View>
        ) : !isFree && (
          <TouchableOpacity
            style={[
              styles.upgradePlanButton,
              isSelected && styles.selectedUpgradeButton
            ]}
            onPress={() => handleUpgrade(plan.id)}
            disabled={isUpgrading}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.upgradePlanButtonGradient}
            >
              <Text style={styles.upgradePlanButtonText}>
                {isUpgrading ? 'Yükseltiliyor...' : 'Yükselt'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (subscriptionLoading || plansLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#1a1a1a', '#2d2d2d'] : ['#f8fafc', '#ffffff']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Planlar</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Plan Status */}
        <View style={styles.currentStatusContainer}>
          <View style={styles.currentStatusHeader}>
            <Ionicons 
              name={isPremium ? 'diamond' : 'person'} 
              size={24} 
              color={isPremium ? '#6366F1' : '#6B7280'} 
            />
            <Text style={styles.currentStatusTitle}>
              Mevcut Plan: {planName}
            </Text>
          </View>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium Aktif</Text>
            </View>
          )}
        </View>

        {/* Usage Stats */}
        {renderUsageStats()}

        {/* Plans */}
        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Planları Karşılaştır</Text>
          {plans.map(plan => renderPlanCard(plan))}
        </View>

        {/* Feature Comparison */}
        {renderFeatureComparison()}

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Premium Avantajları</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="infinite" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Sınırsız terapi seansları</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="mic" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Ses ve video seansları</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="analytics" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Gelişmiş AI analizleri</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="download" size={20} color="#10B981" />
              <Text style={styles.benefitText}>PDF rapor indirme</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="headset" size={20} color="#10B981" />
              <Text style={styles.benefitText}>Öncelikli destek</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  premiumBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  usageContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  usageItem: {
    marginBottom: 12,
  },
  usageItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageItemLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
  },
  usageProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 3,
  },
  usageProgressText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  plansContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  selectedPlanCard: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  freePlanCard: {
    borderColor: '#D1D5DB',
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  planBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  freePlanName: {
    color: '#6B7280',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  freePlanPrice: {
    color: '#6B7280',
  },
  planDuration: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planFeatureText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
  },
  currentPlanButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradePlanButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedUpgradeButton: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradePlanButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradePlanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  featureCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: Colors.light.text,
    marginLeft: 8,
  },
  freeText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  premiumText: {
    flex: 1,
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
  },
  benefitsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 12,
  },
}); 