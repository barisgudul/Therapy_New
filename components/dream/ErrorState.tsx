// components/dream/ErrorState.tsx

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COSMIC_COLORS } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  message: string;
  showBackButton?: boolean;
}

export default function ErrorState({ message, showBackButton = true }: ErrorStateProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <Text style={styles.errorText}>{message}</Text>
      {showBackButton && (
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('dream.components.errorState.back')}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF7B7B',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  backButtonText: {
    color: COSMIC_COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
}); 