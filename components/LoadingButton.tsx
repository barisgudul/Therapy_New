// components/LoadingButton.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';
import { authScreenStyles as styles } from '../styles/auth';

interface LoadingButtonProps extends PressableProps {
  isLoading: boolean;
  text: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  text,
  ...props
}) => {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: (pressed || isLoading) ? 0.7 : 1
        }
      ]}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator testID="activity-indicator" color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{text}</Text>
      )}
    </Pressable>
  );
};
