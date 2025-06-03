import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { commonStyles } from '../constants/Styles';

export default function HowItWorksScreen() {
  const router = useRouter();

  const steps = [
    {
      id: 1,
      title: 'Terapistini Seç',
      description: 'Seninle en iyi iletişimi kuracak AI terapisti seç.',
      icon: 'person-outline',
    },
    {
      id: 2,
      title: 'Terapi Türünü Belirle',
      description: 'Metin, ses veya görüntülü terapi seçeneklerinden birini seç.',
      icon: 'chatbubble-ellipses-outline',
    },
    {
      id: 3,
      title: 'Seanslara Başla',
      description: 'Terapistinle düzenli seanslar yaparak kendini keşfet.',
      icon: 'heart-outline',
    },
  ];

  return (
    <LinearGradient colors={['#F9FAFB', '#ECEFF4']} style={commonStyles.flex}>
      <View style={commonStyles.container}>
        <View style={commonStyles.contentContainer}>
          <Text style={commonStyles.brand}>therapy<Text style={commonStyles.brandDot}>.</Text></Text>
          <Text style={commonStyles.title}>Nasıl Çalışır?</Text>
          <Text style={commonStyles.subtitle}>Terapi yolculuğuna başlamak için adımları takip et.</Text>

          <View style={styles.stepsContainer}>
            {steps.map((step) => (
              <View key={step.id} style={commonStyles.card}>
                <View style={styles.stepContent}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.numberText}>{step.id}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                  <Ionicons name={step.icon as any} size={24} color={Colors.light.tint} />
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={commonStyles.buttonUnified} onPress={() => router.push('/')}>
            <Text style={commonStyles.buttonSecondaryText}>Başla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  stepsContainer: {
    marginTop: 20,
    gap: 16,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1c1e',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6c7580',
  },
});