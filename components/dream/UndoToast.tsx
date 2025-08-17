// components/dream/UndoToast.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';

interface UndoToastProps {
  onUndo: () => void;
}

export default function UndoToast({ onUndo }: UndoToastProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rüya Silindi</Text>
        <Text style={styles.subtitle}>İşlem geri alınabilir.</Text>
      </View>
      <TouchableOpacity style={styles.undoButton} onPress={onUndo}>
        <Text style={styles.undoText}>Geri Al</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COSMIC_COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: COSMIC_COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  undoButton: {
    backgroundColor: COSMIC_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  undoText: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
}); 