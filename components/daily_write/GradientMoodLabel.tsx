// components/daily_write/GradientMoodLabel.tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
    moodLabel: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, minHeight: 32 },
});

export function GradientMoodLabel({ text, colors }: { text: string; colors: [string, string] }) {
  return (
    <MaskedView maskElement={<Text style={[styles.moodLabel, { color: '#fff' }]}>{text}</Text>}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.moodLabel, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}