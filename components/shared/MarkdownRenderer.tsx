// components/shared/MarkdownRenderer.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";

interface MarkdownRendererProps {
  content: string;
  accentColor: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  accentColor,
}) => {
  if (!content) return null;

  // Paragrafları ayır
  const paragraphs = content.trim().split(/\n\s*\n/);

  return (
    <View>
      {paragraphs.map((paragraph, paragraphIndex) => {
        if (!paragraph.trim()) return null;

        // Özel formatları kontrol et
        if (paragraph.includes("💭")) {
          // Özel kutu içindeki text'i de markdown ile işle
          const renderSpecialText = (text: string) => {
            const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);

            return (
              <Text style={styles.specialText}>
                {parts.map((part, index) => {
                  // Bold format **text**
                  if (
                    part.startsWith("**") &&
                    part.endsWith("**") &&
                    part.length > 4
                  ) {
                    return (
                      <Text key={index} style={styles.boldText}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }

                  // Italic format *text*
                  if (
                    part.startsWith("*") &&
                    part.endsWith("*") &&
                    part.length > 2 &&
                    !part.startsWith("**")
                  ) {
                    return (
                      <Text key={index} style={styles.italicText}>
                        {part.slice(1, -1)}
                      </Text>
                    );
                  }

                  return part;
                })}
              </Text>
            );
          };

          return (
            <View
              key={paragraphIndex}
              style={[styles.specialTextBox, { borderLeftColor: accentColor }]}
            >
              {renderSpecialText(paragraph)}
            </View>
          );
        }

        // Header kontrolü
        if (paragraph.startsWith("###")) {
          return (
            <Text key={paragraphIndex} style={styles.h3}>
              {paragraph.slice(4)}
            </Text>
          );
        }

        if (paragraph.startsWith("##")) {
          return (
            <Text key={paragraphIndex} style={styles.h2}>
              {paragraph.slice(3)}
            </Text>
          );
        }

        // Bullet point kontrolü
        if (paragraph.startsWith("- ")) {
          return (
            <View key={paragraphIndex} style={styles.bulletPointContainer}>
              <Text style={[styles.bullet, { color: accentColor }]}>
                •
              </Text>
              <Text style={styles.bulletText}>
                {paragraph.slice(2)}
              </Text>
            </View>
          );
        }

        // Normal paragraf - inline formatları işle
        const renderInlineFormats = (text: string) => {
          // Daha güçlü regex - ** formatını önce yakala
          const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);

          return (
            <Text style={styles.paragraph}>
              {parts.map((part, index) => {
                // Bold format **text**
                if (
                  part.startsWith("**") &&
                  part.endsWith("**") &&
                  part.length > 4
                ) {
                  return (
                    <Text key={index} style={styles.boldText}>
                      {part.slice(2, -2)}
                    </Text>
                  );
                }

                // Italic format *text*
                if (
                  part.startsWith("*") &&
                  part.endsWith("*") &&
                  part.length > 2 &&
                  !part.startsWith("**")
                ) {
                  return (
                    <Text key={index} style={styles.italicText}>
                      {part.slice(1, -1)}
                    </Text>
                  );
                }

                return part;
              })}
            </Text>
          );
        };

        return renderInlineFormats(paragraph);
      })}
    </View>
  );
};

// MERKEZİ STİLLER - PERFORMANS İÇİN StyleSheet.create KULLANILIYOR
const styles = StyleSheet.create({
  specialTextBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    borderLeftWidth: 4,
    // borderLeftColor dinamik olduğu için inline'da kalacak
  },
  specialText: {
    fontSize: 14,
    color: Colors.light.softText,
    lineHeight: 22,
    fontStyle: "italic",
  },
  boldText: {
    fontWeight: "700",
    color: Colors.light.text,
    fontStyle: "normal",
  },
  italicText: {
    fontStyle: "italic",
  },
  h3: {
    fontSize: 18,
    color: Colors.light.text,
    lineHeight: 28,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  h2: {
    fontSize: 20,
    color: Colors.light.text,
    lineHeight: 30,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 8,
  },
  bulletPointContainer: {
    flexDirection: "row",
    marginVertical: 4,
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 16,
    // color dinamik olduğu için inline'da kalacak
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 26,
    flex: 1,
  },
  paragraph: {
    fontSize: 16,
    color: Colors.light.text,
    lineHeight: 26,
    letterSpacing: -0.3,
    marginVertical: 4,
  },
});
