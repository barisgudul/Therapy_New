// app/subscription.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { useSubscription, useSubscriptionPlans } from '../hooks/useSubscription';
import * as API from '../services/api.service';
import { SubscriptionPlan } from '../services/subscription.service';



export default function SubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { planName, refresh: refreshSubscription } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();

  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  // how_it_works.tsx'ten ilham alan yeni renk ve stil paleti
  const planThemes = {
    Premium: {
      gradient: ['#F4E6FF', '#EBF0FF'], // İsteğiniz üzerine therapy_options.tsx'ten gelen pembe-mavi geçişi
      textColor: '#5B21B6', 
      borderColor: 'rgba(124, 58, 237, 0.3)',
      shadowColor: 'rgba(124, 58, 237, 0.4)',
      icon: 'diamond-outline' as const,
    },
    '+Plus': {
      gradient: ['#EFF6FF', '#E0F2FE'], // Profile.tsx'ten ilham alan sofistike mavi
      textColor: '#075985',
      borderColor: 'rgba(14, 165, 233, 0.3)',
      shadowColor: 'rgba(14, 165, 233, 0.4)',
      icon: 'star-outline' as const,
    },
    Free: {
      gradient: ['#F8FAFC', '#F1F5F9'],
      textColor: '#475569',
      borderColor: 'rgba(203, 213, 225, 0.6)',
      shadowColor: '#94A3B8',
      icon: 'person-outline' as const,
    },
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user || isUpgrading) return;

    setIsUpgrading(plan.id);
    try {
      await API.upgradeUserPlanForTesting(user.id, plan.name);
      Alert.alert(
        'Yükseltme Başarılı!',
        `Tebrikler, ${plan.name} planının tüm ayrıcalıklarına eriştiniz.`,
        [{ text: 'Harika!', onPress: async () => {
            await refreshSubscription();
            router.replace('/profile');
        }}],
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Plan değiştirilirken bir sorun oluştu.');
    } finally {
      setIsUpgrading(null);
    }
  };
  
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const theme = planThemes[plan.name as keyof typeof planThemes] || planThemes.Free;
    const isCurrentPlan = planName === plan.name;
    const isPremium = plan.name === 'Premium';
    const isLoading = isUpgrading === plan.id;
    
    const UpgradeButton = () => (
      <TouchableOpacity onPress={() => handleUpgrade(plan)} disabled={!!isUpgrading} style={{marginTop: 'auto'}}>
        <LinearGradient
            colors={['#F8FAFF', '#FFFFFF']}
            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
            style={[styles.upgradeButton, {borderColor: theme.borderColor}]}
        >
            {isLoading ? (
                <ActivityIndicator color={theme.textColor} />
            ) : (
                <>
                    <Text style={[styles.upgradeButtonText, {color: theme.textColor}]}>{isPremium ? "Premium'a Yükselt" : 'Planı Seç'}</Text>
                    <Ionicons name="arrow-forward-circle" size={24} color={theme.textColor} />
                </>
            )}
        </LinearGradient>
      </TouchableOpacity>
    );

    return (
      <View key={plan.id} style={[styles.planCardWrapper, { shadowColor: theme.shadowColor }]}>
        <LinearGradient
          colors={theme.gradient as [string, string]}
          style={[styles.planCard, { borderColor: theme.borderColor }]}
        >
            <View style={styles.planHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name={theme.icon} size={32} color={theme.textColor} />
                </View>
                <View style={styles.planTitleContainer}>
                    <Text style={[styles.planName, { color: theme.textColor }]}>{plan.name}</Text>
                    {isPremium && (
                        <View style={styles.planBadge}>
                            <Text style={styles.planBadgeText}>Tavsiye Edilen</Text>
                        </View>
                    )}
                </View>
            </View>

          <Text style={[styles.planDescription, {color: theme.textColor, opacity: 0.7}]}>
            {plan.description || "Temel özelliklere erişim."}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={[styles.planPrice, { color: theme.textColor }]}>
              {plan.price === 0 ? 'Ücretsiz' : `$${plan.price}`}
            </Text>
            {plan.price > 0 && <Text style={[styles.planDuration, { color: theme.textColor, opacity: 0.6 }]}>/ aylık</Text>}
          </View>

          {isCurrentPlan ? (
            <View style={styles.currentPlanButton}>
              <Ionicons name="checkmark-circle" size={22} color="#334155" />
              <Text style={styles.currentPlanButtonText}>Mevcut Planınız</Text>
            </View>
          ) : (
            <UpgradeButton />
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderFeatureComparison = () => {
    const comparisonData = [
        { feature: 'Metin Seansları', plus: 'Sınırsız', premium: 'Sınırsız', icon: 'chatbubble-ellipses-outline' },
        { feature: 'Sesli Seanslar', plus: '❌', premium: 'Sınırsız', icon: 'mic-outline' },
        { feature: 'Rüya Analizi', plus: '1/gün', premium: 'Sınırsız', icon: 'moon-outline' },
        { feature: 'AI Raporları', plus: '1/gün', premium: 'Sınırsız', icon: 'analytics-outline' },
        { feature: 'Terapist Seçimi', plus: '1 Terapist', premium: 'Tüm Terapistler', icon: 'people-outline' },
        { feature: 'Seans Geçmişi', plus: '90 gün', premium: 'Sınırsız', icon: 'time-outline' },
        { feature: 'PDF Export', plus: '❌', premium: 'Sınırsız', icon: 'download-outline' },
        { feature: 'Öncelikli Destek', plus: '❌', premium: 'Evet', icon: 'headset-outline' }
    ];

    const renderValue = (value: string, plan: 'plus' | 'premium') => {
        const premiumColor = planThemes.Premium.textColor;
        const plusColor = planThemes['+Plus'].textColor;
        
        if (value === 'Sınırsız' || value === 'Evet' || value === 'Tüm Terapistler') {
            return <Ionicons name="checkmark" size={28} color={plan === 'premium' ? premiumColor : plusColor} style={{fontWeight: 'bold', opacity: plan === 'premium' ? 1 : 0.7}} />;
        }
        if (value === '❌') {
            return <Ionicons name="close-outline" size={28} color="#94A3B8" />;
        }
        return <Text style={[styles.comparisonValueText, {color: plan === 'plus' ? plusColor : premiumColor, opacity: plan === 'premium' ? 1 : 0.8}]}>{value}</Text>;
    };

    return (
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>Ayrıcalıklar Dünyası</Text>
        <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeaderRow}>
                <Text style={[styles.comparisonHeaderText, {flex: 2.5}]}></Text>
                <Text style={[styles.comparisonHeaderText, {flex: 1, color: planThemes['+Plus'].textColor }]}>+Plus</Text>
                <Text style={[styles.comparisonHeaderText, {flex: 1, color: planThemes.Premium.textColor }]}>Premium</Text>
            </View>
            {comparisonData.map((item, index) => (
                <View key={index} style={[styles.comparisonRow, index === comparisonData.length -1 && styles.comparisonRowLast]}>
                    <View style={styles.comparisonFeatureCell}>
                        <Ionicons name={item.icon as any} size={24} color={Colors.light.tint} style={{opacity: 0.6}} />
                        <Text style={styles.comparisonFeatureText}>{item.feature}</Text>
                    </View>
                    <View style={styles.comparisonValueCell}>{renderValue(item.plus, 'plus')}</View>
                    <View style={styles.comparisonValueCell}>{renderValue(item.premium, 'premium')}</View>
                </View>
            ))}
        </View>
      </View>
    );
  };

  if (plansLoading) {
    return (
      <LinearGradient colors={['#fdf2f8', '#eef2ff']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </LinearGradient>
    );
  }

  const sortedPlans = plans.sort((a,b) => b.price - a.price); 

  return (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={Colors.light.tint} />
        </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Potansiyelini Ortaya Çıkar</Text>
          <Text style={styles.headerSubtitle}>Sınırsız erişim ile zihinsel sağlık yolculuğunda yeni bir sayfa aç.</Text>
        </View>
        
        <View style={styles.plansContainer}>
            {sortedPlans.map(plan => renderPlanCard(plan))}
        </View>
        
        {renderFeatureComparison()}

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
  backButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 30,
    padding: 8,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 32,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: '90%',
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 24,
    marginBottom: 50,
  },
  planCardWrapper: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  planCard: {
    borderRadius: 32,
    padding: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 28,
    fontWeight: '700',
  },
  planBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  planBadgeText: {
    color: '#5B21B6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planDescription: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
    minHeight: 46,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  planPrice: {
    fontSize: 48,
    fontWeight: '800',
  },
  planDuration: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    paddingBottom: 6,
  },
  upgradeButton: {
    borderRadius: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentPlanButton: {
    borderRadius: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: 'auto',
  },
  currentPlanButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  comparisonTable: {
      borderRadius: 24,
      backgroundColor: 'white',
      padding: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E5E7EB'
  },
  comparisonHeaderRow: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6'
  },
  comparisonHeaderText: {
      textAlign: 'center',
      fontSize: 16,
      fontWeight: 'bold',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonRowLast: {
      borderBottomWidth: 0,
  },
  comparisonFeatureCell: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  comparisonFeatureText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  comparisonValueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonValueText: {
    fontSize: 15,
    fontWeight: '600',
  }
}); 