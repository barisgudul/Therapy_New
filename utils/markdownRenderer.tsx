// utils/markdownRenderer.tsx
import React from "react";
import { Text, View } from "react-native";

// Markdown render fonksiyonu - Paragraf düzenlemeli
export const renderMarkdownText = (text: string, accentColor: string) => {
  if (!text) return null;
  const paragraphs = text.trim().split(/\n\s*\n/);
  return (
    <View>
      {paragraphs.map((paragraph, paragraphIndex) => {
        if (!paragraph.trim()) return null;
        if (paragraph.includes("💭")) {
          const parts = paragraph.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
          return (
            <View
              key={paragraphIndex}
              style={{
                backgroundColor: "#F7FAFC",
                borderRadius: 12,
                padding: 15,
                marginVertical: 8,
                borderLeftWidth: 4,
                borderLeftColor: accentColor,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#4A5568",
                  lineHeight: 22,
                  fontStyle: "italic",
                }}
              >
                {parts.map((part, index) => {
                  if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                    return (
                      <Text key={index} style={{ fontWeight: "700", color: "#2D3748", fontStyle: "normal" }}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
                    return (
                      <Text key={index} style={{ fontStyle: "italic" }}>
                        {part.slice(1, -1)}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
          );
        }
        if (paragraph.startsWith("###")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 18, color: "#1A202C", lineHeight: 28, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>
              {paragraph.slice(4)}
            </Text>
          );
        }
        if (paragraph.startsWith("##")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 20, color: "#1A202C", lineHeight: 30, fontWeight: "700", marginTop: 15, marginBottom: 8 }}>
              {paragraph.slice(3)}
            </Text>
          );
        }
        if (paragraph.startsWith("- ")) {
          return (
            <View key={paragraphIndex} style={{ flexDirection: "row", marginVertical: 4, paddingLeft: 10 }}>
              <Text style={{ fontSize: 16, color: accentColor, marginRight: 8, marginTop: 2 }}>•</Text>
              <Text style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, flex: 1 }}>{paragraph.slice(2)}</Text>
            </View>
          );
        }
        const parts = paragraph.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
        return (
          <Text key={paragraphIndex} style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, letterSpacing: -0.3, marginVertical: 4 }}>
            {parts.map((part, index) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                return (
                  <Text key={index} style={{ fontWeight: "700", color: "#1A202C" }}>{part.slice(2, -2)}</Text>
                );
              }
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
                return (
                  <Text key={index} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Text>
                );
              }
              return part;
            })}
          </Text>
        );
      })}
    </View>
  );
};
