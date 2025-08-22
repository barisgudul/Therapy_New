// utils/markdownRenderer.tsx
import React from "react";
import { Text, View } from "react-native";

// Markdown render fonksiyonu - Paragraf düzenlemeli
export const renderMarkdownText = (text: string, accentColor: string) => {
  if (!text) return null;

  // Metni paragraflar halinde işle
  const paragraphs = text.split("\n\n").filter((p) => p.trim());

  return (
    <View>
      {paragraphs.map((paragraph, index) => {
        const trimmedParagraph = paragraph.trim();

        // Başlıklar
        if (trimmedParagraph.startsWith("###")) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 18,
                color: "#1A202C",
                lineHeight: 24,
                fontWeight: "700",
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              {trimmedParagraph.slice(4)}
            </Text>
          );
        }

        if (trimmedParagraph.startsWith("##")) {
          return (
            <Text
              key={index}
              style={{
                fontSize: 20,
                color: "#1A202C",
                lineHeight: 26,
                fontWeight: "700",
                marginTop: 15,
                marginBottom: 8,
              }}
            >
              {trimmedParagraph.slice(3)}
            </Text>
          );
        }

        // Madde işaretleri
        if (trimmedParagraph.startsWith("- ")) {
          const lines = trimmedParagraph.split("\n");
          return (
            <View key={index} style={{ marginVertical: 4 }}>
              {lines.map((line, lineIndex) => {
                if (line.trim().startsWith("- ")) {
                  return (
                    <View
                      key={lineIndex}
                      style={{
                        flexDirection: "row",
                        marginBottom: 4,
                        paddingLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: accentColor,
                          marginRight: 6,
                          marginTop: 1,
                        }}
                      >
                        •
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          color: "#2D3748",
                          lineHeight: 22,
                          flex: 1,
                        }}
                      >
                        {line.trim().slice(2)}
                      </Text>
                    </View>
                  );
                }
                return null;
              })}
            </View>
          );
        }

        // Özel hatırlatma metni
        if (trimmedParagraph.includes("💭")) {
          return (
            <View
              key={index}
              style={{
                backgroundColor: "#F7FAFC",
                borderRadius: 8,
                padding: 10,
                marginVertical: 8,
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#4A5568",
                  lineHeight: 20,
                  fontStyle: "italic",
                }}
              >
                {trimmedParagraph}
              </Text>
            </View>
          );
        }

        // Normal paragraf - inline markdown ile
        const renderInlineFormats = (text: string) => {
          const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
          return (
            <Text
              key={index}
              style={{
                fontSize: 16,
                color: "#2D3748",
                lineHeight: 22,
                letterSpacing: -0.2,
                marginBottom: 8,
              }}
            >
              {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <Text
                      key={i}
                      style={{
                        fontWeight: "700",
                        color: "#1A202C",
                      }}
                    >
                      {part.slice(2, -2)}
                    </Text>
                  );
                }
                if (
                  part.startsWith("*") && part.endsWith("*") &&
                  !part.startsWith("**")
                ) {
                  return (
                    <Text
                      key={i}
                      style={{
                        fontStyle: "italic",
                      }}
                    >
                      {part.slice(1, -1)}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        };

        return renderInlineFormats(trimmedParagraph);
      })}
    </View>
  );
};
