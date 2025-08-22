// components/text_session/TypingIndicator.tsx
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  // Typing animation state
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDots = useCallback(() => {
    Animated.loop(
      Animated.stagger(150, [
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [dot1, dot2, dot3]);

  useEffect(() => {
    if (isVisible) {
      animateDots();
    }
  }, [isVisible, animateDots]);

  if (!isVisible) return null;

  return (
    <View style={[styles.bubble, styles.aiBubble, { flexDirection: "row", gap: 6 }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.bubbleText,
            {
              opacity: dot,
              transform: [
                {
                  scale: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          ●
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  aiBubble: {
    backgroundColor: "#F4F6FF",
    alignSelf: "flex-start",
  },
  bubbleText: {
    fontSize: 16,
    color: "#333",
  },
});
