// components/ai_summary/ReportCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/Colors';

// AnalysisReport tipini basitleştirilmiş haliyle buraya kopyalıyoruz
interface AnalysisReport {
  id: string;
  created_at: string;
  content: {
    reportSections: {
      mainTitle: string;
      overview: string;
    };
    reportAnalogy: {
      title: string;
      text: string;
    };
  };
  days_analyzed: number;
}

interface ReportCardProps {
  item: AnalysisReport;
  onPress: () => void;
  onDelete: () => void;
}

const createPreviewText = (content?: AnalysisReport['content']): string => {
  // Optional chaining (?.) ile güvenli erişim
  const analogyText = content?.reportAnalogy?.text;
  if (analogyText) return analogyText;
  const overview = content?.reportSections?.overview;
  return overview ? overview.replace(/\*\*/g, '').trim() : '';
};

export default function ReportCard({ item, onPress, onDelete }: ReportCardProps) {
  const { t, i18n } = useTranslation();
  const mainTitle = item.content?.reportSections?.mainTitle || t('ai_summary.header_title');

  return (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{mainTitle}</Text>
            <Text style={styles.subtitle}>
              {new Date(item.created_at).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : 'en-US', { month: 'long', day: 'numeric' })}
              {' • '}
              {t('ai_summary.card_subtitle', { days: item.days_analyzed })}
            </Text>
          </View>
        </View>

        <Text style={styles.previewText} numberOfLines={3}>
          {createPreviewText(item.content) || t('ai_summary.no_overview')}
        </Text>

        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#E53E3E" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  previewText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
});
