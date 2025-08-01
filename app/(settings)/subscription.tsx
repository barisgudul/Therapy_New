// app/(settings)/subscription.tsx
import FeatureComparisonTable from '@/components/subscription/FeatureComparisonTable'; // YENİ COMPONENT'İ IMPORT ET
import PlanCard from '@/components/subscription/PlanCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useMemo, useState } from 'react'; // useMemo'yu import ettiğinden emin ol
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/Auth';
import { useSubscription, useSubscriptionPlans } from '../../hooks/useSubscription';
import * as API from '../../services/api.service';
import { SubscriptionPlan } from '../../services/subscription.service';

// TÜM SABİT VERİLER ARTIK COMPONENT DIŞINDA VE TEK BİR YERDE.
const planThemes = {
    Premium: { gradient: ['#F4E6FF', '#EBF0FF'], textColor: '#5B21B6', borderColor: 'rgba(124, 58, 237, 0.3)', shadowColor: 'rgba(124, 58, 237, 0.4)', icon: 'diamond-outline' as const, },
    '+Plus': { gradient: ['#EFF6FF', '#E0F2FE'], textColor: '#075985', borderColor: 'rgba(14, 165, 233, 0.3)', shadowColor: 'rgba(14, 165, 233, 0.4)', icon: 'star-outline' as const, },
    Free: { gradient: ['#F8FAFC', '#F1F5F9'], textColor: '#475569', borderColor: 'rgba(203, 213, 225, 0.6)', shadowColor: '#94A3B8', icon: 'person-outline' as const, },
};

const comparisonData = [
    { feature: 'Metin Seansları', plus: 'Sınırsız', premium: 'Sınırsız', icon: 'chatbubble-ellipses-outline' as const },
    { feature: 'Sesli Seanslar', plus: '❌', premium: 'Sınırsız', icon: 'mic-outline' as const },
    { feature: 'Rüya Analizi', plus: '1/hafta', premium: 'Sınırsız', icon: 'moon-outline' as const },
    { feature: 'AI Raporları', plus: '1/hafta', premium: 'Sınırsız', icon: 'analytics-outline' as const },
    { feature: 'Terapist Seçimi', plus: '1 Terapist', premium: 'Tüm Terapistler', icon: 'people-outline' as const },
    { feature: 'Seans Geçmişi', plus: '90 gün', premium: 'Sınırsız', icon: 'time-outline' as const },
    { feature: 'PDF Export', plus: 'Sınırsız', premium: 'Sınırsız', icon: 'download-outline' as const },
    { feature: 'Öncelikli Destek', plus: '❌', premium: 'Evet', icon: 'headset-outline' as const }
];

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { planName, refresh: refreshSubscription } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user || isUpgrading) return;
    setIsUpgrading(plan.id);
    try {
      await API.upgradeUserPlanForTesting(user.id, plan.name);
      Alert.alert('Yükseltme Başarılı!', `Tebrikler, ${plan.name} planının tüm ayrıcalıklarına eriştiniz.`, [{ text: 'Harika!', onPress: async () => { await refreshSubscription(); router.replace('/profile'); }}]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Plan değiştirilirken bir sorun oluştu.');
    } finally {
      setIsUpgrading(null);
    }
  };
  
  // DÜZELTİLDİ: Orijinal diziyi bozmuyor ve her render'da yeniden hesaplanmıyor.
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => b.price - a.price);
  }, [plans]);

  if (plansLoading) {
    return ( <LinearGradient colors={['#fdf2f8', '#eef2ff']} style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.light.tint} /></LinearGradient> );
  }

  return (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="close" size={28} color={Colors.light.tint} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Potansiyelini Ortaya Çıkar</Text>
          <Text style={styles.headerSubtitle}>Sınırsız erişim ile zihinsel sağlık yolculuğunda yeni bir sayfa aç.</Text>
        </View>
        
        <View style={styles.plansContainer}>
          {sortedPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              theme={planThemes[plan.name as keyof typeof planThemes] || planThemes.Free}
              isCurrent={planName === plan.name}
              isLoading={isUpgrading === plan.id}
              onUpgrade={() => handleUpgrade(plan)}
            />
          ))}
        </View>
        
        {/* ARTIK TEMİZ BİR COMPONENT ÇAĞRISI. İÇİNDE NE OLDUĞU BU SAYFANIN UMURUNDA DEĞİL. */}
        <FeatureComparisonTable 
            comparisonData={comparisonData}
            themeColors={{
                plusColor: planThemes['+Plus'].textColor,
                premiumColor: planThemes.Premium.textColor,
            }}
        />
      </ScrollView>
    </LinearGradient>
  );
}
// STİL DOSYASI ARTIK DAHA KÜÇÜK VE SADECE BU SAYFAYA AİT STİLLERİ BARINDIRIYOR.
const styles = StyleSheet.create({ container: { flex: 1, }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', }, backButton: { position: 'absolute', top: 60, right: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 30, padding: 8, }, header: { paddingHorizontal: 28, paddingTop: 100, paddingBottom: 32, alignItems: 'center' }, headerTitle: { fontSize: 32, fontWeight: '800', color: '#1f2937', marginBottom: 12, textAlign: 'center', }, headerSubtitle: { fontSize: 18, color: '#4b5563', textAlign: 'center', lineHeight: 26, maxWidth: '90%', }, plansContainer: { paddingHorizontal: 20, gap: 24, marginBottom: 50, }, });