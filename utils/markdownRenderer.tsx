// utils/markdownRenderer.tsx
import React from "react";
import { Text } from "react-native";

export const renderMarkdownText = (text: string, accentColor: string) => {
  if (!text?.trim()) return <Text />;

  const paragraphs = text.trim().split(/\n\s*\n/);

  return (
    <Text style={{ fontSize: 16, color: "#2D3748", lineHeight: 26 }}>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return <Text key={paragraphIndex} />;

        if (trimmed.includes("💭")) {
          const parts = trimmed.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
          return (
            <Text
              key={paragraphIndex}
              style={{
                backgroundColor: "#F7FAFC",
                borderRadius: 12,
                padding: 15,
                marginVertical: 8,
                borderLeftWidth: 4,
                borderLeftColor: accentColor,
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
                return <Text key={index}>{part}</Text>;
              })}
            </Text>
          );
        }

        if (trimmed.startsWith("###")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 18, fontWeight: "700", color: "#1A202C", marginTop: 12, marginBottom: 6 }}>
              {trimmed.slice(4)}
            </Text>
          );
        }

        if (trimmed.startsWith("##")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 20, fontWeight: "700", color: "#1A202C", marginTop: 15, marginBottom: 8 }}>
              {trimmed.slice(3)}
            </Text>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <Text key={paragraphIndex} style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, marginVertical: 4 }}>
              • {trimmed.slice(2)}
            </Text>
          );
        }

        const parts = trimmed.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
        return (
          <Text key={paragraphIndex} style={{ fontSize: 16, color: "#2D3748", lineHeight: 26, marginVertical: 4 }}>
            {parts.map((part, index) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                return <Text key={index} style={{ fontWeight: "700", color: "#1A202C" }}>{part.slice(2, -2)}</Text>;
              }
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
                return <Text key={index} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Text>;
              }
              return <Text key={index}>{part}</Text>;
            })}
          </Text>
        );
      })}
    </Text>
  );
};
