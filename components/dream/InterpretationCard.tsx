// components/dream/InterpretationCard.tsx

import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';

// Bu component'in dışarıdan hangi veriyi alacağını tanımla
interface InterpretationCardProps {
  interpretation?: string; // Soru işareti, bu prop'un undefined olabileceğini belirtir
}

export default function InterpretationCard({ interpretation }: InterpretationCardProps) {
  // Eğer yorum yoksa, bu kartı hiç gösterme
  if (!interpretation) {
    return null; 
  }

  return (
    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 300 }}>
      <View style={styles.cardHeader}>
        <Ionicons name="compass-outline" size={24} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>Derinlemesine Yorum</Text>
      </View>
      <Text style={styles.cardText}>{interpretation}</Text>
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