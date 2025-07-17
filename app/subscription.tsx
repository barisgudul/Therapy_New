// app/subscription.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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
import * as API from '../services/api.service';
import { SubscriptionPlan } from '../services/subscription.service';

const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { isPremium, planName, refresh: refreshSubscription } = useSubscription();
  const { plans, loading: plansLoading, refresh: refreshPlans } = useSubscriptionPlans();
  const { diary_write, daily_write, dream_analysis, ai_reports, loading: usageLoading, refresh: refreshUsage } = useUsageStats();
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) {
        Alert.alert('Hata', 'Kullanıcı bulunamadı.');
        return;
    }
    
    setIsUpgrading(true);
    try {
      // Bu bir test fonksiyonudur. Gerçek uygulamada RevenueCat gibi bir servis kullanılır.
      await API.upgradeUserPlanForTesting(user.id, plan.name);
      
      Alert.alert(
        'Başarılı!',
        `Tebrikler, ${plan.name} planına başarıyla geçiş yaptınız.`,
        [
          { 
            text: 'Harika!', 
            onPress: async () => {
              // Arayüzün güncel bilgileri yansıtması için state'leri yenile
              await Promise.all([
                  refreshSubscription(),
                  refreshUsage(),
              ]);
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Yükseltme Hatası', error.message || 'Plan değiştirilirken bir sorun oluştu.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const renderFeatureComparison = () => {
    // Bu veriyi dinamik olarak planlardan oluşturmak daha iyi olabilir,
    // ancak şimdilik manuel olarak bırakıyorum.
    const comparisonData = [
      {
        feature: 'Günlük Metin Seansları',
        free: '❌',
        plus: '✅',
        premium: 'Sınırsız',
        icon: 'chatbubble-outline'
      },
      {
        feature: 'Ses & Video Seansları',
        free: '❌',
        plus: '❌',
        premium: 'Sınırsız',
        icon: 'mic-outline'
      },
      {
        feature: 'Rüya Analizi',
        free: '1 adet/hafta',
        plus: '1 adet/gün',
        premium: 'Sınırsız',
        icon: 'moon-outline'
      },
      {
        feature: 'AI Raporları',
        free: '❌',
        plus: '1 adet/gün',
        premium: 'Sınırsız',
        icon: 'analytics-outline'
      },
      {
        feature: 'Terapist Seçimi',
        free: 'Limitli',
        plus: '1 Terapist',
        premium: 'Tüm Terapistler',
        icon: 'people-outline'
      },
      {
        feature: 'Seans Geçmişi',
        free: '7 gün',
        plus: '90 gün',
        premium: 'Sınırsız',
        icon: 'time-outline'
      },
      {
        feature: 'PDF Export',
        free: '❌',
        plus: '❌',
        premium: '✅',
        icon: 'download-outline'
      },
      {
        feature: 'Öncelikli Destek',
        free: '❌',
        plus: '❌',
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
            <Text style={styles.tableHeaderText}>+Plus</Text>
            <Text style={styles.tableHeaderText}>Premium</Text>
          </View>
          {comparisonData.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <View style={styles.featureCell}>
                <Ionicons name={item.icon as any} size={16} color={Colors.light.tint} />
                <Text style={styles.featureText}>{item.feature}</Text>
              </View>
              <Text style={styles.freeText}>{item.free}</Text>
              <Text style={styles.plusText}>{item.plus}</Text>
              <Text style={styles.premiumCellText}>{item.premium}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUsageStats = () => {
    const usageData = [
      { label: 'Günlük Yazma', current: daily_write, icon: 'create-outline' },
      { label: 'Rüya Analizi', current: dream_analysis, icon: 'moon-outline' },
      { label: 'AI Raporları', current: ai_reports, icon: 'analytics-outline' },
      { label: 'Günlük Keşfi', current: diary_write, icon: 'book-outline' }
    ];

    if (usageLoading) {
        return (
             <View style={styles.usageContainer}>
                <ActivityIndicator/>
             </View>
        )
    }

    return (
      <View style={styles.usageContainer}>
        <Text style={styles.usageTitle}>Kalan Kullanım Hakları</Text>
        {usageData.map((item, index) => {
            if (!item.current) return null; // Veri henüz yüklenmediyse gösterme
            const percentage = item.current.limit_count > 0 
                ? (item.current.used_count / item.current.limit_count) * 100
                : 0;

            return (
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
                          width: item.current.limit_count === -1 ? '100%' : `${percentage}%`,
                          backgroundColor: item.current.limit_count === -1 ? '#10B981' : 
                                         !item.current.can_use ? '#EF4444' : 
                                         percentage > 80 ? '#F59E0B' : '#10B981'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.usageProgressText}>
                    {item.current.limit_count === -1 ? 'Sınırsız' : `${item.current.limit_count - item.current.used_count} hak`}
                  </Text>
                </View>
              </View>
            )
        })}
      </View>
    );
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = planName === plan.name;
    const isSelected = selectedPlanId === plan.id;
    
    const planColors = {
        'Free': { border: '#D1D5DB', bg: 'white', name: '#6B7280', price: '#6B7280' },
        '+Plus': { border: '#3B82F6', bg: '#EFF6FF', name: '#1D4ED8', price: '#3B82F6' },
        'Premium': { border: '#8B5CF6', bg: '#F5F3FF', name: '#5B21B6', price: '#8B5CF6' },
    }
    const colors = planColors[plan.name as keyof typeof planColors] || planColors.Free;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          { borderColor: colors.border, backgroundColor: isSelected ? colors.bg : 'white' },
          isCurrentPlan && { backgroundColor: colors.bg, borderWidth: 2 },
        ]}
        onPress={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
        activeOpacity={0.8}
      >
        {plan.name !== 'Free' && (
          <View style={[styles.planBadge, {backgroundColor: colors.price}]}>
            <Ionicons name={plan.name === 'Premium' ? "diamond" : "star"} size={16} color="white" />
            <Text style={styles.planBadgeText}>{plan.name}</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={[styles.planName, {color: colors.name}]}>
            {plan.name}
          </Text>
          <View style={styles.planPriceContainer}>
            <Text style={[styles.planPrice, {color: colors.price}]}>
              {plan.price === 0 ? 'Ücretsiz' : `₺${plan.price}`}
            </Text>
            {plan.price > 0 && (
              <Text style={styles.planDuration}>
                / ay
              </Text>
            )}
          </View>
        </View>

        <View style={styles.planFeatures}>
          {/* Özellikleri dinamik olarak göstermek daha doğru olacaktır */}
          <Text style={styles.planFeatureText}>
              {plan.name === 'Free' && 'Temel özelliklere başlangıç için.'}
              {plan.name === '+Plus' && 'Sınırsız metin seansı ve günlük analizler.'}
              {plan.name === 'Premium' && 'Tüm özelliklere sınırsız erişim.'}
          </Text>
        </View>

        {isCurrentPlan ? (
          <View style={[styles.currentPlanButton, {backgroundColor: colors.border}]}>
            <Text style={styles.currentPlanButtonText}>Mevcut Planınız</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.upgradePlanButton,
              isSelected && styles.selectedUpgradeButton
            ]}
            onPress={() => handleUpgrade(plan)}
            disabled={isUpgrading || selectedPlanId !== plan.id}
          >
            <LinearGradient
              colors={ isSelected ? [colors.price, colors.border] : ['#D1D5DB', '#9CA3AF']}
              style={styles.upgradePlanButtonGradient}
            >
              <Text style={styles.upgradePlanButtonText}>
                {isUpgrading && selectedPlanId === plan.id ? 'Yükseltiliyor...' : `Planı Seç`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (plansLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Planlar Yükleniyor...</Text>
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
              color={isPremium ? '#8B5CF6' : '#6B7280'} 
            />
            <Text style={styles.currentStatusTitle}>
              Mevcut Plan: <Text style={{color: isPremium ? '#8B5CF6' : '#374151'}}>{planName}</Text>
            </Text>
          </View>
          {isPremium && (
            <View style={[styles.premiumBadge, {backgroundColor: '#8B5CF6'}]}>
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>

        {/* Usage Stats */}
        {renderUsageStats()}

        {/* Plans */}
        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Planını Yükselt</Text>
          {plans.sort((a,b) => a.price - b.price).map(plan => renderPlanCard(plan))}
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
      backgroundColor: '#F9FAFB'
  },
  featureCell: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: Colors.light.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  freeText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  plusText: {
    flex: 1,
    fontSize: 13,
    color: '#1D4ED8',
    textAlign: 'center',
    fontWeight: '600',
  },
  premiumCellText: {
    flex: 1,
    fontSize: 13,
    color: '#5B21B6',
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