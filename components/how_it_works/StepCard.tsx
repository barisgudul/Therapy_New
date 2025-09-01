// components/how_it_works/StepCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepCardProps {
  step: Step;
}

export const StepCard: React.FC<StepCardProps> = ({ step }) => {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step.number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>
          {step.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepDescription: {
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
});
