// components/text_session/MemoryModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MemoryModalProps {
  isVisible: boolean;
  memory: { content: string; source_layer: string } | null;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ 
  isVisible, 
  memory, 
  onClose 
}) => {
  if (!memory) return null;
  

  // Source layer'a göre ikon ve başlık seç
  const getSourceInfo = (layer: string) => {
    switch (layer) {
      case 'content':
        return { icon: 'document-text-outline', title: 'Metin Anısı' };
      case 'sentiment':
        return { icon: 'heart-outline', title: 'Duygu Anısı' };
      case 'stylometry':
        return { icon: 'analytics-outline', title: 'Analiz Anısı' };
      default:
        return { icon: 'bulb-outline', title: 'Genel Anı' };
    }
  };

  const sourceInfo = getSourceInfo(memory.source_layer);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons 
                name={sourceInfo.icon as any} 
                size={24} 
                color="#5DA1D9" 
              />
              <Text style={styles.title}>{sourceInfo.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.memoryContainer}>
              <Text style={styles.memoryLabel}>🧠 AI&apos;ın Hatırladığı Anı</Text>
              <Text style={styles.memoryContent}>{memory.content}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Bu anı, AI&apos;ın size daha kişisel ve anlamlı bir cevap verebilmesi için kullanıldı.</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  memoryContainer: {
    marginBottom: 20,
  },
  memoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5DA1D9',
    marginBottom: 12,
  },
  memoryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    textAlign: 'justify',
  },
  infoContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5DA1D9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
