// components/AuthLayout.tsx
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { authScreenStyles as styles } from '../styles/auth';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => {
  return (
    <View style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* SAHNE DIŞI: Marka */}
          <View style={styles.headerContainer}>
            <Text style={styles.brand}>
              lumen<Text style={styles.dot}>.</Text>
            </Text>
          </View>

          {/* SAHNE: Ana kartımız. Başlık, alt başlık ve form elemanları (children) artık bunun içinde. */}
          <View style={styles.formCard}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>

          {/* SAHNE DIŞI: Footer linki */}
          <View style={styles.footer}>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};