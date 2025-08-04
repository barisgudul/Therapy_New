// components/dream/DialogueCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';

// Diyalog mesaj tipi
interface DialogueMessage {
  text: string;
  role: 'user' | 'model';
}

// Component'in dışarıdan alacağı verileri (props) tanımlıyoruz
interface DialogueCardProps {
  dialogue: DialogueMessage[];
  userInput: string;
  isReplying: boolean;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  maxInteractions: number;
}

export default function DialogueCard({
  dialogue,
  userInput,
  isReplying,
  onInputChange,
  onSendMessage,
  maxInteractions,
}: DialogueCardProps) {
  
  const renderInputOrCompleted = () => {
    const isChatCompleted = dialogue.filter(m => m.role === 'user').length >= maxInteractions;

    if (isChatCompleted) {
      return (
        <View style={styles.completedContainer}>
          <Text style={styles.completedText}>Bu rüya üzerine diyalog tamamlandı.</Text>
        </View>
      );
    }

    return (
      <View style={styles.inputRow}>
        <TextInput
          style={styles.dialogueInput}
          placeholder="Cevabını yaz..."
          placeholderTextColor={COSMIC_COLORS.textSecondary}
          value={userInput}
          onChangeText={onInputChange}
          editable={!isReplying}
        />
        <TouchableOpacity onPress={onSendMessage} disabled={isReplying || !userInput.trim()}>
          <Ionicons name="arrow-up-circle" size={44} color={isReplying || !userInput.trim() ? '#666' : COSMIC_COLORS.accent} />
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <MotiView style={styles.card} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 400 }}>
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubbles-outline" size={24} color={COSMIC_COLORS.accent} />
        <Text style={styles.cardTitle}>Rüya Diyaloğu</Text>
      </View>
      <View style={styles.dialogueContainer}>
        {dialogue.length === 0 ? (
          <View style={styles.emptyDialogueContainer}>
            <Text style={styles.emptyDialogueText}>Rüyanızla ilgili diyaloğa başlamak için aşağıdaki soruyu yanıtlayın.</Text>
          </View>
        ) : (
          dialogue.map((msg, i) => (
            <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={styles.bubbleText}>{msg.text}</Text>
            </View>
          ))
        )}
        {isReplying && <ActivityIndicator color={COSMIC_COLORS.accent} style={{ alignSelf: 'flex-start', marginTop: 12 }} />}
      </View>

      {renderInputOrCompleted()}
    </MotiView>
  );
}

// Stilleri buraya yapıştırıyoruz
const styles = StyleSheet.create({
  card: { 
    backgroundColor: COSMIC_COLORS.card, 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: COSMIC_COLORS.cardBorder 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  cardTitle: { 
    color: COSMIC_COLORS.textPrimary, 
    fontSize: 20, 
    fontWeight: '600', 
    marginLeft: 12 
  },
  dialogueContainer: { 
    marginTop: 10, 
    gap: 12 
  },
  bubble: { 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 22, 
    maxWidth: '85%' 
  },
  userBubble: { 
    backgroundColor: COSMIC_COLORS.accent, 
    alignSelf: 'flex-end', 
    borderBottomRightRadius: 6 
  },
  aiBubble: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignSelf: 'flex-start', 
    borderBottomLeftRadius: 6 
  },
  bubbleText: { 
    color: COSMIC_COLORS.textPrimary, 
    fontSize: 16, 
    lineHeight: 23 
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    borderTopWidth: 1, 
    borderTopColor: COSMIC_COLORS.cardBorder, 
    paddingTop: 16 
  },
  dialogueInput: { 
    flex: 1, 
    height: 44, 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 22, 
    paddingHorizontal: 18, 
    color: COSMIC_COLORS.textPrimary, 
    marginRight: 10, 
    fontSize: 16 
  },
  emptyDialogueContainer: { 
    alignItems: 'center', 
    paddingVertical: 20 
  },
  emptyDialogueText: { 
    color: COSMIC_COLORS.textSecondary, 
    fontSize: 16, 
    textAlign: 'center', 
    fontStyle: 'italic' 
  },
  completedContainer: { 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderTopWidth: 1, 
    borderTopColor: COSMIC_COLORS.cardBorder, 
    marginTop: 16 
  },
  completedText: { 
    color: COSMIC_COLORS.textSecondary, 
    fontSize: 14, 
    textAlign: 'center', 
    fontStyle: 'italic' 
  },
});
