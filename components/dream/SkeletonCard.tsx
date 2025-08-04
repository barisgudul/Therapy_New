// components/dream/SkeletonCard.tsx

import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';

interface SkeletonCardProps {
  delay?: number;
}

export default function SkeletonCard({ delay = 0 }: SkeletonCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: delay * 100, type: 'timing' }}
      style={styles.card}
    >
      <View style={styles.content}>
        {/* Başlık skeleton */}
        <View style={styles.titleSkeleton} />
        
        {/* Tarih skeleton */}
        <View style={styles.dateSkeleton} />
      </View>
      
      {/* Silme ikonu skeleton */}
      <View style={styles.deleteIconSkeleton} />
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  dateSkeleton: {
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    width: '40%',
  },
  deleteIconSkeleton: {
    width: 22,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 11,
  },
}); 