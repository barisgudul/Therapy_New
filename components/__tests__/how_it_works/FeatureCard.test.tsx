// components/__tests__/how_it_works/FeatureCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeatureCard } from '../../how_it_works/FeatureCard';

describe('FeatureCard', () => {
  const mockFeature = {
    id: '1',
    title: 'Test Özellik',
    description: 'Bu bir test özellik açıklamasıdır',
    icon: 'heart' as const,
    color: ['#FF6B6B', '#4ECDC4'] as const
  };

  it('özellik başlığını, açıklamasını ve ikonunu gösterir', () => {
    render(<FeatureCard feature={mockFeature} />);
    
    expect(screen.getByText('Test Özellik')).toBeTruthy();
    expect(screen.getByText('Bu bir test özellik açıklamasıdır')).toBeTruthy();
  });

  it('farklı özellik verileriyle çalışır', () => {
    const differentFeature = {
      id: '2',
      title: 'Farklı Özellik',
      description: 'Farklı açıklama',
      icon: 'star' as const,
      color: ['#A8E6CF', '#FFD93D'] as const
    };
    
    render(<FeatureCard feature={differentFeature} />);
    
    expect(screen.getByText('Farklı Özellik')).toBeTruthy();
    expect(screen.getByText('Farklı açıklama')).toBeTruthy();
  });
});
