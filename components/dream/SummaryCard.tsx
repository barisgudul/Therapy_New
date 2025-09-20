// components/dream/SummaryCard.tsx

import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

// Bu component'in dışarıdan hangi veriyi alacağını tanımla
interface SummaryCardProps {
  summary?: string; // Soru işareti, bu prop'un undefined olabileceğini belirtir
}

export default function SummaryCard({ summary }: SummaryCardProps) {
  const { t } = useTranslation();
  // Eğer özet yoksa, bu kartı hiç gösterme (veya bir "veri yok" mesajı göster)
  if (!summary) {
    return null; 
  }

  // Kestiğin JSX'i buraya yapıştırdık ve {analysis?.summary} yerine {summary} kullandık
  return (
    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
      <View style={styles.cardHeader}>
        <Ionicons name="sparkles-outline" size={24} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>{t('dream.components.summary.title')}</Text>
      </View>
      <Text style={styles.cardText}>{summary}</Text>
    </MotiView>
  );
}

// Bu component'in ihtiyaç duyduğu stilleri tanımla
const styles = StyleSheet.create({
  card: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  cardText: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
});
