// components/AuthLayout.tsx
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, Image } from 'react-native'; // Image'ı import et
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
          {/*
            DIŞ HEADER'I TAMAMEN KALDIRDIK.
            ARTIK TEK BİR ODAK NOKTAMIZ VAR: KART.
          */}

          <View style={styles.formCard}>
            {/* İŞTE KİMLİĞİMİZ! LOGO ARTIK AİT OLDUĞU YERDE. */}
            <Image source={require("../assets/logo.png")} style={styles.logo} />

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>

          <View style={styles.footer}>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};