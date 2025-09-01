// components/daily_reflection/GradientMoodImage.tsx
import React from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientMoodImageProps {
  colors: [string, string];
  moodValue: number;
}

export function GradientMoodImage({ colors, moodValue }: GradientMoodImageProps) {
  // Mood değeri 0-4 arası, bunu 0-360 dereceye çeviriyoruz
  const rotationDegree = (moodValue / 4) * 360;

  return (
    <View style={{ width: 100, height: 100, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
      {/* Arka planda renk gölgesi */}
      <View style={{
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
      }}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 100,
            height: 100,
            opacity: 0.6, // Daha belirgin görünürlük
          }}
        />
      </View>

      {/* Logo üstte, container'dan büyük */}
      <Image
        source={require('../../assets/logo.png')}
        style={{
          width: 100,
          height: 100,
          resizeMode: 'contain',
          opacity: 0.7, // Hafif saydamlık
          transform: [
            { scale: 1.5 }, // Daha dengeli büyüklük
            { rotate: `${rotationDegree}deg` } // Dinamik dönüş açısı
          ]
        }}
      />
    </View>
  );
}