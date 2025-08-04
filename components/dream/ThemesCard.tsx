// components/dream/ThemesCard.tsx

import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';

// Bu component'in dışarıdan hangi veriyi alacağını tanımla
interface ThemesCardProps {
  themes?: string[]; // Soru işareti, bu prop'un undefined olabileceğini belirtir
}

export default function ThemesCard({ themes }: ThemesCardProps) {
  // Eğer temalar yoksa, bu kartı hiç gösterme
  if (!themes || themes.length === 0) {
    return null; 
  }

  return (
    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
      <View style={styles.cardHeader}>
        <Ionicons name="key-outline" size={22} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>Ana Temalar</Text>
      </View>
      <View style={styles.tagsContainer}>
        {themes.map((tag: string) => (
          <MotiView key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </MotiView>
        ))}
      </View>
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: 'rgba(93,161,217,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tagText: {
    color: COSMIC_COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
}); 