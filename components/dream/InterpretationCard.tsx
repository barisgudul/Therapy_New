// components/dream/InterpretationCard.tsx (YENİ VE MARKDOWN DESTEKLİ)

import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display'; // <-- TERCÜMANI IMPORT ET
import { COSMIC_COLORS } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

interface InterpretationCardProps {
  interpretation?: string;
}

export default function InterpretationCard({ interpretation }: InterpretationCardProps) {
  const { t } = useTranslation();
  if (!interpretation) {
    return null; 
  }

  return (
    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 300 }}>
      <View style={styles.cardHeader}>
        <Ionicons name="compass-outline" size={24} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>{t('dream.components.interpretation.title')}</Text>
      </View>
      
      {/* ESKİ <Text> GİTTİ, YERİNE <Markdown> GELDİ */}
      <Markdown style={markdownStyles}>
        {interpretation}
      </Markdown>

    </MotiView>
  );
}

// Bu component'in ana stilleri
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
});

// MARKDOWN'UN KENDİ STİLLERİ
// Bu, Markdown'un içindeki etiketlerin nasıl görüneceğini belirler.
const markdownStyles = StyleSheet.create({
    // Normal paragraf metinleri için
    body: {
        color: COSMIC_COLORS.textSecondary,
        fontSize: 16,
        lineHeight: 26,
    },
    // **kalın metin** için
    strong: {
        color: COSMIC_COLORS.textPrimary, // Kalın metinler biraz daha parlak olsun
        fontWeight: 'bold',
    },
    // Gelecekte madde işaretleri veya başlıklar kullanırsak diye...
    // heading1: { ... },
    // list_item: { ... },
}); 