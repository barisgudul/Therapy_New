// components/dream/FeedbackCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

interface FeedbackCardProps {
  isSubmitting: boolean;
  feedbackSent: boolean;
  onSubmitFeedback: (score: 1 | -1) => void;
}

export default function FeedbackCard({ isSubmitting, feedbackSent, onSubmitFeedback }: FeedbackCardProps) {
  const { t } = useTranslation();
  return (
    <MotiView
      style={styles.card}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 600 }}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="stats-chart-outline" size={24} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>{t('dream.components.feedback.title')}</Text>
      </View>

      {feedbackSent ? (
        <View style={styles.thankYouContainer}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#34D399" />
          <Text style={styles.thankYouText}>{t('dream.components.feedback.thanks')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.cardText}>{t('dream.components.feedback.question')}</Text>
          <View style={styles.buttonContainer}>
            {isSubmitting ? (
              <ActivityIndicator color={COSMIC_COLORS.accent} />
            ) : (
              <>
                <TouchableOpacity style={styles.feedbackButton} onPress={() => onSubmitFeedback(1)}>
                  <Ionicons name="thumbs-up-outline" size={24} color="#34D399" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedbackButton} onPress={() => onSubmitFeedback(-1)}>
                  <Ionicons name="thumbs-down-outline" size={24} color="#F87171" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COSMIC_COLORS.card, borderRadius: 24, padding: 24, marginTop: 8, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 20, fontWeight: '600', marginLeft: 12 },
  cardText: { color: COSMIC_COLORS.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 20 },
  feedbackButton: { padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30 },
  thankYouContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 10 },
  thankYouText: { color: COSMIC_COLORS.textSecondary, fontSize: 16 },
});


