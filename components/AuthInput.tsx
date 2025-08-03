// components/AuthInput.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
// Bu import yolu yanlışsa düzelt.
import { authScreenStyles as styles } from '../styles/auth';

interface AuthInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
}

export const AuthInput = ({ iconName, ...props }: AuthInputProps) => {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={iconName} size={22} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholderTextColor="#8e8e93"
        {...props}
      />
    </View>
  );
};