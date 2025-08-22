// components/text_session/MemoryBubble.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MemoryBubbleProps {
  content: string;
  sourceLayer: string;
  onPress?: () => void;
}

export const MemoryBubble: React.FC<MemoryBubbleProps> = ({ 
  content, 
  sourceLayer, 
  onPress 
}) => {
      // YENİ: Sadece ilk anlamlı satırı al ve kısalt
    const firstLine = content.split('\n')[0]; // Metni satırlara böl ve sadece ilkini al
    const truncatedContent = firstLine.length > 80 
      ? firstLine.substring(0, 80) + '...' 
      : firstLine;

  // Source layer'a göre ikon seç
  const getSourceIcon = (layer: string) => {
    switch (layer) {
      case 'content':
        return 'document-text-outline';
      case 'sentiment':
        return 'heart-outline';
      case 'stylometry':
        return 'analytics-outline';
      default:
        return 'bulb-outline';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getSourceIcon(sourceLayer) as any} 
          size={16} 
          color="#5DA1D9" 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.label}>🧠 Hatırlanan Anı</Text>
        <Text style={styles.content} numberOfLines={3}>
          {truncatedContent}
        </Text>
      </View>
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 161, 217, 0.05)', // YENİ: Daha soluk arka plan
    borderWidth: 1,
    borderColor: 'rgba(93, 161, 217, 0.15)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(93, 161, 217, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11, // YENİ: Daha küçük font
    fontWeight: '600',
    color: '#81A6C2', // YENİ: Daha soluk mavi
    marginBottom: 4,
  },
  content: {
    fontSize: 14, // YENİ: Daha büyük font
    color: '#334155', // YENİ: Daha okunaklı gri
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});
