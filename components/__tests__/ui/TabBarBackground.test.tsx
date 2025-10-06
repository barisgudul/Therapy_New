// components/__tests__/ui/TabBarBackground.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import BlurTabBarBackground, { useBottomTabOverflow } from '../../ui/TabBarBackground.ios';

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ tint: _tint, intensity: _intensity, style: _style }: any) => null,
}));

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 80
}));

describe('TabBarBackground', () => {
  it('BlurTabBarBackground render eder', () => {
    const { toJSON } = render(<BlurTabBarBackground />);
    expect(toJSON()).toBeNull();
  });

  it('useBottomTabOverflow hook çalışır', () => {
    const result = useBottomTabOverflow();
    expect(result).toBe(80);
  });
});
