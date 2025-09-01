// components/daily_reflection/GradientMoodImage.tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image } from 'react-native'; // Hepsini tek satırda birleştir


export function GradientMoodImage({ colors }: { colors: [string, string] }) {
  return (
    <MaskedView
      style={{ width: 100, height: 100, marginBottom: 16 }}
      maskElement={
        <Image
          source={require('../../assets/therapy.png')}
          style={{ width: 100, height: 100, resizeMode: 'contain', backgroundColor: 'transparent' }}
        />
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 100, height: 100 }}
      />
    </MaskedView>
  );
}