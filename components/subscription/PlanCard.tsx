// components/subscription/PlanCard.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Önce, bu component'in dışarıdan neye ihtiyacı olduğunu tanımlıyoruz.
// Buna "Props arayüzü" denir. Bu, component'in kontratıdır.
type PlanCardProps = {
  plan: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
  };
  theme: {
    gradient: string[];
    textColor: string;
    borderColor: string;
    shadowColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  isCurrent: boolean;
  isLoading: boolean;
  onUpgrade: () => void; // Butona basıldığında ne olacağını söyleyen bir fonksiyon.
};

// Bu component artık kör değil. Hangi 'props'ları alacağını biliyor.
export default function PlanCard({ plan, theme, isCurrent, isLoading, onUpgrade }: PlanCardProps) {

  // UpgradeButton artık PlanCard'ın içinde yaşayan bir yardımcı.
  // Sadece 'onUpgrade' fonksiyonunu çağırmakla görevli.
  const UpgradeButton = () => (
    <TouchableOpacity onPress={onUpgrade} disabled={isLoading} style={{ marginTop: 'auto' }}>
      <LinearGradient
        colors={['#F8FAFF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.upgradeButton, { borderColor: theme.borderColor }]}
      >
        {isLoading ? (
          <ActivityIndicator testID="activity-indicator" color={theme.textColor} />
        ) : (
          <>
            <Text style={[styles.upgradeButtonText, { color: theme.textColor }]}>
              {plan.name === 'Premium' ? "Premium'a Yükselt" : 'Planı Seç'}
            </Text>
            <Ionicons name="arrow-forward-circle" size={24} color={theme.textColor} />
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.planCardWrapper, { shadowColor: theme.shadowColor }]}>
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
            {plan.name === 'Premium' && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Tavsiye Edilen</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.planDescription, { color: theme.textColor, opacity: 0.7 }]}>
          {plan.description || "Temel özelliklere erişim."}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={[styles.planPrice, { color: theme.textColor }]}>
            {plan.price === 0 ? 'Ücretsiz' : `$${plan.price}`}
          </Text>
          {plan.price > 0 && <Text style={[styles.planDuration, { color: theme.textColor, opacity: 0.6 }]}>/ aylık</Text>}
        </View>

        {isCurrent ? (
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
}

// BU STİLLER SADECE BU COMPONENT'E AİT.
const styles = StyleSheet.create({
    planCardWrapper: { shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 },
    planCard: { borderRadius: 32, padding: 28, borderWidth: 1.5, overflow: 'hidden' },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
    planTitleContainer: { flex: 1 },
    planName: { fontSize: 28, fontWeight: '700' },
    planBadge: { backgroundColor: 'rgba(124, 58, 237, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    planBadgeText: { color: '#5B21B6', fontSize: 12, fontWeight: 'bold' },
    planDescription: { fontSize: 16, lineHeight: 23, marginBottom: 24, minHeight: 46 },
    priceContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 28 },
    planPrice: { fontSize: 48, fontWeight: '800' },
    planDuration: { fontSize: 16, fontWeight: '600', marginLeft: 8, paddingBottom: 6 },
    upgradeButton: { borderRadius: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    upgradeButtonText: { fontSize: 18, fontWeight: 'bold' },
    currentPlanButton: { borderRadius: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.05)', marginTop: 'auto' },
    currentPlanButtonText: { color: '#334155', fontSize: 16, fontWeight: 'bold' },
});