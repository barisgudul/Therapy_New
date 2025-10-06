// components/subscription/FeatureComparisonTable.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Gerekli tipler burada tanımlı. Dışarıdan ne alacağını biliyor.
type ComparisonDataItem = { feature: string; plus: string; premium: string; icon: keyof typeof Ionicons.glyphMap; };
type ThemeColors = { plusColor: string; premiumColor: string; };

type FeatureComparisonTableProps = {
  comparisonData: ComparisonDataItem[];
  themeColors: ThemeColors;
};

export default function FeatureComparisonTable({ comparisonData, themeColors }: FeatureComparisonTableProps) {
  
  const renderValue = (value: string, plan: 'plus' | 'premium') => {
    const { plusColor, premiumColor } = themeColors;
    const color = plan === 'premium' ? premiumColor : plusColor;
    
    if (value === 'Sınırsız' || value === 'Evet' || value === 'Tüm Terapistler') {
      return <Ionicons name="checkmark" size={28} color={color} style={{ fontWeight: 'bold', opacity: plan === 'premium' ? 1 : 0.7 }} testID="ionicons-checkmark" />;
    }
    if (value === '❌') {
      return <Ionicons name="close-outline" size={28} color="#94A3B8" />;
    }
    return <Text style={[styles.comparisonValueText, { color, opacity: plan === 'premium' ? 1 : 0.8 }]}>{value}</Text>;
  };

  return (
    <View style={styles.comparisonSection}>
      <Text style={styles.sectionTitle}>Ayrıcalıklar Dünyası</Text>
      <View style={styles.comparisonTable}>
        <View style={styles.comparisonHeaderRow}>
          <Text style={[styles.comparisonHeaderText, { flex: 2.5 }]} />
          <Text style={[styles.comparisonHeaderText, { flex: 1, color: themeColors.plusColor }]}>+Plus</Text>
          <Text style={[styles.comparisonHeaderText, { flex: 1, color: themeColors.premiumColor }]}>Premium</Text>
        </View>
        {comparisonData.map((item, index) => (
          <View key={index} style={[styles.comparisonRow, index === comparisonData.length - 1 && styles.comparisonRowLast]}>
            <View style={styles.comparisonFeatureCell}>
              <Ionicons name={item.icon} size={24} color="#64748B" style={{ opacity: 0.6 }} />
              <Text style={styles.comparisonFeatureText}>{item.feature}</Text>
            </View>
            <View style={styles.comparisonValueCell}>{renderValue(item.plus, 'plus')}</View>
            <View style={styles.comparisonValueCell}>{renderValue(item.premium, 'premium')}</View>
          </View>
        ))}
      </View>
    </View>
  );
}
// Bu stiller sadece bu componente ait
const styles = StyleSheet.create({ sectionTitle: { fontSize: 26, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 20, }, comparisonSection: { paddingHorizontal: 20, marginBottom: 40, }, comparisonTable: { borderRadius: 24, backgroundColor: 'white', padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }, comparisonHeaderRow: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, comparisonHeaderText: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', }, comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', }, comparisonRowLast: { borderBottomWidth: 0, }, comparisonFeatureCell: { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 16, }, comparisonFeatureText: { fontSize: 16, fontWeight: '500', color: '#374151', }, comparisonValueCell: { flex: 1, alignItems: 'center', justifyContent: 'center', }, comparisonValueText: { fontSize: 15, fontWeight: '600', } });