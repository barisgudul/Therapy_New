// components/shared/ErrorFallbackUI.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ErrorFallbackUIProps {
  resetError: () => void;
}

export const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({ resetError }) => (
  <View style={styles.container}>
    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
    <Text style={styles.title}>Eyvah, Bir Şeyler Ters Gitti</Text>
    <Text style={styles.message}>
      Beklenmedik bir hata oluştu. Ekibimiz bilgilendirildi.
      Lütfen tekrar deneyin.
    </Text>
    <TouchableOpacity style={styles.button} onPress={resetError}>
      <Text style={styles.buttonText}>Tekrar Dene</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 22, fontWeight: '600', color: '#1A1F36', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 16, color: '#4A5568', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  button: { backgroundColor: Colors.light.tint, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 50 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
});


