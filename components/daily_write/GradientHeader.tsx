// app/components/daily_write/GradientHeader.tsx


import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';


// Bu komponentin kendi stillerini de buraya taşıyabilirsin, ama şimdilik dışarıdan alalım.
// Daha iyi bir pratik, sadece ilgili stilleri buraya koymaktır.
const styles = StyleSheet.create({
    header: {
        paddingTop: 50,
        textAlign: 'center',
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(60, 120, 200, 0.10)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
        marginBottom: 8,
    },
});

export function GradientHeader({ text, colors }: { text: string; colors: [string, string] }) {
  return (
    <MaskedView maskElement={<Text style={[styles.header, { color: '#fff' }]}>{text}</Text>}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.header, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}