// components/dream/ResultSkeleton.tsx

import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { COSMIC_COLORS } from '../../constants/Colors';

export default function ResultSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} style={styles.headerSkeleton}>
        <View style={styles.dateSkeleton} />
        <View style={styles.titleSkeleton} />
      </MotiView>
      
      {/* Summary card skeleton */}
      <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 100 }}>
        <View style={styles.cardHeader}>
          <View style={styles.iconSkeleton} />
          <View style={styles.cardTitleSkeleton} />
        </View>
        <View style={styles.cardTextSkeleton} />
        <View style={styles.cardTextSkeleton} />
        <View style={[styles.cardTextSkeleton, { width: '60%' }]} />
      </MotiView>
      
      {/* Themes card skeleton */}
      <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 200 }}>
        <View style={styles.cardHeader}>
          <View style={styles.iconSkeleton} />
          <View style={styles.cardTitleSkeleton} />
        </View>
        <View style={styles.tagsContainer}>
          <View style={styles.tagSkeleton} />
          <View style={styles.tagSkeleton} />
          <View style={styles.tagSkeleton} />
        </View>
      </MotiView>
      
      {/* Interpretation card skeleton */}
      <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 300 }}>
        <View style={styles.cardHeader}>
          <View style={styles.iconSkeleton} />
          <View style={styles.cardTitleSkeleton} />
        </View>
        <View style={styles.cardTextSkeleton} />
        <View style={styles.cardTextSkeleton} />
        <View style={styles.cardTextSkeleton} />
        <View style={[styles.cardTextSkeleton, { width: '70%' }]} />
      </MotiView>
      
      {/* Dialogue card skeleton */}
      <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 400 }}>
        <View style={styles.cardHeader}>
          <View style={styles.iconSkeleton} />
          <View style={styles.cardTitleSkeleton} />
        </View>
        <View style={styles.dialogueSkeleton}>
          <View style={styles.bubbleSkeleton} />
          <View style={[styles.bubbleSkeleton, styles.aiBubbleSkeleton]} />
        </View>
        <View style={styles.inputSkeleton} />
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  headerSkeleton: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateSkeleton: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    width: '40%',
    marginBottom: 4,
  },
  titleSkeleton: {
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    width: '80%',
  },
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
  iconSkeleton: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  cardTitleSkeleton: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    width: '60%',
    marginLeft: 12,
  },
  cardTextSkeleton: {
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    width: '100%',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagSkeleton: {
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    width: 80,
  },
  dialogueSkeleton: {
    marginTop: 10,
    gap: 12,
  },
  bubbleSkeleton: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    width: '60%',
    alignSelf: 'flex-end',
  },
  aiBubbleSkeleton: {
    alignSelf: 'flex-start',
    width: '70%',
  },
  inputSkeleton: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COSMIC_COLORS.cardBorder,
    paddingTop: 16,
  },
}); 