// components/text_session/MessageBubble.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { renderMarkdownText } from "../../utils/markdownRenderer";
import { MemoryBubble } from "./MemoryBubble";

interface MessageBubbleProps {
  message: {
    sender: "user" | "ai";
    text: string;
    memory?: { content: string; source_layer: string };
    isInsight?: boolean; // YENİ: İçgörü mesajı mı?
  };
  accentColor?: string;
  onMemoryPress?: (memory: { content: string; source_layer: string }) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  accentColor = "#5DA1D9",
  onMemoryPress
}) => {
  const isAI = message.sender === "ai";

  return (
    <View style={styles.messageContainer}>
      {/* YENİ: AI mesajları için hafıza baloncuğu */}
      {isAI && message.memory && (
        <MemoryBubble
          content={message.memory.content}
          sourceLayer={message.memory.source_layer}
          onPress={() => {
            onMemoryPress?.(message.memory!);
          }}
        />
      )}
      
      <View
        style={[
          styles.bubble,
          isAI ? styles.aiBubble : styles.userBubble,
          // YENİ: İçgörü mesajları için özel stil
          message.isInsight && styles.insightBubble
        ]}
      >
        {isAI ? (
          renderMarkdownText(message.text, accentColor)
        ) : (
          <Text style={styles.bubbleText}>{message.text}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 10,
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 15,
  },
  userBubble: {
    backgroundColor: "#E0E0E0",
    alignSelf: "flex-end",
  },
  aiBubble: {
    backgroundColor: "#F4F6FF",
    alignSelf: "flex-start",
  },
  // YENİ: İçgörü mesajları için özel stil
  insightBubble: {
    backgroundColor: "#F8F5FF", // Mor tonunda arka plan
    borderWidth: 2,
    borderColor: "#8B5CF6", // Mor kenarlık
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleText: {
    fontSize: 16,
    color: "#333",
  },
});
