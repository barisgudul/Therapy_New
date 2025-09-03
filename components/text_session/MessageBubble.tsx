// components/text_session/MessageBubble.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { renderMarkdownText } from "../../utils/markdownRenderer";

interface MessageBubbleProps {
  message: {
    sender: "user" | "ai";
    text: string;
    memory?: { content: string; source_layer: string };
    isInsight?: boolean; // YENİ: İçgörü mesajı mı?
  };
  accentColor?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  accentColor = "#5DA1D9"
}) => {
  const isAI = message.sender === "ai";

  return (
    <View style={styles.messageContainer}>
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
          <Text style={[styles.bubbleText, styles.userBubbleText]}>{message.text}</Text>
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
    backgroundColor: "#5DA1D9", // Marka ana rengi
    alignSelf: "flex-end",
    shadowColor: "#5DA1D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(93, 161, 217, 0.2)",
  },
  aiBubble: {
    backgroundColor: "#F4F6FF",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(93, 161, 217, 0.15)",
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
  userBubbleText: {
    color: "#FFFFFF", // Kullanıcı mesajları için beyaz yazı
    fontWeight: "500",
  },
});
