// components/dream/Sigil.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { COSMIC_COLORS } from '../../constants/Colors';

type Props = { tapAnimation: SharedValue<number> };

export default function Sigil({ tapAnimation }: Props) {
  const size = 140;
  const center = size / 2;
  const triRadius = size * 0.32;

  // Bekleme: merkezdaire kalp atışı
  const heartBeat = useSharedValue(1);
  React.useEffect(() => {
    heartBeat.value = withRepeat(
      withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [heartBeat]);

  // Dokunma: ters yönlü dönüşler
  const upStyle = useAnimatedStyle(() => {
    const rot = interpolate(tapAnimation.value, [0, 1], [0, 20]);
    return { transform: [{ rotate: `${rot}deg` }] };
  });
  const downStyle = useAnimatedStyle(() => {
    const rot = interpolate(tapAnimation.value, [0, 1], [0, -20]);
    return { transform: [{ rotate: `${rot}deg` }] };
  });
  const centerStyle = useAnimatedStyle(() => {
    const flash = interpolate(tapAnimation.value, [0, 1], [0.3, 1]);
    return { transform: [{ scale: heartBeat.value }], opacity: flash };
  });

  // Üçgen noktaları
  const upA = { x: center, y: center - triRadius };
  const upB = { x: center - triRadius * 0.9, y: center + triRadius * 0.8 };
  const upC = { x: center + triRadius * 0.9, y: center + triRadius * 0.8 };
  const downA = { x: center, y: center + triRadius };
  const downB = { x: center - triRadius * 0.9, y: center - triRadius * 0.8 };
  const downC = { x: center + triRadius * 0.9, y: center - triRadius * 0.8 };

  return (
    <View style={styles.container}>
      {/* Yukarı bakan üçgen */}
      <Animated.View style={[styles.layer, upStyle]}>
        <Svg width={size} height={size}>
          <Path
            d={`M ${upA.x} ${upA.y} L ${upB.x} ${upB.y} L ${upC.x} ${upC.y} Z`}
            stroke={COSMIC_COLORS.accent}
            strokeWidth={1.4}
            fill="rgba(255,255,255,0.04)"
          />
        </Svg>
      </Animated.View>

      {/* Aşağı bakan üçgen */}
      <Animated.View style={[styles.layer, downStyle]}>
        <Svg width={size} height={size}>
          <Path
            d={`M ${downA.x} ${downA.y} L ${downB.x} ${downB.y} L ${downC.x} ${downC.y} Z`}
            stroke={COSMIC_COLORS.accent}
            strokeWidth={1.4}
            fill="rgba(255,255,255,0.04)"
          />
        </Svg>
      </Animated.View>

      {/* Merkez: nefes + dokunma flaşı */}
      <Animated.View style={[styles.centerHeartContainer, centerStyle]}>
        <View style={styles.centerHeart} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  centerHeartContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHeart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COSMIC_COLORS.accent,
  },
});


