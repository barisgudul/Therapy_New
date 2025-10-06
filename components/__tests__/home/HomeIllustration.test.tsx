// components/__tests__/home/HomeIllustration.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HomeIllustration } from '../../home/HomeIllustration';

describe('HomeIllustration', () => {
  it('başlık ve alt başlığı gösterir', () => {
    render(<HomeIllustration />);
    expect(screen.getByText('home.illustration.title')).toBeTruthy();
    expect(screen.getByText('home.illustration.subtitle')).toBeTruthy();
  });

  it('resmi gösterir', () => {
    const { toJSON } = render(<HomeIllustration />);
    expect(toJSON()).toBeTruthy();
  });
});
