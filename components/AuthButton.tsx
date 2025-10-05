// components/AuthButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const DISABLED_COLORS = ["#E2E8F0", "#EDF2F7"] as const;

interface AuthButtonProps {
  text: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const AuthButton = ({ text, onPress, isLoading = false, disabled = false }: AuthButtonProps) => {
  const isDisabled = isLoading || disabled;

  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled}>
      <LinearGradient
        colors={isDisabled ? DISABLED_COLORS : GRADIENT_COLORS}
        style={styles.button}
      >
        {isLoading ? (
          <ActivityIndicator testID="activity-indicator" color={isDisabled ? '#A0AEC0' : Colors.light.tint} />
        ) : (
          <Text style={isDisabled ? styles.disabledText : styles.text}>{text}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 22,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.light.tint,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledText: {
    color: '#A0AEC0',
    fontWeight: '700',
    fontSize: 16,
  },
});
